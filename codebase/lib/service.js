import { randomUUID } from 'node:crypto';
import { readFile, mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { AppError, required, normalize, tokens, topicTerms, topicRelevance, retrieve, normalizeScene, noSource, scopeCheck, validateConflicts, invalidateSource, reviewScene, ensureExportable, digest, sceneIssues, formatNarrationForSpeech } from './core.js';
import { readSource, parsePage } from './web.js';
import { AI } from './ai.js';
import { detailedLessonPlan, narrationUnits, teachingIssues, duplicateNarration } from './lesson.js';
import { sourcePolicy, researchTopic, prefersInternational } from './source-policy.js';

export function potentialConflicts(sources) {
  const result = [];
  for (let i = 0; i < sources.length; i++) for (let j = i + 1; j < sources.length; j++) {
    if (sources[i].decision === 'quarantined' || sources[j].decision === 'quarantined') continue;
    for (const a of sources[i].chunks.slice(0, 50)) for (const b of sources[j].chunks.slice(0, 50)) {
      const av = a.text.match(/\d+(?:[.,]\d+)?\s*%/g), bv = b.text.match(/\d+(?:[.,]\d+)?\s*%/g);
      if (!av || !bv || av.join() === bv.join()) continue;
      const at = tokens(a.text.replace(/[\d%.,]/g, '')), bt = tokens(b.text.replace(/[\d%.,]/g, ''));
      if (at.length < 4 || at.filter(t => bt.includes(t)).length / Math.max(at.length, bt.length) < 0.65) continue;
      result.push({ description: `Cần đối chiếu: hai đoạn tương tự nêu ${av.join(', ')} và ${bv.join(', ')}. Có thể khác phạm vi hoặc mốc đo; chưa kết luận bên nào đúng.`,
        citations: [a, b].map((c, idx) => ({ sourceId: sources[idx ? j : i].id, chunkId: c.id, quote: c.text, locator: c.locator })) });
    }
  }
  return result.slice(0, 10);
}

// The opening DOM nodes of a page are often navigation, a title, or a call to
// action. They are poor evidence even when the page itself was approved. Rank
// chunks by the actual brief terms and require a minimally substantive passage
// before it is sent to the writer.
const genericGoalTerms = new Set('học người dùng thể tự hoàn thiện video sau mình cần được biết hiểu'.split(' '));
const relatedTerm = (term, word) => term === word || (
  /^[a-z]+$/u.test(term) && /^[a-z]+$/u.test(word) &&
  Math.min(term.length, word.length) >= 5 && Math.abs(term.length - word.length) <= 4 &&
  (term.startsWith(word) || word.startsWith(term))
);
function evidenceTerms(brief) {
  return [...new Set([...topicTerms(brief.topic), ...topicTerms(researchTopic(brief)), ...topicTerms(brief.goal).filter(term => !genericGoalTerms.has(term))])];
}
function evidenceCandidate(source, chunk, terms) {
  const text = normalize(chunk.text);
  const words = tokens(text);
  const matched = terms.filter(term => words.some(word => relatedTerm(term, word)));
  const punctuation = (text.match(/[.!?;:]/gu) || []).length;
  // Short definitions can be good evidence too, but only if they contain at
  // least two subject terms and read like a complete sentence. This still
  // excludes headings and bare calls to action.
  const substantive = (text.length >= 90 && (punctuation > 0 || words.length >= 16)) ||
    (text.length >= 50 && punctuation > 0 && matched.length >= 2);
  // A CTA may appear alongside useful curriculum text, so it is only a small
  // penalty; it never turns marketing copy into evidence by itself.
  const promotional = /đăng ký|ưu đãi|học phí|liên hệ|khuyến mãi|mua ngay/iu.test(text);
  const quality = matched.length * 40 + Math.min(text.length, 1000) / 25 + Math.min(punctuation, 4) * 3 - (promotional ? 8 : 0);
  return { ...chunk, sourceId:source.id, title:source.title, publisher:source.publisher, publisherGroup:source.publisherGroup,
    date:source.updatedAt || source.publishedAt, warnings:source.warnings || [], url:source.url, sourceLocator:source.locator,
    matched, quality, substantive, eligible:substantive && matched.length > 0 };
}
export function lessonPlan(duration) {
  return detailedLessonPlan(duration);
}
function lessonSection(n, total) {
  const opening = Math.max(1, Math.ceil(total * 0.15));
  const ending = Math.max(1, Math.ceil(total * 0.15));
  if (n <= opening) return 'Mở đầu';
  if (n > total - ending) return 'Kết bài';
  return 'Nội dung chính';
}
export class Store {
  constructor(directory) { this.directory = directory; this.projects = []; this.queue = Promise.resolve(); }
  async init() {
    await mkdir(this.directory, { recursive: true });
    try {
      this.projects = JSON.parse(await readFile(path.join(this.directory, 'projects.json'), 'utf8'));
      for (const project of this.projects) {
        for (const scene of project.scenes || []) scene.issues = sceneIssues(scene);
        if (project.mode==='live' && prefersInternational(project.brief)) for (const source of project.sources) source.contentPolicy=sourcePolicy(source.url,source.title,source.language);
      }
    }
    catch (e) { if (e.code !== 'ENOENT') throw new Error('Kho dữ liệu không đọc được; không tự ghi đè. Hãy kiểm tra codebase/data/projects.json.'); }
  }
  save() {
    const contents = JSON.stringify(this.projects, null, 2);
    const operation = this.queue.then(async () => {
      const file = path.join(this.directory, 'projects.json');
      await writeFile(`${file}.tmp`, contents, { mode: 0o600 }); await rename(`${file}.tmp`, file);
    });
    this.queue = operation.catch(() => {});
    return operation;
  }
  get(id) { const p = this.projects.find(p => p.id === id); if (!p) throw new AppError('Không tìm thấy dự án.', 404); return p; }
}
export class Studio {
  constructor(store, { ai = new AI(), reader = readSource } = {}) { this.store = store; this.ai = ai; this.reader = reader; }
  audit(p, event, detail = {}) { p.audit.push({ at: new Date().toISOString(), event, ...detail }); p.updatedAt = new Date().toISOString(); }
  async create(input) {
    if (this.store.projects.length >= 30) throw new AppError('Đã có 30 dự án. Xuất và xóa dự án không dùng trước khi tạo mới.');
    const brief = { topic: required(input.topic, 'Chủ đề', 300), goal: required(input.goal, 'Mục tiêu học tập', 700),
      audience: required(input.audience, 'Người học', 200), duration: Number(input.duration) };
    if (!Number.isFinite(brief.duration) || brief.duration < 1 || brief.duration > 30) throw new AppError('Thời lượng cần từ một đến ba mươi phút.');
    if (brief.topic.length < 8 || tokens(brief.topic).length < 2) throw new AppError('Chủ đề còn rộng; hãy nêu rõ khái niệm và điều cần giải thích.');
    const refusal = scopeCheck(`${brief.topic} ${brief.goal}`); if (refusal) throw new AppError(refusal, 422);
    const p = { id: randomUUID(), brief, mode: input.mode === 'demo' ? 'demo' : 'live',
      sources: [], scenes: [], conflicts: [], failures: [], audit: [], createdAt: new Date().toISOString(), teacherApproval: null };
    this.audit(p, 'project.created', { mode: p.mode }); this.store.projects.unshift(p); await this.store.save(); return p;
  }
  async research(p) {
    if (p.mode === 'demo') {
      for (const name of ['concepts', 'review', 'injection']) await this.addFixture(p, name);
      this.audit(p, 'demo.loaded', { note: 'Dữ liệu giả, không gọi AI và không tìm web.' });
    } else {
      const urls = await this.ai.research(p.brief, detail => this.audit(p, detail.event, detail));
      const existing=new Set(p.sources.map(source=>source.url));
      const newURLs=urls.filter(url=>!existing.has(url)).slice(0, Math.max(0, 12 - p.sources.length));
      this.audit(p, 'search.completed', { count: urls.length, newCount: newURLs.length });
      // Small sequential crawl to avoid hammering publishers.
      for (const url of newURLs) {
        try { await this.addURL(p, url, { discovered: true }); }
        catch (e) {
          const reason=e instanceof AppError?e.message:'Không kết nối được nguồn.';
          if (!p.failures.some(f=>f.url===url&&f.reason===reason)) p.failures.push({ url, reason });
        }
      }
    }
    p.conflicts = potentialConflicts(p.sources);
    await this.store.save(); return p;
  }
  async addFixture(p, name) {
    if (p.mode !== 'demo' || !['concepts','review','injection','conflict-a','conflict-b','outdated'].includes(name)) throw new AppError('Bộ thử chỉ dùng trong dự án minh họa.');
    if (p.sources.some(s => s.fixture === name)) return;
    const html = await readFile(new URL(`../fixtures/${name}.html`, import.meta.url), 'utf8');
    const s = parsePage(html, `https://${name}.fixture.test/`, p.brief);
    s.fixture = name; s.provenance.type = 'synthetic'; s.knownPublisher = true;
    s.warnings.unshift('DỮ LIỆU GIẢ do nhóm tự viết, không phải nguồn giảng dạy.');
    p.sources.push(s);
    this.audit(p, 'fixture.loaded', { sourceId: s.id, fixture: name });
  }
  async hardCases(p) {
    for (const name of ['conflict-a','conflict-b','outdated']) await this.addFixture(p, name);
    p.conflicts = potentialConflicts(p.sources); this.applyConflicts(p); p.teacherApproval = null;
    await this.store.save(); return p;
  }
  async addURL(p, url, { discovered = false } = {}) {
    if (p.mode !== 'live') throw new AppError('Tạo dự án thật để nhập URL. Bộ thử luôn tách biệt khỏi nguồn thật.');
    if (p.sources.length >= 12) throw new AppError('Tối đa mười hai nguồn cho một dự án.');
    if (p.sources.some(s => s.url === url)) throw new AppError('Nguồn này đã có trong hồ sơ.');
    const source = await this.reader(required(url, 'URL', 2000), p.brief);
    // Recompute from the stored page text here as well, so custom readers cannot
    // accidentally omit or weaken the discovery relevance gate.
    source.topicRelevance = topicRelevance(`${source.title} ${source.text}`, p.brief.topic);
    const international = prefersInternational(p.brief);
    if (international) source.contentPolicy = sourcePolicy(source.url, source.title, source.language);
    if (international) source.topicRelevance = topicRelevance(`${source.title} ${source.text}`, researchTopic(p.brief));
    if (discovered && international && !source.contentPolicy.eligible) throw new AppError('Trang không phải học liệu chính thức/quốc tế phù hợp chính sách đã chọn; không dùng trang tìm kiếm hoặc quảng cáo khóa học làm bằng chứng.');
    if (discovered && (international ? !source.topicRelevance.matched.length : !source.knownPublisher && !source.topicRelevance?.passed)) {
      throw new AppError('Trang đọc được nhưng không khớp đủ từ khóa cốt lõi của chủ đề; đã loại tự động.');
    }
    if (p.sources.some(s => s.url === source.url || s.hash === source.hash)) throw new AppError('Nguồn trùng URL hoặc nội dung với bản đã lưu; không tính là nguồn độc lập.');
    p.sources.push(source); p.conflicts = potentialConflicts(p.sources); this.applyConflicts(p); p.teacherApproval = null;
    this.audit(p, 'source.fetched', { sourceId: source.id, url: source.url, hash: source.hash });
    await this.store.save(); return p;
  }
  async recheckSource(p, id) {
    if (p.mode !== 'live') throw new AppError('Bộ thử minh họa không tải lại nguồn web.');
    const index=p.sources.findIndex(source=>source.id===id);
    if (index<0) throw new AppError('Không tìm thấy nguồn.',404);
    const previous=p.sources[index];
    if (previous.decision!=='quarantined') throw new AppError('Chỉ nguồn đang cách ly mới cần kiểm tra lại.');
    // Re-fetch rather than trusting the old saved decision: its raw HTML may
    // have changed and older projects used a broader injection detector.
    const refreshed=await this.reader(previous.url,p.brief);
    refreshed.id=previous.id;
    refreshed.chunks=refreshed.chunks.map((chunk,i)=>({...chunk,id:`${previous.id}-${String(i+1).padStart(3,'0')}`}));
    refreshed.topicRelevance=topicRelevance(`${refreshed.title} ${refreshed.text}`,p.brief.topic);
    if (prefersInternational(p.brief)) {
      refreshed.contentPolicy=sourcePolicy(refreshed.url,refreshed.title,refreshed.language);
      refreshed.topicRelevance=topicRelevance(`${refreshed.title} ${refreshed.text}`,researchTopic(p.brief));
    }
    p.sources[index]=refreshed;p.conflicts=potentialConflicts(p.sources);this.applyConflicts(p);p.teacherApproval=null;
    this.audit(p,'source.rechecked',{sourceId:id,url:refreshed.url,decision:refreshed.decision});
    await this.store.save();return p;
  }
  async decideSource(p, id, input) {
    const source = p.sources.find(s => s.id === id); if (!source) throw new AppError('Không tìm thấy nguồn.', 404);
    if (!['approve','reject'].includes(input.action)) throw new AppError('Thao tác nguồn không hợp lệ.');
    if (input.action === 'approve') {
      if (!source.provenance.verified || source.decision === 'quarantined') throw new AppError('Nguồn bị cách ly hoặc chưa đọc được; không thể dùng.');
      if (input.verified !== true) throw new AppError('Cần xác nhận đã kiểm tra uy tín, độ mới và quyền sử dụng.');
      if ((!source.knownPublisher || ['old','unknown','invalid-date'].includes(source.freshness)) && (!input.note || input.note.trim().length < 15)) throw new AppError('Nguồn cần xem xét: hãy ghi lý do chấp nhận về uy tín/độ mới.');
      source.decision = 'approved'; source.reviewNote = String(input.note || '').slice(0, 1000);
      this.audit(p, 'source.approved', { sourceId: id, note: source.reviewNote });
    } else {
      source.decision = 'rejected';
      const affected = invalidateSource(p, id);
      this.audit(p, 'source.rejected', { sourceId: id, affectedSentences: affected });
    }
    p.teacherApproval = null; await this.store.save(); return p;
  }
  async approveAllSources(p, input) {
    if (input.confirmed!==true) throw new AppError('Cần xác nhận đã kiểm tra từng nguồn trước khi duyệt hàng loạt.');
    const note=String(input.note||'').trim().slice(0,1000), approved=[], skipped=[];
    for (const source of p.sources.filter(source=>source.decision==='pending')) {
      const canApprove=source.provenance?.verified&&source.contentPolicy?.eligible!==false;
      const needsNote=!source.knownPublisher||['old','unknown','invalid-date'].includes(source.freshness);
      if (!canApprove) { skipped.push({sourceId:source.id,reason:'chưa đủ điều kiện an toàn'});continue; }
      if (needsNote&&note.length<15) { skipped.push({sourceId:source.id,reason:'cần ghi chú về uy tín hoặc độ mới'});continue; }
      source.decision='approved';source.reviewNote=note;approved.push(source.id);
    }
    if(!approved.length) throw new AppError('Không có nguồn nào đủ điều kiện để duyệt hàng loạt. Nguồn thiếu metadata cần ghi chú ít nhất 15 ký tự.');
    p.teacherApproval=null;this.audit(p,'source.approved_all',{sourceIds:approved,skipped});await this.store.save();return p;
  }
  candidates(p) {
    const sources = p.sources.filter(s => s.decision === 'approved' && s.provenance?.verified &&
      (p.mode === 'demo' || !prefersInternational(p.brief) || sourcePolicy(s.url,s.title,s.language).eligible));
    const terms = evidenceTerms(p.brief);
    const ranked = sources.flatMap(source => source.chunks.map(chunk => evidenceCandidate(source, chunk, terms)))
      .filter(candidate => candidate.eligible)
      .sort((a,b) => b.quality - a.quality);
    // Keep a small amount of source diversity, but only when that source has a
    // passage that actually bears on the brief. Never add the first page title
    // merely because it happens to be in an approved source.
    const coverage = sources.flatMap(source => ranked.filter(candidate => candidate.sourceId === source.id).slice(0, 3));
    const lexical = retrieve(sources, `${p.brief.topic} ${p.brief.goal}`, 12)
      .map(chunk => evidenceCandidate(sources.find(source => source.id === chunk.sourceId), chunk, terms))
      .filter(candidate => candidate.eligible)
      .sort((a,b) => b.quality - a.quality);
    // Include neighbouring paragraphs: explanations and worked examples often
    // refer back to the topic without repeating its keywords.
    const contextual = ranked.slice(0,16).flatMap(candidate => {
      const source=sources.find(s=>s.id===candidate.sourceId), index=source.chunks.findIndex(c=>c.id===candidate.id);
      return source.chunks.slice(Math.max(0,index-1),index+3).map(chunk=>evidenceCandidate(source,chunk,terms)).filter(c=>c.substantive);
    });
    return [...new Map([...coverage, ...contextual, ...ranked, ...lexical].map(candidate => [candidate.id,candidate])).values()].slice(0, 40);
  }
  demoScenes(p, candidates) {
    const approved = new Set(p.sources.filter(s => s.decision === 'approved').map(s => s.id));
    const pool = p.sources.filter(s => ['concepts','review'].includes(s.fixture) && approved.has(s.id)).flatMap(s => s.chunks.filter(c => !c.text.includes('dữ liệu giả')).map(c => ({ ...c, sourceId:s.id, publisher:s.publisher, title:s.title, publisherGroup:s.publisherGroup, url:s.url })));
    const selected = pool.slice(0,5);
    return { candidates: selected, scenes: selected.map((c, i) => ({ title: `Ý ${i + 1}`, slideBullets:['Ý chính có trong lời giảng','Bằng chứng được mở để đối chiếu'], text: c.text, screenText: ['Học từ dữ liệu','Dữ liệu và cách đánh giá','Đối chiếu tài liệu gốc','Kiểm tra từng khẳng định','Chưa đủ nguồn thì bổ sung'][i % 5],
      visual: 'Hiện thẻ nội dung cùng nhãn MINH HỌA; làm sáng phần đang được giải thích.',
      style: i % 2 ? 'giang' : 'ke', claimType: 'concept', status: 'CITED', citations: [{ chunkId: c.id, quote: c.text }] })) };
  }
  applyConflicts(p) {
    for (const s of p.scenes) {
      const matching = p.conflicts.filter(c => c.citations.some(a => s.citations.some(b => a.chunkId === b.chunkId)));
      if (matching.length) { s.conflict = matching.map(c => c.description).join(' '); s.status = 'NEEDS_VERIFY'; s.decision = 'pending'; s.humanVerified = false; }
    }
  }
  async createDraft(p, event) {
    try {
    if (p.sources.some(s => s.decision === 'pending')) throw new AppError('Duyệt hoặc loại tất cả nguồn trước khi viết.');
    let candidates = this.candidates(p);
    const plan = lessonPlan(p.brief.duration);
    let rawScenes = [], rawConflicts = [], outline = null;
    if (p.mode === 'demo') {
      const demo = this.demoScenes(p, candidates); candidates = demo.candidates; rawScenes = demo.scenes; rawConflicts = demo.conflicts;
    } else if (candidates.length) {
      outline = await this.ai.outline(p.brief,candidates,plan,d=>this.audit(p,d.event,d));
      for (let start = 0; start < plan.sceneCount; start += plan.batchSize) {
        const count = Math.min(plan.batchSize, plan.sceneCount - start);
        const slide = outline.slides[start];
        const slideEvidence = candidates.filter(c=>slide.evidenceIds.includes(c.id));
        if (!slideEvidence.length) {
          rawScenes.push({...noSource('Dàn bài thiếu học liệu cho nội dung này; cần thêm nguồn chuyên sâu.',slide.title),section:slide.section,screenText:'Cần thêm nguồn',visual:'',style:'giang'});
          continue;
        }
        const request = {
          plan:{ start:start + 1, count, total:plan.sceneCount, targetWords:plan.targetWords, targetUnitsPerScene:plan.targetUnitsPerScene },
          outline:outline.slides.map(({title,section,teachingGoal})=>({title,section,teachingGoal})),slide,
          priorTitles:rawScenes.map(scene => scene.title).slice(-36)
        };
        let raw = await this.ai.draft(p.brief, slideEvidence, d => this.audit(p, d.event, d), request);
        const assess = scene => ({...scene,duplicateOf:duplicateNarration(scene.text,rawScenes.map(s=>s.text))+1});
        const feedback = raw.scenes.flatMap(scene=>teachingIssues(assess(scene),plan.targetUnitsPerScene));
        if (feedback.length) {
          this.audit(p,'script.depth_retry',{slide:start+1,issues:feedback});
          raw = await this.ai.draft(p.brief,slideEvidence,d=>this.audit(p,d.event,d),{...request,feedback});
        }
        rawConflicts.push(...raw.conflicts);
        if (!raw.scenes.length) {
          rawScenes.push({ ...noSource('Không có đủ bằng chứng để viết phần này của bài học.',slide.title),section:slide.section, screenText:'Cần thêm nguồn', visual:'', style:'giang' });
          continue;
        }
        rawScenes.push(...raw.scenes.map(scene=>({...assess(scene),section:slide.section,targetUnits:plan.targetUnitsPerScene})));
      }
    }
    p.scenes = rawScenes.length ? rawScenes.map((scene,i) => normalizeScene(scene, candidates, i + 1)) : [{ ...normalizeScene({ ...noSource('Không đủ đoạn học liệu liên quan từ nguồn được duyệt. Với chủ đề AI, cần tài liệu chính thức/quốc tế; trang bán khóa học và mục lục không dùng làm căn cứ.'), screenText:'Chưa đủ nguồn',visual:'', style:'giang' }, [], 1) }];
    p.scenes.forEach((scene,i) => { scene.section = rawScenes[i]?.section || lessonSection(scene.n, p.scenes.length); });
    const actualUnits = p.scenes.reduce((sum,scene)=>sum+narrationUnits(scene.text),0);
    p.scriptPlan = { ...plan, completedScenes:p.scenes.filter(s=>s.status!=='NO_SOURCE').length, actualUnits, estimatedSeconds:Math.round(actualUnits/2.9),
      complete:p.mode!=='demo' && actualUnits>=plan.targetWords*.85 && p.scenes.length===plan.sceneCount && p.scenes.every(s=>s.status!=='NO_SOURCE' && !s.issues.length),
      missingEvidence:outline?.missingEvidence || [], outline:outline?.slides || [], createdAt:new Date().toISOString() };
    p.conflicts = [...p.conflicts, ...validateConflicts(rawConflicts, candidates)];
    this.applyConflicts(p); p.teacherApproval = null;
    this.audit(p, event, { sentences: p.scenes.length, plannedSentences:plan.sceneCount, mode: p.mode, evidenceCount: candidates.length }); await this.store.save(); return p;
    } catch (error) {
      // Do not persist raw model text: it may include untrusted source content.
      // The existing script remains untouched because assignment happens only
      // after all outline/scene calls have completed.
      this.audit(p,'script.failed',{reason:error instanceof AppError?error.message:'Không xử lý được đầu ra model.'});
      await this.store.save();throw error;
    }
  }
  async generate(p) {
    if (p.scenes.length) throw new AppError('Đã có bản nháp. Sửa câu hoặc viết lại những câu bị ảnh hưởng để giữ quyết định duyệt.');
    return this.createDraft(p, 'script.created');
  }
  async regenerate(p) {
    const noHumanDecision = p.scenes.length && p.scenes.every(scene => scene.decision === 'pending');
    if (!noHumanDecision) throw new AppError('Chỉ có thể viết lại toàn bài khi chưa có câu nào được người dùng duyệt hoặc loại. Kịch bản đã có quyết định cần được sửa riêng để giữ lịch sử.');
    return this.createDraft(p, 'script.regenerated');
  }
  async repair(p) {
    const affected = p.scenes.filter(s => s.needsRepair);
    if (!affected.length) throw new AppError('Không có câu nào cần viết lại do thay đổi nguồn.');
    const candidates = this.candidates(p);
    const replacements = [];
    for (const old of affected) {
      let result;
      if (p.mode === 'demo' || !candidates.length) {
        // The offline demo refuses unsupported replacements instead of faking an AI call.
        result = normalizeScene({ ...noSource('Không có bằng chứng thay thế đã xác minh; hãy thêm nguồn hoặc bỏ câu.'), screenText:old.screenText, visual:old.visual, style:old.style }, [], old.n);
      } else {
        const raw = await this.ai.draft(p.brief, candidates, d => this.audit(p, d.event, d), { sentence:old.n, intent:old.title, previousText:old.previousText, plan:{count:1,start:old.n,total:p.scenes.length,targetUnitsPerScene:old.targetUnits || 150} });
        result = normalizeScene({...raw.scenes[0] || noSource('Không có câu thay thế.'),targetUnits:old.targetUnits}, candidates, old.n);
        p.conflicts.push(...validateConflicts(raw.conflicts, candidates));
      }
      replacements.push({ ...result, id: old.id, section:old.section, needsRepair: false });
    }
    for (const replacement of replacements) p.scenes[p.scenes.findIndex(s => s.id === replacement.id)] = replacement;
    // Only changed sentences are rechecked; unrelated content and review decisions stay identical.
    for (const s of replacements) {
      const conflicts = p.conflicts.filter(c => c.citations.some(a => s.citations.some(b => a.chunkId === b.chunkId)));
      if (conflicts.length) { s.conflict = conflicts.map(c => c.description).join(' '); s.status = 'NEEDS_VERIFY'; }
    }
    p.teacherApproval = null; this.audit(p, 'script.repaired', { affectedSentences: affected.map(s => s.n) }); await this.store.save(); return p;
  }
  async review(p, id, input) {
    const i = p.scenes.findIndex(s => s.id === id); if (i < 0) throw new AppError('Không tìm thấy câu.', 404);
    const before = p.scenes[i]; p.scenes[i] = reviewScene(before, input); p.teacherApproval = null;
    if (input.action==='edit') {
      const others=p.scenes.filter(s=>s.id!==id && s.decision!=='rejected');
      const duplicate=duplicateNarration(p.scenes[i].text,others.map(s=>s.text));
      p.scenes[i].duplicateOf=duplicate>=0?others[duplicate].n:0;
      p.scenes[i].issues=sceneIssues(p.scenes[i]);
    }
    this.audit(p, `sentence.${input.action}`, { sentence: before.n, beforeHash: digest(before.text), afterHash: digest(p.scenes[i].text), resolution: p.scenes[i].resolution });
    await this.store.save(); return p;
  }
  async approveAllScenes(p, input) {
    if(input.confirmed!==true) throw new AppError('Cần xác nhận đã đọc bằng chứng của các cảnh trước khi chấp nhận hàng loạt.');
    const approved=[],skipped=[];
    for(let index=0;index<p.scenes.length;index++) {
      const scene=p.scenes[index];if(scene.decision!=='pending')continue;
      try {
        p.scenes[index]=reviewScene(scene,{action:'accept',verified:true,independent:true,resolution:input.resolution||''});
        approved.push(scene.n);
      } catch(error) { skipped.push({sentence:scene.n,reason:error instanceof AppError?error.message:'không đủ điều kiện'}); }
    }
    if(!approved.length) throw new AppError('Không có cảnh nào đủ điều kiện để chấp nhận hàng loạt. Hãy xử lý các lỗi mẫu, số liệu hoặc mâu thuẫn trước.');
    p.teacherApproval=null;this.audit(p,'sentence.accept_all',{sentences:approved,skipped});await this.store.save();return p;
  }
  async attachEvidence(p, id, input) {
    const scene=p.scenes.find(scene=>scene.id===id);if(!scene) throw new AppError('Không tìm thấy câu.',404);
    if (scene.status==='NO_SOURCE' || !scene.text) throw new AppError('Cảnh chưa có nội dung để gắn dẫn chứng. Hãy viết lại cảnh trước.');
    const ids=[...new Set(Array.isArray(input.chunkIds)?input.chunkIds.filter(id=>typeof id==='string'):[])].slice(0,8);
    if (!ids.length) throw new AppError('Hãy chọn ít nhất một đoạn bằng chứng.');
    const approved=p.sources.filter(source=>source.decision==='approved'&&source.provenance?.verified&&
      (p.mode==='demo'||!prefersInternational(p.brief)||sourcePolicy(source.url,source.title,source.language).eligible));
    const additions=[];
    for (const id of ids) {
      const source=approved.find(source=>source.chunks.some(chunk=>chunk.id===id));
      const chunk=source?.chunks.find(chunk=>chunk.id===id);
      if (!source||!chunk||normalize(chunk.text).length<12) throw new AppError('Đoạn được chọn không thuộc nguồn đã duyệt hoặc quá ngắn.');
      additions.push({chunkId:chunk.id,sourceId:source.id,quote:normalize(chunk.text),publisherGroup:source.publisherGroup,
        locator:chunk.locator,title:source.title,publisher:source.publisher,url:source.url,sourceLocator:source.locator});
    }
    const existing=scene.citations||[], merged=[...new Map([...existing,...additions].map(citation=>[citation.chunkId,citation])).values()];
    if (merged.length>8) throw new AppError('Một cảnh chỉ nhận tối đa tám trích đoạn; hãy chọn phần trực tiếp nhất.');
    const beforeGroups=new Set(existing.map(citation=>citation.publisherGroup));
    if (scene.claimType==='statistic'&&!additions.some(citation=>!beforeGroups.has(citation.publisherGroup))) throw new AppError('Với số liệu, hãy chọn đoạn từ tổ chức độc lập thay vì lặp lại nguồn đang có.');
    scene.citations=merged;scene.independentGroups=[...new Set(merged.map(citation=>citation.publisherGroup).filter(Boolean))];
    scene.status='NEEDS_VERIFY';scene.decision='pending';scene.humanVerified=false;scene.numericVerified=false;
    scene.reason='Đã bổ sung dẫn chứng; hãy đối chiếu ý nghĩa, phạm vi đo và xác nhận lại trước khi chấp nhận.';
    scene.issues=sceneIssues(scene);p.teacherApproval=null;
    this.audit(p,'sentence.evidence_attached',{sentence:scene.n,chunkIds:additions.map(citation=>citation.chunkId),sourceIds:[...new Set(additions.map(citation=>citation.sourceId))]});
    await this.store.save();return p;
  }
  async formatNarration(p) {
    let changed=0;
    for (const scene of p.scenes) {
      if (scene.decision!=='pending'||!scene.text) continue;
      const text=formatNarrationForSpeech(scene.text);if(text===scene.text) continue;
      scene.text=text;scene.status='NEEDS_VERIFY';scene.humanVerified=false;scene.numericVerified=false;
      scene.reason='Đã chuẩn hóa chữ số và viết tắt cho lời đọc; cần đối chiếu nguồn và duyệt lại ý nghĩa.';
      scene.issues=sceneIssues(scene);changed++;
    }
    if (!changed) throw new AppError('Không có cảnh chờ duyệt nào cần chuẩn hóa chữ số hoặc viết tắt.');
    p.teacherApproval=null;this.audit(p,'script.format_normalized',{scenes:changed});await this.store.save();return p;
  }
  async approveTeacher(p, input) {
    ensureExportable(p);
    if (input.confirmed !== true) throw new AppError('Giảng viên cần xác nhận duyệt bản cuối.');
    p.teacherApproval = { reviewer: required(input.reviewer, 'Mã giảng viên duyệt', 80), at: new Date().toISOString(), role: 'teacher', attestation: 'Tự khai tại máy; không xác thực danh tính qua tài khoản.' };
    this.audit(p, 'teacher.approved', { reviewer: p.teacherApproval.reviewer }); await this.store.save(); return p;
  }
}
