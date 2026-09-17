import test from 'node:test';
import assert from 'node:assert/strict';
import { AI } from '../lib/ai.js';
import { resolveConfig } from '../lib/providers.js';
import { filterSearchResults } from '../lib/search.js';
import { Studio } from '../lib/service.js';
import { parsePage } from '../lib/web.js';
import { createServer } from '../server.js';

const brief={topic:'Mô hình học từ dữ liệu',goal:'Hiểu cách kiểm chứng kết quả',audience:'Người mới',duration:3};
const empty={scenes:[],conflicts:[]};
const ok=data=>({ok:true,json:async()=>data});
const chat=(value=empty,reason='stop')=>ok({id:'mock-call',model:'mock-model',usage:{prompt_tokens:20,completion_tokens:10},choices:[{finish_reason:reason,message:{content:JSON.stringify(value)}}]});
const sentence='Mô hình học những quy luật trong dữ liệu được cung cấp.';
const scene=()=>({title:'Học từ dữ liệu',slideBullets:['Dữ liệu đầu vào','Quy luật được học'],text:sentence,screenText:'Học từ dữ liệu',visual:'Thẻ dữ liệu đi vào mô hình.',style:'giang',claimType:'concept',status:'CITED',reason:'Có bằng chứng',citations:[]});

test('provider switching isolates credentials and model presets',()=>{
 const env={DEEPSEEK_API_KEY:'DS-SECRET',OPENAI_API_KEY:'OA-SECRET',GEMINI_API_KEY:'GM-SECRET'};
 for(const [provider,key] of [['deepseek','DS-SECRET'],['openai','OA-SECRET'],['gemini','GM-SECRET']]) {
  const config=resolveConfig({...env,AI_PROVIDER:provider});assert.equal(config.writer.key,key);assert.equal(config.writer.provider,provider);
 }
 assert.equal(resolveConfig({}).writer.provider,'deepseek');
 assert.equal(resolveConfig({OPENAI_API_KEY:'legacy'}).writer.provider,'openai');
 assert.equal(resolveConfig({AI_PROVIDER:'deepseek',OPENAI_API_KEY:'legacy'}).writer.key,'');
 assert.throws(()=>resolveConfig({AI_PROVIDER:'typo'}),/AI_PROVIDER/);
});

test('DeepSeek sends chat JSON without OpenAI-specific Responses fields',async()=>{
 const calls=[],trace=[];
 const ai=new AI({env:{AI_PROVIDER:'deepseek',DEEPSEEK_API_KEY:'DS-SECRET'},fetcher:async(url,options)=>{calls.push({url,...options});return chat();}});
 await ai.draft(brief,[],e=>trace.push(e));const call=calls[0],body=JSON.parse(call.body);
 assert.equal(call.url,'https://api.deepseek.com/chat/completions');assert.equal(call.headers.Authorization,'Bearer DS-SECRET');assert.equal(call.redirect,'error');
 assert.equal(body.model,'deepseek-flash');assert.equal(body.response_format.type,'json_object');assert.equal(body.thinking.type,'disabled');
 assert.equal(body.store,undefined);assert.equal(body.tools,undefined);assert.equal(body.max_output_tokens,undefined);assert.match(body.messages[0].content,/JSON schema/);
 assert.match(body.messages[0].content,/MỘT Ý DẠY HOÀN CHỈNH/);
 assert.equal(trace[0].provider,'deepseek');assert.ok(trace[0].usage);assert.ok(!JSON.stringify(trace).includes('DS-SECRET'));
});

test('Gemini uses its own compatible endpoint, key and structured format',async()=>{
 let call;const ai=new AI({env:{AI_PROVIDER:'gemini',GEMINI_API_KEY:'GM',OPENAI_API_KEY:'OA'},fetcher:async(url,opts)=>{call={url,...opts};return chat();}});
 await ai.draft(brief,[]);assert.equal(call.url,'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions');
 assert.equal(call.headers.Authorization,'Bearer GM');assert.equal(JSON.parse(call.body).response_format.type,'json_schema');assert.equal(JSON.parse(call.body).thinking,undefined);
});

