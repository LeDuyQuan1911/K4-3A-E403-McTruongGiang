import { AppError } from './core.js';

// Credentials belong to each provider. Changing AI_PROVIDER never forwards a
// different provider's key to the new endpoint. Preset endpoints are fixed.
export const PROVIDERS = Object.freeze({
  deepseek: { label:'DeepSeek', prefix:'DEEPSEEK', baseURL:'https://api.deepseek.com', model:'deepseek-flash', protocol:'chat', jsonMode:'json_object' },
  openai: { label:'OpenAI', prefix:'OPENAI', baseURL:'https://api.openai.com/v1', model:'gpt-4.1-mini', protocol:'responses', jsonMode:'json_schema' },
  gemini: { label:'Gemini', prefix:'GEMINI', baseURL:'https://generativelanguage.googleapis.com/v1beta/openai', model:'gemini-3.8-flash', protocol:'chat', jsonMode:'json_schema' },
  compatible: { label:'API tương thích OpenAI', prefix:'COMPATIBLE', baseURL:'', model:'', protocol:'chat', jsonMode:'json_object' }
});

export function resolveProvider(provider, env = process.env) {
  const preset = PROVIDERS[provider];
  if (!preset) throw new AppError('AI_PROVIDER cần là deepseek, openai, gemini hoặc compatible.', 503);
  const value = name => String(env[`${preset.prefix}_${name}`] || '').trim();
  const config = { ...preset, provider, key:value('API_KEY'), keyName:`${preset.prefix}_API_KEY`, model:value('MODEL') || preset.model };
  if (provider === 'compatible') {
    config.baseURL = value('BASE_URL').replace(/\/+$/, '');
    config.jsonMode = value('JSON_MODE') || 'json_object';
    if (!['json_object','json_schema','text'].includes(config.jsonMode)) throw new AppError('COMPATIBLE_JSON_MODE cần là json_object, json_schema hoặc text.', 503);
    if (config.baseURL) {
      let url; try { url = new URL(config.baseURL); } catch { throw new AppError('COMPATIBLE_BASE_URL không hợp lệ.', 503); }
      if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new AppError('COMPATIBLE_BASE_URL phải là HTTPS, không chứa khóa, query hoặc fragment.', 503);
    }
  }
  return config;
}

export function resolveConfig(env = process.env) {
  // Preserve existing OpenAI-only installs; new configurations default to DeepSeek.
  const provider = String(env.AI_PROVIDER || (env.OPENAI_API_KEY && !env.DEEPSEEK_API_KEY ? 'openai' : 'deepseek')).trim().toLowerCase();
  const writer = resolveProvider(provider, env);
  const searchProvider = String(env.SEARCH_PROVIDER || (provider === 'openai' ? 'openai' : 'exa')).trim().toLowerCase();
  if (!['exa','tavily','openai','manual'].includes(searchProvider)) throw new AppError('SEARCH_PROVIDER cần là exa, tavily, openai hoặc manual.', 503);
  const searchKeyName={exa:'EXA_API_KEY',tavily:'TAVILY_API_KEY'}[searchProvider] || '';
  const search = { provider:searchProvider, label:{exa:'Exa',tavily:'Tavily',openai:'OpenAI Web Search',manual:'Thêm URL thủ công'}[searchProvider],
    keyName:searchKeyName, key:searchKeyName?String(env[searchKeyName] || '').trim():'', openai:resolveProvider('openai', env) };
  search.openai.model = String(env.OPENAI_SEARCH_MODEL || search.openai.model).trim();
  return { writer, search };
}

