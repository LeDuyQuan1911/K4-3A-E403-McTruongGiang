import { createHash, randomUUID } from 'node:crypto';
import { teachingIssues } from './lesson.js';

export const digest = value => createHash('sha256').update(value).digest('hex');
export const normalize = value => String(value ?? '').normalize('NFC').replace(/\s+/gu, ' ').trim();
export const SCREEN_TEXT_MAX = 100;
export const spokenSentences = text => [...new Intl.Segmenter('vi',{granularity:'sentence'}).segment(String(text || ''))].map(item=>item.segment.trim()).filter(Boolean);
// A slide bullet may be wrapped without changing its words. This is used only
// after an AI rewrite, so a model cannot leave a trivially overlong display
// field that prevents the reviewer from proceeding.
export function fitSlideBullets(values, max=120, maxItems=5) {
  const original=(Array.isArray(values)?values:[]).map(value=>String(value).trim()).filter(Boolean);
  const wrapped=[];
  for(const item of original) {
    if(item.length<=max) { wrapped.push(item);continue; }
    let line='';
    for(const word of item.split(/\s+/u)) {
      if(!line) { line=word;continue; }
      if(`${line} ${word}`.length<=max) { line+=` ${word}`;continue; }
      wrapped.push(line);line=word;
    }
    if(line) wrapped.push(line);
  }
  // If wrapping would exceed the designed two-to-five-item slide layout, let
  // the normal validation ask the AI/reviewer for a real summary instead of
  // silently dropping part of the teaching content.
  return wrapped.length>=2&&wrapped.length<=maxItems?wrapped:original;
}
export function clipScreenText(value, max=SCREEN_TEXT_MAX) {
  const text=String(value||'').trim();if(text.length<=max)return text;
  const prefix=text.slice(0,max+1), boundary=prefix.lastIndexOf(' ');
  return (boundary>max*.55?prefix.slice(0,boundary):text.slice(0,max)).trim();
}
const digitWords=['không','một','hai','ba','bốn','năm','sáu','bảy','tám','chín'];
function underThousand(value, full=false) {
  const hundreds=Math.floor(value/100), rest=value%100, tens=Math.floor(rest/10), ones=rest%10, parts=[];
  if (hundreds) parts.push(`${digitWords[hundreds]} trăm`);
  else if (full&&rest) parts.push('không trăm');
  if (tens>1) { parts.push(`${digitWords[tens]} mươi`);if(ones===1)parts.push('mốt');else if(ones===5)parts.push('lăm');else if(ones)parts.push(digitWords[ones]); }
  else if (tens===1) { parts.push('mười');if(ones===5)parts.push('lăm');else if(ones)parts.push(digitWords[ones]); }
  else if (ones) { if(hundreds)parts.push('lẻ');parts.push(digitWords[ones]); }
  return parts.join(' ');
}
function integerWords(value) {
  if (!Number.isSafeInteger(value)||value<0||value>999999999999) return '';
  if (!value) return digitWords[0];
  const scales=[[1000000000,'tỷ'],[1000000,'triệu'],[1000,'nghìn']],parts=[];let rest=value, emitted=false;
  for (const [amount,label] of scales) { const group=Math.floor(rest/amount);if(group){parts.push(`${underThousand(group,emitted)} ${label}`);emitted=true;rest%=amount;} }
  if(rest)parts.push(underThousand(rest,emitted));return parts.join(' ');
}
// Mechanical speech formatting preserves the numeric value; it does not make
// a claim verified, so source and human semantic review still remain required.
export function spellNumbersForSpeech(text) {
  return String(text||'').replace(/\d[\d.,]*%?/gu, token=>{
    const percent=token.endsWith('%'), raw=percent?token.slice(0,-1):token;
    if (!raw || /[.,]{2}|[.,]$/.test(raw)) return token;
    const separators=raw.match(/[.,]/gu)||[], groups=raw.split(/[.,]/u);
    let whole=raw, fraction='';
    if (separators.length&&groups.slice(1).every(group=>group.length===3)) whole=groups.join('');
    else if (separators.length===1) [whole,fraction]=groups;
    else if (separators.length) return token;
    const words=integerWords(Number(whole));if(!words) return token;
    const decimal=fraction?` phẩy ${[...fraction].map(character=>digitWords[Number(character)]).join(' ')}`:'';
    return `${words}${decimal}${percent?' phần trăm':''}`;
  });
}
export function formatNarrationForSpeech(text) {
  let value=String(text||'')
    .replace(/\b(?:model|mô hình)\s+GPT\s*[-–—]?\s*/giu,'mô hình tạo sinh đã được huấn luyện trước, phiên bản ')
    .replace(/\bGPT\s*[-–—]\s*/gu,'mô hình tạo sinh đã được huấn luyện trước, phiên bản ')
    .replace(/\bGPT\b/gu,'mô hình tạo sinh đã được huấn luyện trước')
    .replace(/\bLLM\b/gu,'mô hình ngôn ngữ lớn')
    .replace(/\bAI\b/gu,'trí tuệ nhân tạo')
    .replace(/\bAPI\b/gu,'giao diện lập trình ứng dụng')
    .replace(/\bJSON\b/gu,'định dạng dữ liệu có cấu trúc')
    .replace(/\bNLP\b/gu,'xử lý ngôn ngữ tự nhiên')
    .replace(/\bCTA\b/gu,'lời kêu gọi hành động');
  // Numbers may be values, version labels, or code identifiers. Keep them
  // verbatim; the project does not require spelling numbers out for narration.
  return value;
}
export class AppError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
export function required(value, label, max = 200) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new AppError(`${label}: cần nhập từ 1 đến ${max} ký tự.`);
  return value.trim();
}
export function safeURL(value) {
  if (!value) return '';
  let url;
  try { url = new URL(value); } catch { throw new AppError('Đường dẫn nguồn không hợp lệ.'); }
  if (url.protocol !== 'https:' || url.username || url.password) throw new AppError('Nguồn công khai cần đường dẫn HTTPS.');
  return url.href;
}
export function chunkText(text, id) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const chunks = [];
  let buffer = '', start = 1, end = 1;
  const flush = () => {
    if (buffer.trim()) chunks.push({ id: `${id}-${String(chunks.length + 1).padStart(3, '0')}`, text: normalize(buffer), locator: `Dòng ${start}–${end}` });
    buffer = '';
  };
  lines.forEach((line, index) => {
    if (!line.trim()) { flush(); return; }
    // Keep original line locations, even when a long transcript line is split.
    const pieces = line.match(/[\s\S]{1,1200}/g) || [];
    for (const piece of pieces) {
      if (buffer.length + piece.length > 1500) flush();
      if (!buffer) start = index + 1;
      end = index + 1;
      buffer += `${buffer ? ' ' : ''}${piece}`;
    }
  });
  flush();
  return chunks;
}
export function createSource(input, provenance = null) {
  const title = required(input.title, 'Tên tài liệu');
  const publisher = required(input.publisher, 'Tác giả / tổ chức');
  const text = required(input.text, 'Nội dung tài liệu', 120000);
  if (text.includes('\u0000')) throw new AppError('Chỉ nhận tài liệu văn bản UTF-8.');
  const locator = required(input.locator, 'Vị trí bản gốc', 500);
  const rights = required(input.rights, 'Quyền sử dụng', 500);
  if (input.consent !== true) throw new AppError('Cần xác nhận quyền sử dụng và xử lý tài liệu.');
  const id = `S${randomUUID().slice(0, 8).toUpperCase()}`;
  return { id, title, publisher, locator, rights, url: safeURL(input.url), text,
    hash: digest(text), createdAt: new Date().toISOString(),
    provenance: provenance || { type: 'uploaded', verified: false, note: 'Chưa đối chiếu bản gốc; không dùng để tạo kịch bản.' },
    chunks: chunkText(text, id) };
}
const stop = new Set('và là của một những các cho về trong với từ được có để khi theo như này đó hãy giải thích viết kịch bản bài giảng video người mới bắt đầu cơ chế so sánh the a an is of to and in for with how what'.split(' '));
export const tokens = text => [...new Set(normalize(text).toLowerCase().match(/[\p{L}\p{N}]+/gu) || [])].filter(x => x.length > 1 && !stop.has(x));
// Words that frame a question or desired skill are poor evidence of subject
// relevance. For example, an App Store page may contain "làm" or "thành"
// without having anything to do with "prompt engineer".
const topicFraming = new Set('cách làm sao để trở thành giỏi tốt hay hướng dẫn tìm hiểu biết hỏi bắt đầu căn bản cơ bản tổng quan cần nên thế nào'.split(' '));
export function topicTerms(value) {
  const specific = tokens(value).filter(term => !topicFraming.has(term));
  // Keep validation usable for unusually phrased topics, but never reduce a
  // normal technical topic to an empty list.
  return specific.length ? specific : tokens(value);
}
export function topicRelevance(value, topic) {
  const terms = topicTerms(topic);
  const words = tokens(value);
  const related = (term, word) => term === word || (
    /^[a-z]+$/u.test(term) && /^[a-z]+$/u.test(word) &&
    Math.min(term.length, word.length) >= 5 && Math.abs(term.length - word.length) <= 4 &&
    (term.startsWith(word) || word.startsWith(term))
  );
  const matched = terms.filter(term => words.some(word => related(term, word)));
  const required = terms.length <= 3 ? terms.length : Math.max(2, Math.ceil(terms.length * 0.6));
  return { terms, matched, required, passed: Boolean(terms.length) && matched.length >= required };
}
export function retrieve(sources, query, limit = 10) {
  const terms = tokens(query);
  if (!terms.length) return [];
  return sources.filter(s => s.provenance.verified).flatMap(source => source.chunks.map(chunk => {
    const body = normalize(chunk.text).toLowerCase(), title = source.title.toLowerCase();
    const matched = terms.filter(t => body.includes(t));
    const score = matched.length * 3 + terms.filter(t => title.includes(t)).length;
    return { ...chunk, sourceId: source.id, title: source.title, publisher: source.publisher, publisherGroup: source.publisherGroup,
      date: source.updatedAt || source.publishedAt, warnings: source.warnings || [], url: source.url, sourceLocator: source.locator, score, matched };
  })).filter(c => c.score > 0 && c.matched.length > 0).sort((a, b) => b.score - a.score).slice(0, limit);
}
export function scopeCheck(topic) {
  const t = normalize(topic).toLowerCase();
  if (/tự (động )?(xuất bản|đăng|publish)|auto.?publish|đăng (lên|youtube|facebook)/iu.test(t)) return 'Ứng dụng chỉ xuất tệp sau khi người viết duyệt; không tự đăng hay xuất bản.';
  if (/bịa|fabricat|fake (source|citation)|ignore (all|previous)|bỏ qua (mọi|tất cả|quy tắc)|system prompt/iu.test(t)) return 'Không thực hiện yêu cầu bịa nguồn hoặc bỏ qua kiểm chứng.';
  if (/(mật khẩu|api[ -]?key|credential|bí mật|secret).*(web|trang|nguồn)|(web|trang|nguồn).*(mật khẩu|api[ -]?key|credential|bí mật|secret)/iu.test(t)) return 'Không lấy, xử lý hoặc làm theo thông tin bí mật xuất hiện trong nguồn web.';
  if (/bỏ qua.*(người duyệt|giảng viên|duyệt)|xuất.*(khi|mà).*chưa.*duyệt/iu.test(t)) return 'Không thể bỏ qua bước duyệt nguồn, cảnh và giảng viên trước khi xuất.';
  if (/(paywall|đăng nhập|vượt.*(?:rào|kiểm soát))|bằng mọi cách.*(?:tải|đọc)/iu.test(t)) return 'Không vượt paywall, đăng nhập hoặc biện pháp kiểm soát truy cập để lấy nội dung.';
  if (/gọi.*dịch vụ ngoài.*không có nguồn|xác minh.*không có nguồn/iu.test(t)) return 'Cần URL HTTPS hoặc nguồn hợp lệ do người dùng cung cấp trước khi đối chiếu.';
  if (/tự sửa.*citation|hợp thức hóa.*(?:claim|khẳng định|câu bịa)|citation.*(?:câu bịa|khẳng định bịa)/iu.test(t)) return 'Không sửa bằng chứng để hợp thức hóa một khẳng định chưa có căn cứ.';
  if (/(xuất|lấy).*(tên|liên hệ|dữ liệu nhận dạng)|(?:tên|liên hệ).*(người trả lời|học viên)/iu.test(t)) return 'Không xuất thông tin định danh hoặc liên hệ của người trả lời khảo sát.';
  return '';
}
export function noSource(reason, title = 'Chưa đủ căn cứ') {
  return { id: randomUUID(), title, text: '', status: 'NO_SOURCE', reason, citations: [], decision: 'pending', humanVerified: false };
}
// This is deliberately exact: a quote is evidence only when it is a
// contiguous excerpt from the selected chunk.  Keeping the check separate
// lets the service ask the model to correct a malformed citation before the
// scene is discarded, without ever accepting a fuzzy or invented quote.
export function citationValidationIssue(raw, candidates) {
  if (!raw || typeof raw.text !== 'string' || !raw.text.trim() || raw.status === 'NO_SOURCE') return '';
  if (!Array.isArray(raw.citations) || raw.citations.length === 0 || raw.citations.length > 8) return 'Không có trích dẫn hợp lệ. Nội dung đã bị chặn.';
  for (const item of raw.citations) {
    const chunk = Array.isArray(candidates) && candidates.find(c => c.id === item?.chunkId);
    const quote = normalize(item?.quote);
    // No fuzzy matching: wrong source, invented quote, or guessed locator is rejected.
    if (!chunk || quote.length < 12 || !normalize(chunk.text).includes(quote)) return 'Mã nguồn hoặc trích đoạn không khớp tài liệu đã chọn. Nội dung đã bị chặn.';
  }
  return '';
}
export function validateSegment(raw, candidates) {
  if (!raw || typeof raw.text !== 'string' || !raw.text.trim() || raw.status === 'NO_SOURCE') return noSource(String(raw?.reason || 'Nguồn không đủ để viết đoạn này.').slice(0,1000), String(raw?.title || 'Chưa đủ căn cứ').slice(0, 200));
  const citationIssue = citationValidationIssue(raw, candidates);
  if (citationIssue) return noSource(citationIssue);
  const citations = [];
  for (const item of raw.citations) {
    const chunk = candidates.find(c => c.id === item.chunkId);
    const quote = normalize(item.quote);
    citations.push({ chunkId: chunk.id, sourceId: chunk.sourceId, quote, publisherGroup: chunk.publisherGroup,
      locator: chunk.locator, title: chunk.title, publisher: chunk.publisher, url: chunk.url, sourceLocator: chunk.sourceLocator });
  }
  const text = required(raw.text, 'Đoạn kịch bản', 6000);
  // A quoted span is exact; an AI paraphrase is NEVER automatically called verified.
  const exact = citations.length === 1 && normalize(text) === citations[0].quote;
  const sensitive = /[=∑√]|\b(?:gradient|multi.head|formula)\b/iu.test(text);
  return { id: randomUUID(), title: String(raw.title || 'Đoạn kịch bản').slice(0, 200), text,
    status: exact && !sensitive && raw.status !== 'NEEDS_VERIFY' ? 'CITED' : 'NEEDS_VERIFY',
    reason: exact && !sensitive && raw.status !== 'NEEDS_VERIFY' ? 'Trích nguyên văn khớp nguồn. Vẫn cần người viết duyệt mức liên quan.' : 'Cần đối chiếu ý nghĩa, thuật ngữ và mọi khẳng định với nguồn trước khi chấp nhận.',
    citations, decision: 'pending', humanVerified: false };
}
export function sceneIssues(scene) {
  const issues = teachingIssues(scene,scene.targetUnits);
  if (/\b(?:AI|LLM|JSON|CTA|API|NLP|GPT)\b/u.test(scene.text)) issues.push('Lời đọc còn viết tắt; dùng tên đầy đủ hoặc nghĩa tiếng Việt.');
  if ((scene.screenText || '').length > SCREEN_TEXT_MAX) issues.push(`Chữ trên màn hình vượt ${SCREEN_TEXT_MAX} ký tự.`);
  if (!scene.screenText || !scene.visual) issues.push('Cần chữ trên màn hình và ý đồ hình.');
  if (!Array.isArray(scene.slideBullets) || scene.slideBullets.length < 2 || scene.slideBullets.length > 5) issues.push('Nội dung slide cần từ hai đến năm ý ngắn.');
  else if (scene.slideBullets.some(item => !String(item).trim() || String(item).length > 120)) issues.push('Mỗi ý trên slide cần rõ ràng và không quá một trăm hai mươi ký tự.');
  return issues;
}
export function isNumeric(text) {
  // Keep a metric label for display/analytics only. It never changes the
  // approval threshold: every claim still needs evidence and human review.
  return /\d+(?:[.,]\d+)?\s*%|\d+(?:[.,]\d+)?\s+(?:phần trăm|ngày|giờ|phút|tuần|tháng|năm|đô la|token|mẫu quan sát)\b|\b(?:một nửa|gấp (?:hai|ba|bốn|năm))\b|\b(?:một|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười|trăm|nghìn|ngàn|triệu|tỷ)\s+(?:phần trăm|ngày|giờ|phút|tuần|tháng|năm|đô la|token|mẫu quan sát)\b/iu.test(text);
}
export function normalizeScene(raw, candidates, n) {
  const scene = validateSegment(raw, candidates);
  const speechText=formatNarrationForSpeech(scene.text), mechanicallyFormatted=speechText!==scene.text;
  const citations = scene.citations;
  const groups = [...new Set(citations.map(c => c.publisherGroup).filter(Boolean))];
  const statistic = isNumeric(`${speechText} ${raw.screenText || ''}`);
  const result = { ...scene, n, claimId: `t${String(n).padStart(2, '0')}`, section: 'Mở đầu',
    targetUnits:Number.isFinite(raw.targetUnits)?Math.max(0,Math.min(raw.targetUnits,1000)):0,
    duplicateOf:Number.isInteger(raw.duplicateOf)?raw.duplicateOf:0,
    slideBullets:Array.isArray(raw.slideBullets) ? raw.slideBullets.map(item => String(item).trim()).filter(Boolean).slice(0, 5) : [],
    screenText: String(raw.screenText || '').slice(0, 300), visual: String(raw.visual || '').slice(0, 1000),
    style: ['ke','giang','nhe','hoi','nhan'].includes(raw.style) ? raw.style : 'giang',
    text:speechText,claimType: statistic ? 'statistic' : raw.claimType === 'example' ? 'example' : 'concept', independentGroups: groups,
    numericVerified: false, resolution: '', originalText: scene.text };
  if (mechanicallyFormatted&&result.status!=='NO_SOURCE') {
    result.status='NEEDS_VERIFY';result.reason='Đã mở rộng viết tắt cho lời đọc; cần đối chiếu nguồn và duyệt lại ý nghĩa.';
  }
  result.issues = sceneIssues(result);
  return result;
}
export function validateConflicts(raw, candidates) {
  return (Array.isArray(raw) ? raw : []).slice(0, 12).flatMap(item => {
    const checked = validateSegment({ ...item, text: String(item.description || ''), status: 'NEEDS_VERIFY' }, candidates);
    return checked.status !== 'NO_SOURCE' && new Set(checked.citations.map(c => c.sourceId)).size >= 2 ? [{ description: checked.text, citations: checked.citations }] : [];
  });
}
export function reviewScene(scene, input) {
  let result = reviewSegment(scene, input);
  if (input.action === 'edit') {
    result.duplicateOf = 0;
    result.screenText = required(input.screenText, 'Chữ trên màn hình', SCREEN_TEXT_MAX);
    result.visual = required(input.visual, 'Ý đồ hình', 1000);
    const bullets = Array.isArray(input.slideBullets) ? input.slideBullets : String(input.slideBullets || '').split(/\r?\n/u);
    result.slideBullets = bullets.map(item => String(item).trim()).filter(Boolean);
    if (result.slideBullets.length < 2 || result.slideBullets.length > 5 || result.slideBullets.some(item => item.length > 120)) throw new AppError('Nội dung slide cần từ hai đến năm dòng, mỗi dòng không quá một trăm hai mươi ký tự.');
    result.claimType = isNumeric(`${result.text} ${result.screenText}`) ? 'statistic' : scene.claimType === 'statistic' ? 'concept' : scene.claimType;
    result.numericVerified = false;
    result.issues = sceneIssues(result);
  }
  if (input.action === 'accept') {
    const statistic=isNumeric(`${result.text} ${result.screenText}`);
    if (!statistic && result.claimType === 'statistic') {
      result.claimType='concept';result.numericVerified=false;
      result.reason='Cần đối chiếu ý nghĩa, thuật ngữ và mọi khẳng định với nguồn trước khi chấp nhận.';
    }
    result.issues = sceneIssues(result);
    if (result.issues.length) throw new AppError(`Chưa thể chấp nhận: ${result.issues.join(' ')}`);
    if (scene.conflict && (!input.resolution || input.resolution.trim().length < 15)) throw new AppError('Cần ghi rõ cách xử lý mâu thuẫn trước khi chấp nhận.');
    result.resolution = String(input.resolution || '').slice(0, 1000);
  }
  return result;
}
export function invalidateSource(project, sourceId) {
  const affected = [];
  for (let i = 0; i < project.scenes.length; i++) {
    const scene = project.scenes[i];
    if (!scene.citations.some(c => c.sourceId === sourceId)) continue;
    affected.push(scene.n);
    project.scenes[i] = { ...scene, previousText: scene.text, previousCitations: scene.citations,
      text: '', citations: [], status: 'NO_SOURCE', decision: 'pending', humanVerified: false, numericVerified: false,
      reason: 'Nguồn đã bị loại. Câu này cần viết lại từ những nguồn còn được duyệt.', needsRepair: true };
  }
  project.teacherApproval = null;
  return affected;
}
export function ensureExportable(project) {
  if (project.sources.some(s => s.decision === 'pending')) throw new AppError('Duyệt hoặc bỏ các nguồn vừa bổ sung trước khi xuất.', 409);
  if (!project.scenes.length || project.scenes.some(s => s.decision === 'pending')) throw new AppError('Duyệt hoặc bỏ tất cả câu trước khi xuất.', 409);
  const kept = project.scenes.filter(s => s.decision === 'accepted');
  if (!kept.length) throw new AppError('Chưa có câu được duyệt.', 409);
  for (const s of kept) {
    if (s.status === 'NO_SOURCE' || !s.humanVerified || sceneIssues(s).length || !s.citations.length) throw new AppError('Còn câu thiếu kiểm chứng hoặc chưa đúng mẫu.', 409);
    for (const c of s.citations) {
      const source = project.sources.find(x => x.id === c.sourceId);
      const chunk = source?.chunks.find(x => x.id === c.chunkId);
      if (source?.decision !== 'approved' || !source.provenance.verified || !chunk || !normalize(chunk.text).includes(c.quote)) throw new AppError('Nguồn của câu không còn hợp lệ.', 409);
    }
  }
  return kept;
}
export function buildExports(project) {
  const kept = ensureExportable(project);
  if (!project.teacherApproval) throw new AppError('Cần giảng viên duyệt trước khi xuất kịch bản dùng để dựng video.', 409);
  const sectionNumber = section => ({'Mở đầu':1,'Nội dung chính':2,'Kết bài':3}[section] || 2);
  const sections = [{so:1,ten:'Mở đầu'},{so:2,ten:'Nội dung chính'},{so:3,ten:'Kết bài'}]
    .filter(section => kept.some(scene => sectionNumber(scene.section) === section.so));
  // UI reviews whole slides, but C3/C4 exchanges one spoken sentence per row.
  // Keep the shared, human-reviewed slide claim ID rather than inventing a
  // finer-grained automatic semantic verification for each split sentence.
  const lines=kept.flatMap(scene=>spokenSentences(scene.text).map(text=>({scene,text})));
  const script = { schema: 'hackathon-kich-ban/1', id: project.id, tieuDe: project.brief.topic, mucTieu: project.brief.goal,
    thoiLuongDuKienPhut: project.brief.duration, phamVi: 'Kịch bản toàn bài theo thời lượng dự kiến; từng cảnh cần được người viết duyệt.',
    thoiLuongLoiDocUocTinhGiay:Math.round(kept.reduce((sum,s)=>sum+s.text.split(/\s+/u).filter(Boolean).length,0)/2.9),
    phan: sections,
    cau: lines.map(({scene:s,text},i) => ({ n:i+1, slide:s.n, phan:sectionNumber(s.section), tieuDeSlide:s.title, noiDungSlide:s.slideBullets, kieu:s.style, loi:text, chuTrenManHinh:s.screenText, yDoHinh:s.visual, nguon:[s.claimId], phamViBangChung:'Nhóm bằng chứng của slide; người duyệt cần đối chiếu từng khẳng định.' })),
    giangVienDuyet: project.teacherApproval, cheDo: project.mode };
  const profile = { schema: 'hackathon-ho-so-nguon/1', chuDe: project.brief.topic, ngayChay: project.createdAt,
    cheDo: project.mode, nguon: project.sources.map(({ text, chunks, ...s }) => s),
    thongTin: kept.map(s => ({ id: s.claimId, noiDung: s.text, loai: s.claimType,
      bangChung: s.citations.map(c => ({ nguonId: c.sourceId, doanTrich: c.quote, viTri: c.locator, chunkId: c.chunkId })),
      trangThai: 'nguoi-duyet-da-doi-chieu', soNhomNguon: s.independentGroups.length, ghiChuMauThuan: s.resolution })),
    mauThuan: project.conflicts, loiThuThap: project.failures };
  const demo = project.mode === 'demo' ? '> DỮ LIỆU GIẢ ĐỂ THỬ LUỒNG — KHÔNG DÙNG LÀM TÀI LIỆU GIẢNG DẠY.\n\n' : '';
  const markdownSections = sections.map(section => `## ${section.so} · ${section.ten}\n\n${kept.filter(scene => sectionNumber(scene.section) === section.so).map(s => `### Slide ${s.n} · ${md(s.title)}\n- **Nội dung slide:**\n${s.slideBullets.map(item => `  - ${md(item)}`).join('\n')}\n- **Script nói:** ${md(s.text)}\n- **Thông điệp chính:** ${md(s.screenText)}\n- **Ý đồ hình:** ${md(s.visual)}\n- **Kiểu:** ${s.style}\n- **Nguồn:** [${s.claimId}] ${s.citations.map(c => `[${c.chunkId}]`).join(' ')}${s.resolution ? `\n- **Đối chiếu mâu thuẫn:** ${md(s.resolution)}` : ''}`).join('\n\n')}`).join('\n\n');
  const markdown = `${demo}# ${md(project.brief.topic)}\n\n- **Mục tiêu:** ${md(project.brief.goal)}\n- **Thời lượng dự kiến của video:** ${project.brief.duration} phút. Bản xuất này gồm toàn bộ các cảnh đã duyệt.\n- **Giọng đọc:** một người dẫn, tiếng Việt.\n- **Giảng viên duyệt:** ${md(project.teacherApproval.reviewer)} · ${project.teacherApproval.at}\n\n${markdownSections}\n\n## Hồ sơ bằng chứng\n\n${kept.map(s => `### ${s.claimId}\n${s.citations.map(c => `- ${md(c.title)} · ${md(c.publisher)} · ${md(c.locator)}${c.url ? ` · <${c.url}>` : ''}\n  > ${md(c.quote)}`).join('\n')}`).join('\n\n')}\n`;
  return { script, markdown, profile, trace: lines.map(({scene:s},i) => ({ sentence:i+1, slide:s.n, claim:s.claimId, evidenceScope:'human-reviewed-slide', citations:s.citations.map(c => ({source:c.sourceId,chunk:c.chunkId})),status:s.status,reviewedAt:s.reviewedAt })), audit:project.audit };
}
export function extractDraft(candidates) {
  if (!candidates.length) return [noSource('Không tìm thấy đoạn phù hợp trong nguồn đã xác minh. Hãy thêm nguồn hoặc làm rõ chủ đề.')];
  return candidates.slice(0, 5).map((c, i) => validateSegment({ title: `Trích đoạn ${i + 1} · ${c.title}`, text: c.text,
    status: 'CITED', citations: [{ chunkId: c.id, quote: c.text }] }, candidates));
}
export function reviewSegment(segment, input) {
  if (!['accept', 'reject', 'edit', 'reset'].includes(input.action)) throw new AppError('Thao tác duyệt không hợp lệ.');
  if (input.action === 'edit') {
    const text = required(input.text, 'Nội dung sửa', 6000);
    return { ...segment, text, status: segment.citations.length ? 'NEEDS_VERIFY' : 'NO_SOURCE', reason: 'Nội dung đã sửa; cần đối chiếu nguồn lại.', decision: 'pending', humanVerified: false };
  }
  if (input.action === 'reset') return { ...segment, decision: 'pending', humanVerified: false };
  if (input.action === 'reject') return { ...segment, decision: 'rejected', humanVerified: false };
  if (segment.status === 'NO_SOURCE' || !segment.citations.length) throw new AppError('Đoạn không có nguồn không thể chấp nhận. Hãy thêm nguồn và tạo lại.');
  if (input.verified !== true) throw new AppError('Cần xác nhận đã đọc nguồn và kiểm tra toàn bộ nội dung.');
  return { ...segment, decision: 'accepted', humanVerified: true, reviewedAt: new Date().toISOString() };
}
const md = text => String(text).replace(/[\\`*_{}\[\]<>#|]/g, '\\$&');
export function exportMarkdown(draft, sources) {
  if (draft.segments.some(s => s.decision === 'pending')) throw new AppError('Duyệt hoặc bỏ tất cả các đoạn trước khi xuất.', 409);
  const accepted = draft.segments.filter(s => s.decision === 'accepted');
  if (!accepted.length) throw new AppError('Cần ít nhất một đoạn được chấp nhận.', 409);
  for (const s of accepted) {
    if (!s.humanVerified || s.status === 'NO_SOURCE' || !s.citations.length) throw new AppError('Còn nội dung chưa được kiểm chứng.', 409);
    for (const c of s.citations) {
      const source = sources.find(x => x.id === c.sourceId);
      const chunk = source?.chunks.find(x => x.id === c.chunkId);
      if (!source?.provenance.verified || !chunk || !normalize(chunk.text).includes(c.quote)) throw new AppError('Nguồn đã thay đổi hoặc không còn hợp lệ.', 409);
    }
  }
  const refs = [...new Map(accepted.flatMap(s => s.citations).map(c => [c.chunkId, c])).values()];
  return `# ${md(draft.topic)}\n\n> Bản do người viết duyệt • ${draft.mode === 'ai' ? 'Có AI hỗ trợ' : 'Trích xuất tại máy, không dùng AI'}\n> Người đọc: ${md(draft.audience)} • Thời lượng yêu cầu: ${draft.duration} phút (không phải thời lượng đã đo)\n\n${accepted.map(s => `## ${md(s.title)}\n\n${md(s.text)} ${s.citations.map(c => `[${c.chunkId}]`).join(' ')}\n\n_Đã được người viết đối chiếu nguồn._`).join('\n\n')}\n\n## Nguồn đối chiếu\n\n${refs.map(c => {
    const source = sources.find(s => s.id === c.sourceId);
    return `- [${c.chunkId}] ${md(c.title)} — ${md(c.publisher)}; ${md(c.sourceLocator)}, ${md(c.locator)}. ${c.url ? `<${c.url}>` : 'Tài liệu nội bộ do người dùng xác nhận.'}\n  - Trích nguyên văn: ${md(c.quote)}\n  - SHA-256 bản lưu: ${source.hash}\n  - Quyền sử dụng: ${md(source.rights)}`;
  }).join('\n')}\n\n---\nMã bản nháp: ${draft.id} • Tạo: ${draft.createdAt}\n`;
}
