import https from 'node:https';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { load } from 'cheerio';
import robotsParser from 'robots-parser';
import { AppError, createSource, normalize, topicRelevance } from './core.js';

const UA = 'ScriptForge/1.0';
export const trustedPublishers = {
  'arxiv.org': 'arXiv (bản thảo nghiên cứu; không mặc định đã phản biện)',
  'huggingface.co':'Hugging Face', 'aclanthology.org':'ACL Anthology', 'jmlr.org':'Journal of Machine Learning Research',
  'proceedings.mlr.press':'Proceedings of Machine Learning Research', 'papers.nips.cc':'NeurIPS', 'openreview.net':'OpenReview (cần kiểm tra trạng thái phản biện)',
  'developer.mozilla.org': 'MDN Web Docs', 'nist.gov': 'NIST',
  'openai.com': 'OpenAI', 'anthropic.com': 'Anthropic', 'platform.claude.com': 'Anthropic',
  'research.google': 'Google Research', 'ai.google': 'Google AI', 'ai.google.dev':'Google AI for Developers',
  'developers.google.com': 'Google Developers', 'deepmind.google': 'Google DeepMind', 'cloud.google.com': 'Google Cloud',
  'aws.amazon.com': 'Amazon Web Services',
  'microsoft.com': 'Microsoft', 'ibm.com': 'IBM', 'w3.org': 'W3C',
  'who.int': 'WHO', 'unesco.org': 'UNESCO', 'oecd.org': 'OECD',
  'python.org': 'Python Software Foundation', 'pytorch.org': 'PyTorch',
  'tensorflow.org': 'TensorFlow', 'tc39.es': 'Ecma TC39', 'acm.org': 'ACM', 'nature.com': 'Nature',
  'science.org': 'Science', 'sciencedirect.com': 'ScienceDirect', 'ieee.org': 'IEEE'
};
export function publisherFor(host) {
  const domain = Object.keys(trustedPublishers).find(d => host === d || host.endsWith(`.${d}`));
  if (domain) {
    const name=trustedPublishers[domain];
    const group=/google/.test(domain)?'google':name==='Anthropic'?'anthropic.com':name==='Amazon Web Services'?'amazon.com':domain;
    return { name, group, known: true };
  }
  if (/(\.edu|\.edu\.vn|\.ac\.uk|\.gov|\.gov\.vn)$/.test(host)) {
    const institution=host.match(/(?:^|\.)([^.]+\.(?:edu\.vn|gov\.vn|ac\.uk|edu|gov))$/u)?.[1];
    return {name:host,group:institution || host.replace(/^www\./,''),known:true};
  }
  return { name: host, group: host.replace(/^www\./, ''), known: false };
}
export function publicIPv4(ip) {
  if (isIP(ip) !== 4) return false;
  const [a,b,c] = ip.split('.').map(Number);
  return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || b === 0 || b === 2)) ||
    (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
    (a === 203 && b === 0 && c === 113));
}
export async function checkURL(value) {
  let url;
  try { url = new URL(value); } catch { throw new AppError('URL không hợp lệ.'); }
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') ||
      isIP(url.hostname.replace(/[\[\]]/g, '')) || !url.hostname.includes('.') || /\.(test|local|localhost|internal|invalid|example)$/i.test(url.hostname)) {
    throw new AppError('Chỉ đọc URL HTTPS công khai, không đọc địa chỉ nội bộ hoặc tên miền giả.');
  }
  const addresses = await lookup(url.hostname, { all: true, family: 4 });
  if (!addresses.length || addresses.some(x => !publicIPv4(x.address))) throw new AppError('Địa chỉ nguồn không thuộc mạng công khai.');
  url.hash = '';
  return { url, address: addresses[0].address };
}
// Pin the already validated DNS result to the connection (prevents DNS rebinding).
async function request(urlValue) {
  const { url, address } = await checkURL(urlValue);
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': UA, Accept: 'text/html,text/plain;q=0.9' },
      lookup: (_host, opts, cb) => opts.all ? cb(null, [{ address, family: 4 }]) : cb(null, address, 4),
      signal: AbortSignal.timeout(15000)
    }, res => {
      const chunks = []; let size = 0;
      res.on('data', chunk => {
        size += chunk.length;
        if (size > 2_000_000) { res.destroy(); req.destroy(new AppError('Trang quá lớn (giới hạn 2 MB).')); return; }
        chunks.push(chunk);
      });
      res.on('error', reject);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8'), url: url.href }));
    });
    req.on('error', reject);
  });
}
async function robotsAllowed(url) {
  let target = new URL('/robots.txt', url).href;
  for (let i = 0; i < 3; i++) {
    const response = await request(target);
    if (response.status >= 300 && response.status < 400 && response.headers.location) {
      target = new URL(response.headers.location, target).href; continue;
    }
    if ([404, 410].includes(response.status)) return;
    if (response.status !== 200) throw new AppError('Chưa kiểm tra được robots.txt; không thu thập trang này.');
    if (robotsParser(target, response.body).isAllowed(url, UA) === false) throw new AppError('Website không cho phép bot đọc đường dẫn này (robots.txt).');
    return;
  }
  throw new AppError('Không kiểm tra được robots.txt sau chuyển hướng.');
}
export async function fetchPage(value) {
  let url = value;
  for (let i = 0; i < 4; i++) {
    await checkURL(url);
    await robotsAllowed(url);
    const page = await request(url);
    if (page.status >= 300 && page.status < 400 && page.headers.location) { url = new URL(page.headers.location, url).href; continue; }
    if (page.status !== 200) throw new AppError(`Không đọc được trang (HTTP ${page.status}); không dùng làm bằng chứng.`);
    if (!/text\/html|application\/xhtml\+xml/i.test(page.headers['content-type'] || '')) throw new AppError('Hiện chỉ đọc trang HTML; hãy dùng bản HTML thay cho PDF hoặc tệp nhị phân.');
    if (/noai|noimageai/i.test(page.headers['x-robots-tag'] || '')) throw new AppError('Trang đặt chỉ thị không sử dụng cho AI.');
    return page;
  }
  throw new AppError('Trang chuyển hướng quá nhiều.');
}
// A source about prompting will naturally mention "system prompt" and
// "developer message". Those labels alone are not an instruction to this
// application. Quarantine only an actual attempt to override instructions,
// disclose a protected prompt, exfiltrate a credential, or inject role tokens.
// Hidden text remains included in this scan, because it can still be supplied
// to a downstream model if a page extractor changes later.
export const injectionPattern = /\b(?:ignore|disregard|override|forget)\s+(?:all\s+|the\s+)?(?:previous|prior|above|system)\s+(?:instructions?|prompts?)\b|\bbỏ qua\s+(?:mọi\s+|tất cả\s+|các\s+)?(?:chỉ dẫn|hướng dẫn|lệnh)\b|\b(?:reveal|expose|print|show)\b.{0,60}\b(?:system|developer)\s+prompt\b|\bsend\b.{0,60}\b(?:api[\s_-]*key|secret|access[\s_-]*token|password)\b.{0,60}\b(?:attacker|email|website|server|endpoint|url)\b|<\|(?:im_start|system)\|>/iu;
export function parsePage(html, url, query = '') {
  const $ = load(html);
  const meta = name => $(`meta[name="${name}"],meta[property="${name}"]`).first().attr('content') || '';
  if (/noai/i.test(`${meta('robots')} ${meta('googlebot')}`)) throw new AppError('Trang yêu cầu không sử dụng cho AI.');
  let paywall = false;
  $('script[type="application/ld+json"]').each((_i, e) => { if (/"isAccessibleForFree"\s*:\s*(?:false|"false")/i.test($(e).text())) paywall = true; });
  if (paywall) throw new AppError('Nội dung có giới hạn truy cập; không vượt paywall.');
  // Do not scan JavaScript/CSS blobs: SDK code often contains role labels and
  // environment-variable names that are data, not a page instruction. Keep
  // hidden body text in scope so the adversarial fixture remains blocked.
  const safetyTree = $('body').length ? $('body').clone() : $.root().clone();
  safetyTree.find('script,style,noscript,iframe').remove();
  const attack = injectionPattern.test(safetyTree.text());
  const title = normalize(meta('citation_title') || meta('og:title') || $('h1').first().text() || $('title').text()).slice(0, 200);
  if (!title) throw new AppError('Trang không có tiêu đề để nhận diện nguồn.');
  const author = normalize(meta('citation_author') || meta('author') || meta('article:author')).slice(0, 200) || null;
  const date = meta('article:published_time') || meta('citation_publication_date') || meta('datePublished') || meta('date') || $('time[datetime]').first().attr('datetime') || '';
  const modified = meta('article:modified_time') || meta('dateModified') || '';
  const parsedDate = date && Number.isFinite(Date.parse(date)) ? new Date(date).toISOString().slice(0, 10) : null;
  const updatedAt = modified && Number.isFinite(Date.parse(modified)) ? new Date(modified).toISOString().slice(0, 10) : null;
  const language = ($('html').attr('lang') || 'unknown').slice(0, 20);
  $('script,style,noscript,iframe,nav,footer,header,form,aside,[hidden],[aria-hidden="true"],[style*="display:none"],[style*="display: none"],[style*="visibility:hidden"]').remove();
  let main = $('article').first();
  if (!main.length) main = $('main').first();
  if (!main.length) main = $('body');
  let paragraphs = main.find('p,li,h2,h3,blockquote,pre').toArray().filter(e => !$(e).parents('p,li,blockquote,pre').length).map(e => normalize($(e).text())).filter(t => t.length > 30);
  // arXiv abstracts have a stable semantic container.
  if ($('blockquote.abstract').length) paragraphs = [normalize($('blockquote.abstract').text().replace(/^\s*Abstract:\s*/i, ''))];
  const text = paragraphs.join('\n\n').slice(0, 120000);
  if (text.length < 100 || /^(sign in|log in|access denied|just a moment|attention required)/i.test(title)) throw new AppError('Trang không có nội dung đọc được hoặc yêu cầu đăng nhập.');
  const publisher = publisherFor(new URL(url).hostname);
  const topic = typeof query === 'object' && query ? query.topic : query;
  const queryText = typeof query === 'object' && query ? `${query.topic || ''} ${query.goal || ''}` : query;
  const relevance = topicRelevance(`${title} ${text}`, topic);
  const ageDays = parsedDate ? Math.floor((Date.now() - Date.parse(updatedAt || parsedDate)) / 86400000) : null;
  const futureDate = ageDays !== null && ageDays < -1;
  const freshness = futureDate ? 'invalid-date' : ageDays === null ? 'unknown' : ageDays > (/giá|chi phí|mới nhất|pricing|latest/i.test(queryText) ? 180 : 730) ? 'old' : 'recent';
  const warnings = [];
  if ($('blockquote.abstract').length) warnings.push('Chỉ đọc được phần tóm tắt nghiên cứu; không suy diễn phương pháp, thực nghiệm hoặc chi tiết từ toàn văn chưa tải.');
  if (attack) warnings.push('Phát hiện chỉ dẫn có thể thao túng AI. Nguồn bị cách ly.');
  if (!author) warnings.push('Trang không công bố tác giả trong metadata; không tự suy đoán.');
  if (freshness === 'unknown') warnings.push('Không tìm được ngày xuất bản; cần kiểm tra độ mới.');
  if (freshness === 'old') warnings.push('Nguồn cũ theo ngưỡng của chủ đề; kiểm tra bản thay thế.');
  if (freshness === 'invalid-date') warnings.push('Ngày công bố nằm trong tương lai; cần xác minh.');
  if (language !== 'unknown' && !language.startsWith('vi')) warnings.push('Nguồn ngoại ngữ; bản diễn giải tiếng Việt cần đối chiếu thuật ngữ.');
  if (!publisher.known) warnings.push('Chưa thuộc danh mục tổ chức được nhận diện; cần người duyệt xác minh uy tín.');
  const criteria = [
    { label: 'Tổ chức xuất bản được nhận diện', points: publisher.known ? 35 : 0, max: 35 },
    { label: 'Có tác giả công bố', points: author ? 15 : 0, max: 15 },
    { label: 'Ngày rõ ràng và trong ngưỡng độ mới', points: freshness === 'recent' ? 15 : 0, max: 15 },
    { label: 'Nội dung khớp chủ đề cốt lõi', points: relevance.passed ? 20 : 0, max: 20 },
    { label: 'Đã đọc HTML qua HTTPS', points: 15, max: 15 }
  ];
  const source = createSource({ title, publisher: publisher.name, url, text,
    locator: 'Bản văn bản trích từ HTML đã tải', consent: true,
    rights: 'Chỉ trích đoạn cần thiết và dẫn URL; giữ quyền tác giả, kiểm tra điều khoản trước khi phân phối.' },
    { type: 'web', verified: !attack, note: 'Đã tải và lưu nội dung thật; không đồng nghĩa mọi khẳng định đều đúng.' });
  return { ...source, author, publishedAt: parsedDate, updatedAt, language, freshness, ageDays,
    publisherGroup: publisher.group, knownPublisher: publisher.known, warnings, criteria,
    topicRelevance: relevance,
    score: criteria.reduce((sum, x) => sum + x.points, 0),
    decision: attack ? 'quarantined' : 'pending', reviewNote: '', fetchedAt: new Date().toISOString() };
}
export async function readSource(url, query) { const page = await fetchPage(url); return parsePage(page.body, page.url, query); }