test('custom endpoint/model and explicit JSON capability are configurable',async()=>{
 for(const mode of ['json_object','json_schema','text']) {
  let call;const ai=new AI({env:{AI_PROVIDER:'compatible',COMPATIBLE_BASE_URL:'https://gateway.example.org/v1/',COMPATIBLE_API_KEY:'CUSTOM',COMPATIBLE_MODEL:'chosen-model',COMPATIBLE_JSON_MODE:mode},fetcher:async(url,opts)=>{call={url,...opts};return chat();}});
  await ai.draft(brief,[]);assert.equal(call.url,'https://gateway.example.org/v1/chat/completions');assert.equal(JSON.parse(call.body).model,'chosen-model');
  assert.equal(JSON.parse(call.body).response_format?.type,mode==='text'?undefined:mode);
 }
 for(const url of ['http://gateway.example.org','https://name:secret@gateway.example.org','https://gateway.example.org?key=secret']) assert.throws(()=>resolveConfig({AI_PROVIDER:'compatible',COMPATIBLE_BASE_URL:url}));
});

test('missing writer configuration fails before any network call and never falls back',async()=>{
 let calls=0;const ai=new AI({env:{AI_PROVIDER:'deepseek',OPENAI_API_KEY:'UNRELATED'},fetcher:async()=>{calls++;return chat();}});
 await assert.rejects(ai.draft(brief,[]),/DEEPSEEK_API_KEY/);assert.equal(calls,0);
 const custom=new AI({env:{AI_PROVIDER:'compatible',COMPATIBLE_API_KEY:'X'}});assert.equal(custom.enabled,false);await assert.rejects(custom.draft(brief,[]),/COMPATIBLE_MODEL/);
});

test('Tavily discovers URLs independently of the model and never accepts its generated answer',async()=>{
 let call;const ai=new AI({env:{AI_PROVIDER:'deepseek',SEARCH_PROVIDER:'tavily',TAVILY_API_KEY:'SEARCH-ONLY'},fetcher:async(url,opts)=>{call={url,...opts};return ok({answer:'https://fabricated.invalid',results:[{url:'https://nist.gov/example#part',title:'Mô hình học từ dữ liệu',score:.8},{url:'https://nist.gov/example',title:'Mô hình học từ dữ liệu',score:.8},{url:'javascript:alert(1)',score:1}]});}});
 assert.equal(ai.enabled,false);assert.equal(ai.searchEnabled,true);
 assert.deepEqual(await ai.research(brief),['https://nist.gov/example']);assert.equal(call.url,'https://api.tavily.com/search');assert.equal(call.headers.Authorization,'Bearer SEARCH-ONLY');
 assert.equal(JSON.parse(call.body).include_answer,false);
});

test('Exa uses its own key and restricts AI discovery to international primary learning material',async()=>{
 const calls=[];const results=['platform.claude.com','platform.openai.com','ai.google.dev','huggingface.co','nist.gov','aclanthology.org','cs.stanford.edu','jmlr.org'].map(host=>({url:`https://${host}/docs/prompt-engineering`,title:'Prompt engineering guide'}));
 const ai=new AI({env:{AI_PROVIDER:'deepseek',DEEPSEEK_API_KEY:'DS',SEARCH_PROVIDER:'exa',EXA_API_KEY:'EXA-ONLY'},fetcher:async(url,opts)=>{
  calls.push({url,...opts});return ok({requestId:'exa-request',results});
 }});
 const urls=await ai.research({topic:'Làm sao để trở thành prompt engineer giỏi',goal:'Tự xây sản phẩm',audience:'Người mới',duration:3});
 assert.equal(urls.length,8);assert.equal(calls.length,1);assert.ok(calls.every(call=>call.url==='https://api.exa.ai/search'));
 assert.equal(calls[0].headers['x-api-key'],'EXA-ONLY');assert.equal(calls[0].headers.Authorization,undefined);
 const body=JSON.parse(calls[0].body);assert.equal(body.type,'auto');assert.equal(body.numResults,15);assert.deepEqual(body.contents,{text:false,highlights:true});
 assert.ok(body.includeDomains.includes('huggingface.co'));assert.equal(body.excludeDomains,undefined);assert.match(body.query,/prompt engineering/);assert.doesNotMatch(body.query,/trở thành/);
 assert.ok(!JSON.stringify(calls).includes('DS'));
});