// Never expose raw error bodies (some gateways echo credentials or prompts).
export async function requestJSON(fetcher, url, key, body, label, trace = () => {}, event = 'ai', timeout = 90000, auth = 'bearer') {
  const started = Date.now();
  let response;
  try {
    const credential=auth==='x-api-key'?{'x-api-key':key}:{Authorization:`Bearer ${key}`};
    response = await fetcher(url, { method:'POST', redirect:'error', signal:AbortSignal.timeout(timeout),
      headers:{'Content-Type':'application/json',...credential}, body:JSON.stringify(body) });
  } catch {
    trace({event:`${event}.error`,provider:label,elapsedMs:Date.now()-started,reason:'network-or-timeout'});
    throw new AppError(`Không kết nối được ${label} hoặc quá thời gian. Hãy thử lại.`, 502);
  }
  if (!response.ok) {
    trace({event:`${event}.error`,provider:label,httpStatus:response.status,elapsedMs:Date.now()-started});
    const reason = {400:'Yêu cầu/model hoặc chế độ JSON không được hỗ trợ.',401:'API key không hợp lệ.',402:'Tài khoản chưa đủ số dư.',403:'Tài khoản chưa có quyền dùng chức năng này.',429:'Hết hạn mức hoặc đang giới hạn tốc độ.'}[response.status] || `HTTP ${response.status}.`;
    throw new AppError(`${label}: ${reason}`, 502);
  }
  let data;
  try { data = await response.json(); } catch { throw new AppError(`${label} không trả JSON hợp lệ.`, 502); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new AppError(`${label} trả cấu trúc không hợp lệ.`, 502);
  return { data, elapsedMs:Date.now()-started };
}

export class ModelClient {
  constructor(config, fetcher = fetch) { this.config = config; this.fetcher = fetcher; }
  get enabled() { return Boolean(this.config.key && this.config.model && this.config.baseURL); }
  assertReady() {
    const c = this.config;
    if (!c.key) throw new AppError(`Chưa cấu hình ${c.keyName} ở máy chủ.`, 503);
    if (!c.model || !c.baseURL) throw new AppError('Cần cấu hình COMPATIBLE_MODEL và COMPATIBLE_BASE_URL.', 503);
  }
  async responses(body, trace = () => {}) {
    this.assertReady();
    const c = this.config;
    const {data,elapsedMs} = await requestJSON(this.fetcher, `${c.baseURL}/responses`, c.key,
      {model:c.model,store:false,max_output_tokens:5000,...body}, c.label, trace);
    trace({event:'ai.completed',provider:c.provider,responseId:data.id,model:data.model || c.model,usage:data.usage,elapsedMs,
      tools:(data.output || []).filter(x=>x.type==='web_search_call').map(x=>({type:x.type,status:x.status}))});
    if (data.status !== 'completed') throw new AppError('AI chưa trả kết quả đầy đủ; không dùng nội dung bị cắt.', 502);
    if ((data.output || []).some(x=>(x.content || []).some(p=>p.type==='refusal'))) throw new AppError('AI từ chối xử lý yêu cầu này.', 422);
    return data;
  }
  async generate(instructions, input, schema, trace) {
    this.assertReady();
    const c = this.config;
    if (c.protocol === 'responses') {
      const data = await this.responses({instructions,input,text:{format:{type:'json_schema',name:'scriptforge_script',strict:true,schema}}}, trace);
      return (data.output || []).flatMap(x=>x.content || []).filter(x=>x.type==='output_text').map(x=>x.text).join('');
    }
    const system = `${instructions}\nChỉ trả về một JSON object, không Markdown. Tuân theo JSON schema sau: ${JSON.stringify(schema)}`;
    const body = {model:c.model,stream:false,max_tokens:5000,messages:[{role:'system',content:system},{role:'user',content:input}]};
    if (c.jsonMode === 'json_schema') body.response_format = {type:'json_schema',json_schema:{name:'scriptforge_script',strict:true,schema}};
    if (c.jsonMode === 'json_object') body.response_format = {type:'json_object'};
    if (c.provider === 'deepseek') body.thinking = {type:'disabled'};
    const {data,elapsedMs} = await requestJSON(this.fetcher, `${c.baseURL}/chat/completions`, c.key, body, c.label, trace);
    trace?.({event:'ai.completed',provider:c.provider,responseId:data.id,model:data.model || c.model,usage:data.usage,elapsedMs,tools:[]});
    const choice = data.choices?.[0];
    if (choice?.message?.refusal || choice?.finish_reason === 'content_filter') throw new AppError('AI từ chối xử lý yêu cầu này.', 422);
    if (choice?.finish_reason !== 'stop' || choice?.message?.tool_calls?.length) throw new AppError('AI chưa trả kết quả đầy đủ; không dùng nội dung bị cắt hoặc lời gọi công cụ ngoài phạm vi.', 502);
    if (typeof choice.message.content !== 'string' || !choice.message.content.trim()) throw new AppError('AI trả nội dung rỗng; hãy thử lại.', 502);
    return choice.message.content;
  }
}
