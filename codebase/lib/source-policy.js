// Recognition is a discovery preference, never an automatic credibility verdict.
export const internationalDomains = [
  'docs.anthropic.com', 'platform.claude.com', 'developers.openai.com', 'platform.openai.com',
  'ai.google.dev', 'developers.google.com', 'research.google', 'deepmind.google',
  'huggingface.co', 'pytorch.org', 'tensorflow.org', 'learn.microsoft.com',
  'arxiv.org', 'aclanthology.org', 'jmlr.org', 'proceedings.mlr.press',
  'papers.nips.cc', 'openreview.net', 'ocw.mit.edu', 'cs.stanford.edu',
  'cs.cmu.edu', 'berkeley.edu', 'nist.gov'
];
const domainMatches = (host, root) => host === root || host.endsWith(`.${root}`);
export function sourcePolicy(value, title = '', language = '') {
  let url; try { url = new URL(value); } catch { return { eligible:false, kind:'invalid', priority:0 }; }
  const host = url.hostname.toLowerCase();
  const local = domainMatches(host, 'vn') || /^vi(?:-|$)/iu.test(language);
  const listing = domainMatches(host, 'scholar.google.com') || /\/(?:search|pricing|careers|jobs)(?:\/|$)/iu.test(url.pathname);
  const marketplace = ['udemy.com','coursera.org','edx.org'].some(d => domainMatches(host,d));
  const marketing = /khóa học|khoa hoc|đăng ký|học phí|coupon|enroll|course landing|bootcamp/iu.test(title);
  const academic = ['arxiv.org','aclanthology.org','jmlr.org','proceedings.mlr.press','papers.nips.cc','openreview.net'].some(d => domainMatches(host,d)) || /\.(?:edu|ac\.uk)$/u.test(host) || domainMatches(host,'berkeley.edu');
  const official = internationalDomains.some(d => domainMatches(host,d)) || ['openai.com','anthropic.com','python.org','developer.mozilla.org','tc39.es','w3.org','who.int','nasa.gov','noaa.gov','ipcc.ch'].some(d => domainMatches(host,d));
  // Community posts on a recognized platform are not official documentation.
  const community = domainMatches(host,'huggingface.co') && !/^\/(?:docs|learn|blog)(?:\/|$)/u.test(url.pathname);
  const eligible = url.protocol === 'https:' && !url.username && !url.password && !local && !listing && !marketplace && !marketing && !community && (academic || official);
  return { eligible, kind:listing?'discovery-only':marketplace||marketing?'course-marketing':local?'local':academic?'academic':official&&!community?'official':'unrecognized', priority:eligible?(academic?3:4):0 };
}

// A bounded bilingual lexicon improves common AI briefs without inventing an
// English translation for every possible topic. The original brief stays intact.
export function researchTopic(brief) {
  const text = `${brief.topic || ''} ${brief.goal || ''}`;
  const pairs = [
    [/prompt|câu lệnh|cau lenh/iu,'prompt engineering'], [/vibe|tạo.*(?:ứng dụng|sản phẩm)|xây.*(?:ứng dụng|sản phẩm)/iu,'AI assisted software development'],
    [/trí tuệ nhân tạo/iu,'artificial intelligence'], [/học máy/iu,'machine learning'],
    [/học sâu/iu,'deep learning'], [/mô hình ngôn ngữ/iu,'large language models'],
    [/truy xuất|\brag\b/iu,'retrieval augmented generation'], [/tác nhân|\bagents?\b/iu,'AI agents tool calling'],
    [/ảo giác|bịa|trả lời sai/iu,'language model hallucination evaluation'], [/tinh chỉnh/iu,'fine tuning']
  ];
  const terms = pairs.filter(([pattern]) => pattern.test(text)).map(([,term]) => term);
  const identifiers = (brief.topic || '').split(/\s+/u).filter(word => /^[A-Za-z][A-Za-z0-9._-]{2,}$/u.test(word));
  return [...new Set([...terms,...identifiers])].join(' ') || brief.topic;
}
export const prefersInternational = brief => brief.sourcePreference === 'international-primary' || /\b(?:AI|LLM|prompt|RAG|agents?|machine learning|deep learning)\b|trí tuệ nhân tạo|học máy|học sâu|mô hình ngôn ngữ/iu.test(`${brief.topic} ${brief.goal}`);