test('Tavily discovery drops binary and weak unrelated results before download',()=>{
 const results=[
  {url:'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map',title:'Array.prototype.map() - JavaScript',content:'The map method creates a new array.',score:.82},
  {url:'https://www.w3schools.com/jsref/jsref_map.asp',title:'JavaScript Array map()',content:'JavaScript Array Reference',score:.74},
  {url:'https://gov.example/report.pdf',title:'Vietnamese progress review',content:'Unrelated report',score:.18},
  {url:'https://crypto.example/nft',title:'Non-fungible tokens',content:'Crypto markets and tokens',score:.12},
  {url:'https://howkteam.vn/javascript-map',title:'Kiểu dữ liệu Map trong JavaScript',content:'Map lưu cặp khóa và giá trị.',score:.8},
  {url:'https://who.int/semantic',title:'Translated official reference',content:'Cross language explanation',score:.7}
 ];
 const selected=filterSearchResults(results,{topic:'Array map trong JavaScript',goal:'Tài liệu chính thức về phương thức map'});
 assert.deepEqual(selected.map(x=>x.url),[results[0].url,results[1].url,results[5].url]);
});

test('long briefs cannot pass on one generic word and social/app-store pages are excluded',()=>{
 const brief={topic:'Làm sao để trở thành 1 prompt engineer giỏi',goal:'Tự làm một sản phẩm hoàn thiện'};
 const results=[
  {url:'https://apps.apple.com/vn/app/apple-support/id1130498044',title:'Ứng dụng hỗ trợ Apple',content:'Làm sản phẩm tốt hơn',score:.91},
  {url:'https://www.facebook.com/example/videos/1',title:'Trở thành người giỏi',content:'Video mới',score:.88},
  {url:'https://platform.claude.com/docs/prompt',title:'Prompt engineer technical guide',content:'Skills for a prompt engineer',score:.61}
 ];
 assert.deepEqual(filterSearchResults(results,brief).map(x=>x.url),[results[2].url]);
});

test('English morphology keeps prompt-engineering documentation relevant',()=>{
 const selected=filterSearchResults([{url:'https://platform.claude.com/docs/prompting',title:'Prompt engineering guide',content:'Prompting techniques and evaluations',score:.6}],
  {topic:'Làm sao để trở thành prompt engineer giỏi',goal:'Thực hành'});
 assert.equal(selected.length,1);
});

test('discovery keeps the official documentation and removes URL variants and mirrors',()=>{
 const topic={topic:'Array.prototype.map trong JavaScript',goal:'Tìm tài liệu về phương thức Array.prototype.map'};
 const results=[
  {url:'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map',title:'Array.prototype.map() - JavaScript',score:.9},
  {url:'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map?retiredLocale=nl',title:'Array.prototype.map()',score:.88},
  {url:'https://mirror.example.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map.html',title:'Array.prototype.map mirror',score:.8},
  {url:'https://docs.mirror.example/javascript/global_objects/array/map.html',title:'Array.prototype.map copied docs',score:.79},
  {url:'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray/map',title:'TypedArray.prototype.map()',content:'JavaScript typed array map',score:.7},
  {url:'https://javascript.info/array-methods',title:'JavaScript array methods',content:'Array map creates a new array',score:.65}
 ];
 const selected=filterSearchResults(results,topic,8);
  assert.equal(selected.filter(x=>x.url.includes('/Array/map')).length,1);
  assert.equal(selected[0].url,results[0].url);
  assert.ok(!selected.some(x=>x.url.includes('/TypedArray/map')));
});

test('downloaded page relevance uses core topic terms rather than any brief word',()=>{
 const source=parsePage('<html lang="vi"><title>Ứng dụng hỗ trợ</title><main><p>Trang này giúp bạn làm sản phẩm và hoàn thành nhiều công việc thuận tiện hơn mỗi ngày. Nội dung chỉ mô tả quyền riêng tư, cách liên hệ bộ phận hỗ trợ và các tiện ích của ứng dụng.</p></main></html>','https://example.org/app',{topic:'Làm sao để trở thành 1 prompt engineer giỏi',goal:'Tự làm sản phẩm'});
 assert.equal(source.topicRelevance.passed,false);
 assert.equal(source.criteria.find(x=>x.label==='Nội dung khớp chủ đề cốt lõi').points,0);
});

test('candidate selection skips opening headings and prefers substantive relevant passages',()=>{
 const studio=new Studio({projects:[],save:async()=>{}});
 const source={id:'S-EVIDENCE',decision:'approved',title:'Prompt Engineering Documentation',publisher:'Synthetic test',publisherGroup:'anthropic.com',url:'https://platform.claude.com/docs/test-only',provenance:{verified:true},warnings:[],chunks:[
  {id:'S-EVIDENCE-001',text:'Prompt Engineering',locator:'Dòng 1'},
  {id:'S-EVIDENCE-002',text:'Khóa học dành cho người mới',locator:'Dòng 2'},
  {id:'S-EVIDENCE-003',text:'Đăng ký ngay để nhận ưu đãi',locator:'Dòng 3'},
  {id:'S-EVIDENCE-004',text:'Prompt engineering là việc viết chỉ dẫn rõ ràng, kèm ngữ cảnh và tiêu chí đầu ra để hệ thống có thể tạo nội dung phù hợp với mục tiêu của người dùng.',locator:'Dòng 4'},
  {id:'S-EVIDENCE-005',text:'Khi xây sản phẩm với trí tuệ nhân tạo, hãy chia yêu cầu thành từng bước có thể kiểm tra và so sánh kết quả với tiêu chí đã đặt ra.',locator:'Dòng 5'}
 ]};
 const candidates=studio.candidates({brief:{topic:'Trở thành prompt engineer giỏi',goal:'Tự xây sản phẩm với trí tuệ nhân tạo'},sources:[source]});
 assert.deepEqual(new Set(candidates.map(candidate=>candidate.id)),new Set(['S-EVIDENCE-004','S-EVIDENCE-005']));
});

test('OpenAI search can coexist with DeepSeek writing without mixing keys',async()=>{
 const calls=[];const ai=new AI({env:{AI_PROVIDER:'deepseek',DEEPSEEK_API_KEY:'DS',SEARCH_PROVIDER:'openai',OPENAI_API_KEY:'OA'},fetcher:async(url,opts)=>{
  calls.push({url,key:opts.headers.Authorization});return url.endsWith('/responses')?ok({status:'completed',output:[{type:'web_search_call',action:{sources:[{url:'https://nist.gov/example'}]}}]}):chat();
 }});
 await ai.research(brief);await ai.draft(brief,[]);
 assert.deepEqual(calls,[{url:'https://api.openai.com/v1/responses',key:'Bearer OA'},{url:'https://api.deepseek.com/chat/completions',key:'Bearer DS'}]);
});

test('missing/manual search is explicit and does not prevent DeepSeek drafting',async()=>{
 for(const provider of ['manual','tavily','exa']) {
  const ai=new AI({env:{AI_PROVIDER:'deepseek',DEEPSEEK_API_KEY:'DS',SEARCH_PROVIDER:provider},fetcher:async()=>chat()});
  assert.equal(ai.searchEnabled,false);await assert.rejects(ai.research(brief),/SEARCH_PROVIDER|TAVILY_API_KEY|EXA_API_KEY/);assert.deepEqual(await ai.draft(brief,[]),empty);
 }
});

test('truncation, refusal, empty output and malformed nested JSON fail closed',async()=>{
 const invalid=[chat(empty,'length'),chat(empty,'content_filter'),ok({choices:[{finish_reason:'stop',message:{content:''}}]}),chat({scenes:[null,null,null,null,null],conflicts:[]}),chat({scenes:[scene()],conflicts:[]}),ok({choices:[{finish_reason:'stop',message:{content:'```json\n{}\n```'}}]})];
 for(const response of invalid){const ai=new AI({env:{},provider:'deepseek',key:'TEST',fetcher:async()=>response});await assert.rejects(ai.draft(brief,[]));}
});

test('writer tolerates only harmless scene-shape differences and still never invents citations',async()=>{
 const candidate={id:'S1-001',sourceId:'S1',text:sentence,title:'Test source',publisher:'Test',publisherGroup:'test',locator:'Dòng 1',url:'https://example.org'};
 const loose={scenes:[{title:'Cảnh có dẫn chứng',text:sentence,citations:[{chunkId:candidate.id,quote:sentence,extra:'ignored'}],extraDisplayField:'ignored'}],conflicts:[]};
 const ai=new AI({env:{},provider:'deepseek',key:'TEST',fetcher:async()=>chat(loose)});
 const value=await ai.draft(brief,[candidate],()=>{}, {plan:{count:1,start:1,total:1,targetUnitsPerScene:100}});
 assert.equal(value.scenes.length,1);assert.equal(value.scenes[0].style,'giang');assert.equal(value.scenes[0].status,'NEEDS_VERIFY');assert.deepEqual(value.scenes[0].citations,[{chunkId:candidate.id,quote:sentence}]);
});

test('writer takes only the requested scene when DeepSeek returns extra scenes or display fields',async()=>{
 const candidate={id:'S1-001',sourceId:'S1',text:sentence,title:'Test source',publisher:'Test',publisherGroup:'test',locator:'Dòng 1',url:'https://example.org'};
 const output={scenes:[{...scene(),citations:[{chunkId:candidate.id,quote:sentence}],uiHint:'ignored'},{...scene(),title:'Không được dùng',citations:[{chunkId:candidate.id,quote:sentence}]}],conflicts:[],debug:'ignored'};
 const ai=new AI({env:{},provider:'deepseek',key:'TEST',fetcher:async()=>chat(output)});
 const result=await ai.draft(brief,[candidate],()=>{}, {plan:{count:1,start:1,total:2,targetUnitsPerScene:100}});
 assert.equal(result.scenes.length,1);assert.equal(result.scenes[0].title,'Học từ dữ liệu');
});

test('writer safely extracts a fenced JSON object and repairs only literal control characters in a JSON string',async()=>{
 const candidate={id:'S1-001',sourceId:'S1',text:sentence,title:'Test source',publisher:'Test',publisherGroup:'test',locator:'Dòng 1',url:'https://example.org'};
 const output={scenes:[{...scene(),text:'Dòng một.\nDòng hai.',citations:[{chunkId:candidate.id,quote:sentence}]}],conflicts:[]};
 const malformed=JSON.stringify(output).replace('Dòng một.\\nDòng hai.','Dòng một.\nDòng hai.');
 const response=ok({id:'mock-call',model:'mock-model',choices:[{finish_reason:'stop',message:{content:`Đây là object được yêu cầu:\n\`\`\`json\n${malformed}\n\`\`\``}}]});
 const ai=new AI({env:{},provider:'deepseek',key:'TEST',fetcher:async()=>response});
 const result=await ai.draft(brief,[candidate],()=>{}, {plan:{count:1,start:1,total:1,targetUnitsPerScene:100}});
 assert.equal(result.scenes[0].text,'Dòng một.\nDòng hai.');
});

test('writer records a structural-only diagnostic for unusable JSON output',async()=>{
 const trace=[];const ai=new AI({env:{},provider:'deepseek',key:'TEST',fetcher:async()=>chat({scenes:{not:'an array'},conflicts:[]})});
 await assert.rejects(ai.draft(brief,[],event=>trace.push(event),{plan:{count:1,start:1,total:1}}),/không đủ cấu trúc/);
 assert.deepEqual(trace.at(-1),{event:'ai.output_invalid',provider:'deepseek',stage:'draft',reason:'thiếu mảng scenes'});
});

test('provider errors redact raw response contents and preserve actionable status',async()=>{
 for(const status of [400,401,402,403,429,500]) {
  const ai=new AI({env:{},provider:'deepseek',key:'SECRET',fetcher:async()=>({ok:false,status,json:async()=>({error:'SECRET'})})});
  await assert.rejects(ai.draft(brief,[]),e=>!e.message.includes('SECRET')&&e.message.startsWith('DeepSeek:'));
 }
});

test('mocked DeepSeek plus search plans, detects shallow narration and repairs only dependent scenes',async()=>{
 const store={projects:[],save:async()=>{}};let draftCalls=0,outlineCalls=0;
 const ai=new AI({env:{AI_PROVIDER:'deepseek',DEEPSEEK_API_KEY:'TEST',SEARCH_PROVIDER:'tavily',TAVILY_API_KEY:'SEARCH'},fetcher:async(url,opts)=>{
  if(url.includes('tavily'))return ok({results:[{url:'https://example.org/a',title:'Mô hình học từ dữ liệu',score:.8},{url:'https://example.net/b',title:'Mô hình học từ dữ liệu',score:.8}]});
  const request=JSON.parse(JSON.parse(opts.body).messages[1].content),e=request.evidence.filter(c=>c.text===sentence);
  if(request.task==='lesson-outline') {
   outlineCalls++;
   return chat({slides:Array.from({length:request.plan.count},(_,i)=>({title:`Ý dạy ${i}`,section:i===0?'Mở đầu':i===request.plan.count-1?'Kết bài':'Nội dung chính',teachingGoal:'Giải thích việc học',explanation:'Dữ liệu và quy luật',workedExample:'Ví dụ giả định',checkUnderstanding:'Câu hỏi và lời giải',evidenceIds:[e[i%2].id]})),missingEvidence:[]});
  }
  draftCalls++;
  const count=request.repair?1:(request.plan?.count||5);
  return chat({scenes:Array.from({length:count},()=>({...scene(),citations:[{chunkId:e[0].chunkId,quote:sentence}]})),conflicts:[]});
 }});
 const reader=async url=>parsePage(`<html lang="vi"><title>Fixture only</title><main><p>${sentence}</p><p>Nguồn giả ${url} tự viết chỉ phục vụ kiểm thử phần mềm, không dùng làm tài liệu giảng dạy.</p></main></html>`,url);
 const studio=new Studio(store,{ai,reader}),p=await studio.create(brief);await studio.research(p);await assert.rejects(studio.generate(p),/Duyệt/);assert.equal(draftCalls,0);
 for(const s of p.sources)await studio.decideSource(p,s.id,{action:'approve',verified:true,note:'Nguồn giả chỉ dùng trong kiểm thử adapter.'});
 await studio.generate(p);assert.equal(p.scenes.length,4);assert.equal(outlineCalls,1);assert.equal(draftCalls,8);assert.ok(p.scenes.every(s=>s.issues.some(issue=>issue.includes('quá ngắn'))));assert.equal(p.scriptPlan.complete,false);
 const removed=p.scenes[0].citations[0].sourceId,unaffected=p.scenes.filter(s=>s.citations[0].sourceId!==removed),before=JSON.stringify(unaffected);
 assert.ok(unaffected.length>0);
 await studio.decideSource(p,removed,{action:'reject'});const affected=p.scenes.filter(s=>s.needsRepair).length;await studio.repair(p);
 assert.equal(draftCalls,8+affected);assert.equal(JSON.stringify(p.scenes.filter(s=>unaffected.some(u=>u.id===s.id))),before);
});

test('bootstrap exposes selected provider and capabilities but no credentials',async()=>{
 const store={projects:[],init:async()=>{},save:async()=>{}};
 const ai=new AI({env:{AI_PROVIDER:'deepseek',DEEPSEEK_API_KEY:'SECRET-DS',SEARCH_PROVIDER:'tavily',TAVILY_API_KEY:'SECRET-TV'}});
 const {server}=await createServer({store,ai});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try {const data=await(await fetch(`http://127.0.0.1:${server.address().port}/api/bootstrap`)).json();assert.equal(data.provider,'deepseek');assert.equal(data.searchEnabled,true);assert.ok(!JSON.stringify(data).includes('SECRET-'));}
 finally {await new Promise(r=>server.close(r));}
});
