const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state = { boot:null, project:null, view:'brief', busy:false, editing:null, output:null, noticeTimer:null };
const labels = { brief:'Đề bài & mục tiêu', sources:'Hồ sơ nguồn', script:'Kịch bản', export:'Duyệt & xuất', audit:'Nhật ký hoạt động' };
const statusLabels = { approved:'Đã duyệt', pending:'Chờ duyệt', rejected:'Đã loại', quarantined:'Đã cách ly', CITED:'CITED · Khớp nguyên văn', NEEDS_VERIFY:'NEEDS_VERIFY · Cần xác minh', NO_SOURCE:'NO_SOURCE · Thiếu căn cứ' };
const day = value => value ? new Date(value).toLocaleDateString('vi-VN') : 'Chưa xác định';
const badge = status => `<span class="badge ${esc(status.toLowerCase())}">${esc(statusLabels[status] || status)}</span>`;
async function api(path, input) {
  const response = await fetch(path, input === undefined ? {} : { method:'POST', headers:{'Content-Type':'application/json','X-CSRF-Token':state.boot.csrf}, body:JSON.stringify(input) });
  let result;try { result = await response.json(); } catch { throw new Error('Máy chủ chưa trả dữ liệu hợp lệ. Hãy kiểm tra ứng dụng đang chạy.'); }
  if (!response.ok) throw new Error(result.error || 'Không thực hiện được thao tác.');
  return result;
}
function notice(message, error=false) {
  clearTimeout(state.noticeTimer);const el=$('#notice');el.hidden=false;el.className=error?'error':'';el.textContent=message;
  state.noticeTimer=setTimeout(()=>{el.hidden=true;},error?12000:6000);
}
function remember(id) { try { if(id) localStorage.setItem('scriptforge.project',id);else localStorage.removeItem('scriptforge.project'); } catch {} }
async function bootstrap() {
  state.boot = await api('/api/bootstrap');
  $('#connection').textContent=`${state.boot.providerLabel} · ${state.boot.aiEnabled?'Đã cấu hình key':'Chưa có key'}`;
  $('#connection').classList.toggle('connected',state.boot.aiEnabled);
}
function shell() {
  const icons={brief:'▤',sources:'▧',script:'≡',export:'↗',audit:'◷'};
  $('#navigation').innerHTML=Object.entries(labels).map(([key,label])=>`<button class="nav-item ${state.view===key?'active':''}" data-action="navigate" data-view="${key}" ${!state.project && key!=='brief'?'disabled':''} ${state.busy?'disabled':''}><span class="nav-icon">${icons[key]}</span>${label}${key==='sources'&&state.project?`<span class="nav-count">${state.project.sources.length}</span>`:''}</button>`).join('');
  $('#breadcrumb-current').textContent=labels[state.view];
  document.querySelectorAll('[data-action="new"]').forEach(b=>b.disabled=state.busy);
}
function steps(active) {
  return `<div class="stepper" aria-label="Tiến trình">${['Đặt đề bài','Duyệt nguồn','Viết & đối chiếu','Duyệt & xuất'].map((s,i)=>`<div class="step ${i===active?'active':i<active?'done':''}"><b>${i<active?'✓':i+1}</b>${s}</div>`).join('')}</div>`;
}
function demoBanner() { return state.project?.mode==='demo'?'<div class="banner demo">◇ Bộ thử minh họa · Dữ liệu do nhóm tự tạo. Không tìm web, không gọi AI, không dùng làm tài liệu giảng dạy.</div>':''; }
function header(eyebrow,title,subtitle,extra='') { return `<div class="heading-row"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p class="subtitle">${subtitle}</p></div>${extra}</div>`; }
function render() {
  shell();
  const views={brief:briefView,sources:sourcesView,script:scriptView,export:exportView,audit:auditView};
  $('#workspace').innerHTML=(state.project?`<nav class="mobile-nav" aria-label="Chuyển bước">${Object.entries(labels).map(([key,label])=>`<button class="text-button" data-action="navigate" data-view="${key}">${label}</button>`).join('')}</nav>`:'')+views[state.view]();
}
function briefView() {
  const b=state.project?.brief || {};
  return `<div class="eyebrow">TỪ NGHIÊN CỨU ĐẾN KỊCH BẢN</div><h1>Bài giảng hay bắt đầu<br>từ <em>nguồn đáng tin.</em></h1><p class="subtitle">Biến chủ đề thành kịch bản toàn bài có căn cứ.<br>Tìm tài liệu, kiểm tra từng nguồn, rồi cùng AI viết theo thời lượng.</p>${steps(0)}
  <div class="brief-layout"><form class="card" id="brief-form"><div class="card-heading"><h2>Bạn muốn dạy điều gì?</h2><span class="section-number">01 / 04</span></div>
  <label class="field"><span class="field-label">Chủ đề bài giảng <span class="required">*</span></span><input name="topic" required minlength="8" maxlength="300" value="${esc(b.topic || '')}" placeholder="Ví dụ: Vì sao AI trả lời sai mà vẫn rất tự tin?"><span class="field-hint">Một chủ đề cụ thể giúp tìm đúng tài liệu.</span></label>
  <label class="field"><span class="field-label">Mục tiêu học tập <span class="required">*</span></span><textarea name="goal" required maxlength="700" rows="3" placeholder="Sau video, người học sẽ hiểu hoặc làm được điều gì?">${esc(b.goal || '')}</textarea></label>
  <div class="field-row"><label class="field"><span class="field-label">Người học là ai? <span class="required">*</span></span><input name="audience" required maxlength="200" value="${esc(b.audience || '')}" placeholder="Người mới tìm hiểu về AI"></label><label class="field"><span class="field-label">Thời lượng video <span class="required">*</span></span><select name="duration">${[1,3,4,5,10,15,20,30].map(n=>`<option value="${n}" ${Number(b.duration || 10)===n?'selected':''}>Khoảng ${n} phút</option>`).join('')}</select><span class="field-hint">Lời giảng được phân bổ theo thời lượng này. Bài có giải thích sâu và thực hành cần đủ thời gian; chọn một đến ba phút sẽ giới hạn phạm vi, không thể chứa toàn bộ khóa học.</span></label></div>
  <label class="checkbox-row"><input type="checkbox" name="consent" required><span>Tôi dùng dữ liệu công khai hoặc dữ liệu giả, không nhập thông tin cá nhân. ${state.boot.searchEnabled?`Chủ đề và mục tiêu được gửi đến ${esc(state.boot.searchLabel)} để tìm nguồn.`:'Chưa bật tìm web tự động; tôi sẽ thêm URL nguồn.'} Khi viết, đề bài và bằng chứng được gửi đến ${esc(state.boot.providerLabel)}.</span></label>
  <div class="form-bottom"><span class="tiny">Bạn sẽ duyệt các nguồn<br>trước khi AI viết kịch bản.</span><button class="button primary" type="submit">${state.project?'Tạo đề bài mới':'Bắt đầu tìm nguồn'} <span class="arrow">↗</span></button></div>
  ${!state.boot.aiEnabled||!state.boot.searchEnabled?`<p class="field-hint">${!state.boot.aiEnabled?`Chưa có ${esc(state.boot.keyName)} để viết kịch bản. `:''}${!state.boot.searchEnabled?'Tìm web tự động chưa bật; bạn có thể lưu đề bài và thêm URL thủ công. ':''}<button type="button" class="text-button" data-action="help">Cách kết nối & đổi API</button></p>`:''}</form>
  <aside class="brief-aside"><div class="preview-card"><div class="preview-title">MỘT KỊCH BẢN, RÕ TỪNG NGUỒN <span>↗</span></div><div class="paper-illustration" aria-label="Minh họa cấu trúc, không phải kết quả AI"><div class="paper-top">KỊCH BẢN BÀI GIẢNG · MINH HỌA BỐ CỤC</div><div class="paper-line"><span class="line-number">01</span><p>Mỗi câu chứa một ý,<br>diễn đạt bằng văn nói.</p><span class="paper-cite">nguồn ↗</span></div><div class="paper-line"><span class="line-number">02</span><p>Mỗi khẳng định đi cùng<br>bằng chứng đối chiếu.</p><span class="paper-cite">nguồn ↗</span></div><div class="proof-strip"><span>◎ Bằng chứng bên cạnh câu viết</span><span>→</span></div></div><h3>Viết sáng rõ.<br>Kiểm chứng dễ dàng.</h3><p>Bạn giữ quyền quyết định. AI nghiên cứu và đề xuất, giảng viên duyệt trước khi đưa vào video.</p><div class="promise-list"><div><span>✓</span> Nguồn gốc và ngày cập nhật rõ ràng</div><div><span>✓</span> Bấm từng câu để xem bằng chứng</div><div><span>✓</span> Bỏ nguồn, chỉ sửa câu liên quan</div></div></div>
  <div class="demo-card"><span class="demo-icon">◈</span><div><strong>Muốn thử trước?</strong><p>Bộ dữ liệu giả, chạy ngay tại máy.</p><button class="text-button" type="button" data-action="demo">Mở bộ thử minh họa →</button></div></div></aside></div>
  <div class="trust-footer"><span>♧</span><div>Không có căn cứ, không đưa vào bài giảng. Trích dẫn khớp văn bản vẫn cần kiểm tra ý nghĩa và ngữ cảnh.<br>Nguồn và bản nháp được lưu tại máy; chỉ phần bằng chứng cần thiết được gửi tới AI khi bạn tạo bản nháp.</div></div><div class="mobile-demo"><button class="text-button" data-action="demo">Thử bằng dữ liệu minh họa →</button></div>`;
}
function sourceCard(s) {
  const canApprove=s.provenance.verified&&s.decision!=='quarantined'&&s.contentPolicy?.eligible!==false;
  const needsNote=!s.knownPublisher||['old','unknown','invalid-date'].includes(s.freshness);
  const affected=state.project.scenes.filter(x=>x.citations.some(c=>c.sourceId===s.id)).map(x=>x.n);
  return `<article id="source-${esc(s.id)}" class="source-card ${esc(s.decision)}"><div class="source-card-header"><div class="source-icon">↗</div><div><h3>${esc(s.title)}</h3><div class="source-meta">${esc(s.publisher)} · ${esc(s.language)}<br>${esc(s.author || 'Tác giả chưa được công bố trong metadata')}</div></div>${badge(s.decision)}</div>
  <div class="source-facts"><span>Ngày đăng: ${day(s.publishedAt)}</span><span>Điểm tiêu chí: ${s.score}/100</span><span>${s.chunks.length} đoạn đã lưu</span></div><blockquote class="source-excerpt">${esc(s.chunks.find(c=>c.text.length>70)?.text || s.text).slice(0,420)}</blockquote>
  ${s.warnings.length?`<ul class="warning-list">${s.warnings.map(w=>`<li>${esc(w)}</li>`).join('')}</ul>`:''}
  ${s.contentPolicy?.eligible===false?'<div class="banner">Nguồn đã lưu nhưng không phù hợp bộ lọc học liệu quốc tế cho chủ đề AI. Trang này không được gửi cho model viết; hãy bỏ nguồn và tìm tài liệu chuyên sâu.</div>':''}
  ${s.decision==='approved'?`<div class="tiny">${affected.length?`Đang làm căn cứ cho câu ${affected.join(', ')}. Bỏ nguồn sẽ chỉ làm mất hiệu lực các câu này.`:'Chưa có câu nào dùng nguồn này.'}</div>`:''}
  ${canApprove&&s.decision!=='approved'?`<label class="checkbox-row"><input id="verify-${s.id}" type="checkbox"><span>Tôi đã kiểm tra uy tín, độ mới và quyền sử dụng nguồn này.</span></label><label class="field"><span class="field-label">Ghi chú duyệt ${needsNote?'<span class="required">* bắt buộc, ít nhất 15 ký tự</span>':'(không bắt buộc)'}</span><textarea class="inline-input" id="note-${s.id}" rows="2" maxlength="1000" ${needsNote?'required minlength="15"':''} aria-label="Lý do chấp nhận ${esc(s.title)}" placeholder="${needsNote?'Ví dụ: Đã đối chiếu trang chính thức; nội dung phù hợp dù metadata thiếu ngày.':'Ghi thêm căn cứ cho quyết định nếu cần.'}">${esc(s.reviewNote)}</textarea>${needsNote?'<span class="field-hint">Nguồn thiếu ngày, đã cũ hoặc tổ chức chưa được nhận diện nên cần ghi rõ lý do chấp nhận.</span>':''}</label>`:''}
  <div class="source-actions"><button class="text-button" data-action="source-detail" data-id="${s.id}">Xem hồ sơ & bản gốc ↗</button><div class="button-row">${s.decision==='quarantined'&&state.project.mode==='live'?`<button class="button secondary small" data-action="recheck-source" data-id="${s.id}">Kiểm tra lại</button>`:''}${canApprove&&s.decision!=='approved'?`<button class="button small" data-action="approve-source" data-id="${s.id}">Duyệt nguồn</button>`:''}${s.decision!=='rejected'&&s.decision!=='quarantined'?`<button class="button secondary small" data-action="reject-source" data-id="${s.id}">Bỏ nguồn</button>`:''}</div></div></article>`;
}
function sourcesView() {
  const p=state.project, approved=p.sources.filter(s=>s.decision==='approved').length, pending=p.sources.filter(s=>s.decision==='pending').length;
  return `${header('02 / HỒ SƠ TÀI LIỆU','Tìm được chưa đủ.<br><em>Hãy chọn nguồn đáng tin.</em>',esc(p.brief.topic))}${steps(1)}${demoBanner()}
  ${p.mode==='live'?'<p class="field-hint">Chủ đề AI ưu tiên bản gốc tiếng Anh: tài liệu chính thức, giáo trình mở và bài nghiên cứu quốc tế. Tìm bằng Exa/Tavily theo cấu hình; không dùng trang kết quả Google Scholar hay quảng cáo Udemy làm bằng chứng. Tên miền uy tín vẫn cần kiểm tra nội dung và độ liên quan.</p>':''}
  ${p.conflicts.length?`<div class="banner">⚑ Có ${p.conflicts.length} cặp bằng chứng cần đối chiếu. <button class="text-button" data-action="conflicts">Xem khác biệt →</button></div>`:''}
  <div class="source-layout"><section><div class="section-header"><h2>${p.sources.length} nguồn trong hồ sơ</h2><div class="button-row">${p.mode==='live'&&p.sources.length?`<button class="text-button" data-action="research" ${!state.boot.searchEnabled?'disabled':''}>↻ Tìm thêm nguồn chuyên sâu</button>`:''}<button class="text-button" data-action="criteria">Tiêu chí đánh giá ⓘ</button></div></div><div class="source-list">${p.sources.length?p.sources.map(sourceCard).join(''):`<div class="empty-state"><div class="empty-icon">⌕</div><h2>Chưa có tài liệu</h2><p>${state.boot.searchEnabled?`Tìm nguồn qua ${esc(state.boot.searchLabel)} từ chủ đề và mục tiêu của bạn.`:'Cấu hình dịch vụ tìm kiếm để tự tìm nguồn, hoặc thêm một URL HTTPS công khai ở bên dưới.'}</p><button class="button primary" data-action="research" ${!state.boot.searchEnabled&&p.mode!=='demo'?'disabled':''}>Tìm nguồn trên web ↗</button></div>`}</div>
  ${p.failures.length?`<div class="card" style=""><h3>Nguồn không đọc được</h3>${p.failures.map(f=>`<p class="tiny">${esc(f.url)}<br>${esc(f.reason)}</p>`).join('')}</div>`:''}
  ${p.mode==='live'?`<form id="source-form" class="source-add"><label class="field"><span class="field-label">Bổ sung nguồn của bạn</span><input name="url" type="url" required maxlength="2000" placeholder="https://…" aria-label="URL nguồn bổ sung"></label><button class="button secondary" type="submit">＋ Đọc và lập hồ sơ nguồn</button><p class="field-hint">Chỉ trang HTML công khai; không vượt đăng nhập, paywall hay robots.txt.</p></form>`:'<div class="source-add"><button class="button secondary" data-action="hard-cases">＋ Thử hai nguồn mâu thuẫn & nguồn cũ</button></div>'}
  </section><aside class="sticky-card"><div class="eyebrow">BẠN QUYẾT ĐỊNH</div><h3>Chọn căn cứ cho bài viết</h3><div class="summary-line"><span>Đã duyệt</span><b>${approved}</b></div><div class="summary-line"><span>Chờ quyết định</span><b>${pending}</b></div><div class="summary-line"><span>Đã loại / cách ly</span><b>${p.sources.length-approved-pending}</b></div><div class="rule"></div><p>Điểm là tổng tiêu chí công khai, không phải xác suất thông tin đúng. Đọc bản gốc và kiểm tra ngữ cảnh trước khi duyệt.</p>${pending?'<button class="button secondary full-width" data-action="approve-all-sources">✓ Duyệt tất cả nguồn đủ điều kiện</button><p class="field-hint">Nguồn cách ly, thiếu điều kiện hoặc cần ghi chú sẽ không được duyệt tự động.</p>':''}<button class="button primary full-width" data-action="${p.scenes.length?'to-script':'generate'}" ${!p.scenes.length&&(pending||!approved)?'disabled':''}>${p.scenes.length?'Đến kịch bản':'Viết kịch bản toàn bài'} →</button>${pending?'<p class="field-hint">Duyệt hoặc bỏ các nguồn còn chờ để tiếp tục.</p>':''}<div class="rule"></div><button class="text-button" data-action="profile-download">↓ Tải hồ sơ nguồn hiện tại</button></aside></div>`;
}
function sceneCard(s, total) {
  const editing=state.editing===s.id;
  const hasIssues=Boolean(s.issues?.length);
  const phase=(s.section || (s.n===1?'Mở đầu':s.n===total?'Kết bài':'Nội dung')).toUpperCase();
  return `<article id="scene-${esc(s.id)}" class="scene-card ${s.decision}"><div class="scene-head"><div><span class="scene-number">Cảnh ${String(s.n).padStart(2,'0')}</span><span class="scene-label">${phase} · ${esc(s.style)}</span></div>${badge(s.status)}</div><div class="scene-content">
  ${editing?`<form class="scene-edit" data-scene="${s.id}"><label class="field"><span class="field-label">Nội dung slide · hai đến năm dòng</span><textarea name="slideBullets" required maxlength="604">${esc((s.slideBullets||[]).join('\n'))}</textarea></label><label class="field"><span class="field-label">Script nói · một ý dạy hoàn chỉnh</span><textarea name="text" required maxlength="6000">${esc(s.text)}</textarea></label><div class="field-row"><label class="field"><span class="field-label">Thông điệp chính · tối đa 100 ký tự</span><input name="screenText" required maxlength="100" value="${esc(s.screenText)}"></label><label class="field"><span class="field-label">Ý đồ hình</span><input name="visual" required maxlength="1000" value="${esc(s.visual)}"></label></div><div class="button-row"><button type="submit" class="button">Lưu & kiểm tra lại</button><button type="button" class="button secondary" data-action="cancel-edit">Hủy</button></div></form>`:s.text?`<div><h3>${esc(s.title)}</h3><div class="scene-info"><div><strong>NỘI DUNG SLIDE</strong><ul>${(s.slideBullets||[]).map(item=>`<li>${esc(item)}</li>`).join('')}</ul></div><div><strong>Ý ĐỒ HÌNH</strong><p>${esc(s.visual || '—')}</p></div></div><div class="eyebrow">SCRIPT NÓI</div><p class="scene-text">${esc(s.text)}</p><p class="tiny">Thông điệp chính: ${esc(s.screenText || '—')}</p></div>`:`<div class="banner error">Không sinh nội dung. ${esc(s.reason)}</div>`}
  <div class="citation-list">${s.citations.map((c,i)=>`<button class="citation-button" data-action="citation" data-id="${s.id}" data-index="${i}">↗ ${esc(c.title)} · ${esc(c.chunkId)}</button>`).join('')}${s.decision==='pending'&&s.text?`<button class="citation-button" data-action="add-evidence" data-id="${s.id}">＋ Bổ sung dẫn chứng</button>`:''}</div>
  <p class="review-note">${esc(s.reason)}</p>${s.issues?.length&&s.status!=='NO_SOURCE'?`<ul class="warning-list">${s.issues.map(i=>`<li>${esc(i)}</li>`).join('')}</ul>`:''}
  ${s.conflict?`<div class="banner">⚑ ${esc(s.conflict)}</div><label class="field"><span class="field-label">Cách xử lý mâu thuẫn</span><textarea class="inline-input" id="resolution-${s.id}" maxlength="1000" placeholder="Ghi phạm vi, thời điểm hoặc lý do không dùng số liệu…">${esc(s.resolution)}</textarea></label>`:''}
  ${!editing?`<div class="scene-bottom">${s.decision==='accepted'?'<span class="badge approved">✓ Đã đối chiếu & chấp nhận</span>':s.decision==='rejected'?'<span class="tiny">Đã bỏ khỏi bản xuất.</span>':`${hasIssues?`<div class="review-blocker">Cần sửa trước khi xác nhận: ${esc(s.issues.join(' '))}</div>`:''}<label class="checkbox-row"><input type="checkbox" id="scene-verify-${s.id}" ${s.status==='NO_SOURCE'||hasIssues?'disabled':''}><span>Tôi đã đọc bằng chứng, kiểm tra mọi ý, thuật ngữ và hình minh họa.</span></label>`}<div class="button-row">${s.decision==='pending'?`<button class="button small" data-action="accept-scene" data-id="${s.id}" ${s.status==='NO_SOURCE'||hasIssues?'disabled':''}>✓ Chấp nhận</button><button class="button secondary small" data-action="ai-rewrite-scene" data-id="${s.id}">✦ ${s.text?'AI sửa cảnh':'AI viết lại cảnh'}</button><button class="button secondary small" data-action="edit-scene" data-id="${s.id}" ${s.status==='NO_SOURCE'?'disabled':''}>Sửa</button><button class="button secondary small" data-action="reject-scene" data-id="${s.id}">Bỏ</button>`:`<button class="button secondary small" data-action="reset-scene" data-id="${s.id}">Duyệt lại</button>`}</div></div>`:''}</div></article>`;
}
function scriptView() {
  const p=state.project, accepted=p.scenes.filter(s=>s.decision==='accepted').length, need=p.scenes.filter(s=>s.needsRepair).length;
  const malformed=p.scenes.filter(s=>s.issues?.length).length;
  const formatIssues=p.scenes.filter(s=>s.decision==='pending'&&s.issues?.some(issue=>issue.includes('Lời đọc còn viết tắt'))).length;
  const canRegenerate=p.scenes.length&&p.scenes.every(s=>s.decision==='pending');
  const target=p.scriptPlan?.sceneCount||p.scenes.length, estimatedSeconds=Math.round(p.scenes.filter(s=>s.decision!=='rejected').reduce((n,s)=>n+s.text.split(/\s+/).filter(Boolean).length,0)/2.9);
  return `${header('03 / BẢN THẢO CÓ CĂN CỨ','Từng câu, <em>từng bằng chứng.</em>',esc(p.brief.topic),`<div class="button-row"><button class="button secondary" data-action="approve-all-scenes">✓ Duyệt tất cả cảnh đủ điều kiện</button><button class="button secondary" data-action="to-sources">← Xem lại nguồn</button></div>`) }${steps(2)}${demoBanner()}
  ${need?`<div class="banner error">${need} câu mất căn cứ sau khi bỏ nguồn. Các câu khác giữ nguyên. <button class="text-button" data-action="repair">Viết lại phần bị ảnh hưởng →</button></div>`:''}
  ${canRegenerate?`<div class="banner ${malformed?'error':''}">${malformed?`${malformed} cảnh chưa đúng mẫu. `:'Bạn chưa duyệt hoặc bỏ cảnh nào nên có thể '}Viết lại toàn bài sẽ tạo lại toàn bộ lời dạy từ evidence hiện có. <button class="text-button" data-action="regenerate">Viết lại toàn bài →</button></div>`:''}
  ${formatIssues?`<div class="banner">${formatIssues} cảnh còn viết tắt trong lời đọc. <button class="text-button" data-action="normalize-format">Tự mở rộng viết tắt →</button><br><span class="tiny">Chỉ mở rộng viết tắt; không đổi giá trị, nguồn hay quyết định kiểm chứng.</span></div>`:''}
  ${p.scenes.length && (estimatedSeconds<p.brief.duration*60*.85 || p.scenes.some(s=>s.status==='NO_SOURCE'))?'<div class="banner error">Bản nháp còn thiếu nội dung hoặc chưa đủ thời lượng. Bổ sung học liệu chuyên sâu rồi viết lại; không dùng các câu lặp để kéo dài bài.</div>':''}
  ${p.scriptPlan?.missingEvidence?.length?`<div class="banner"><strong>Phần còn thiếu căn cứ</strong><ul>${p.scriptPlan.missingEvidence.map(item=>`<li>${esc(item)}</li>`).join('')}</ul></div>`:''}
  <div class="stat-pills"><span class="stat-pill"><b>${p.scenes.length}/${target}</b> cảnh toàn bài</span><span class="stat-pill"><b>${accepted}</b> đã chấp nhận</span><span class="stat-pill"><b>${p.scenes.filter(s=>s.status==='NEEDS_VERIFY').length}</b> cần đối chiếu ý nghĩa</span><span class="stat-pill"><b>${estimatedSeconds}</b> giây đọc / mục tiêu ${p.brief.duration} phút</span></div>
  <div class="scene-list">${p.scenes.length?p.scenes.map(s=>sceneCard(s,p.scenes.length)).join(''):'<div class="empty-state"><div class="empty-icon">≡</div><h2>Nguồn sẵn sàng, bài học bắt đầu</h2><p>Duyệt hồ sơ nguồn trước khi tạo kịch bản đầy đủ có trích dẫn.</p><button class="button primary" data-action="to-sources">Đến hồ sơ nguồn →</button></div>'}</div>
  ${p.scenes.length?'<div class="form-bottom"><p class="tiny">Lời giảng được soạn để đọc nguyên văn. Thời lượng ước tính theo 2,9 tiếng/giây, chưa gồm dừng hình và thao tác. Độ dài không bảo đảm độ đúng; từng slide vẫn phải được đối chiếu nguồn.</p><button class="button primary" data-action="to-export">Duyệt & xuất kịch bản →</button></div>':''}`;
}
function exportView() {
  const p=state.project, accepted=p.scenes.filter(s=>s.decision==='accepted').length, pending=p.scenes.filter(s=>s.decision==='pending').length;
  const ready=accepted>0&&pending===0;
  const files=[['markdown','MD','script.md','Kịch bản đúng mẫu, có bằng chứng'],['script','JSON','script.json','Câu / cảnh để chuyển sang C4'],['profile','JSON','source-profile.json','Tác giả, ngày, đánh giá & claim'],['trace','JSON','trace.json','Liên kết từng câu với nguồn'],['audit','JSON','audit-log.json','Lịch sử duyệt và thay đổi']];
  return `${header('04 / HOÀN TẤT BẢN THẢO','Sẵn sàng để <em>người thật duyệt.</em>','Giảng viên là người quyết định bản kịch bản được chuyển sang dựng video.')}${steps(3)}${demoBanner()}
  ${!ready?`<div class="banner">Còn ${pending} câu chờ quyết định; ${accepted} câu được chấp nhận. <button class="text-button" data-action="to-script">Quay lại đối chiếu →</button></div>`:''}
  <div class="export-grid"><section class="card"><div class="card-heading"><h2>Bộ bàn giao</h2><span class="badge">${accepted} câu đã duyệt</span></div>${files.map(([key,type,name,desc])=>`<div class="download-item"><span class="download-icon">${type}</span><div><strong>${name}</strong><p>${desc}</p></div><button class="button secondary small" data-action="download" data-key="${key}" ${!p.teacherApproval?'disabled':''} aria-label="Xuất và tải ${name}">↓ Xuất & tải</button></div>`).join('')}<div class="rule"></div><p class="tiny">Bấm Xuất & tải để tạo bản bàn giao và lưu vào Nhật ký hoạt động. Các tệp tải trong cùng một lượt duyệt được gộp thành một bản. Không xuất toàn bộ nội dung đã thu thập; người dùng chịu trách nhiệm quyền sử dụng.</p></section>
  <section class="card"><div class="eyebrow">GIẢNG VIÊN DUYỆT CUỐI</div><h2>Kiểm soát trước khi xuất</h2><p class="subtitle">Mỗi lần sửa câu hoặc thay đổi nguồn sẽ hủy xác nhận này và yêu cầu duyệt lại.</p>${p.teacherApproval?`<div class="banner success">✓ Đã duyệt bởi ${esc(p.teacherApproval.reviewer)}<br>${day(p.teacherApproval.at)} · ${accepted} câu được giữ</div>`:`<form id="teacher-form"><label class="field"><span class="field-label">Mã người duyệt</span><input name="reviewer" required maxlength="80" placeholder="Ví dụ: GV01 — không cần tên cá nhân"></label><label class="checkbox-row"><input name="confirmed" type="checkbox" required ${!ready?'disabled':''}><span>Tôi là giảng viên/người phụ trách nội dung, đã kiểm tra ý nghĩa, số liệu, nguồn, quyền sử dụng và đồng ý bản này để chuyển sang dựng video.</span></label><button class="button primary full-width" type="submit" ${!ready?'disabled':''}>Xác nhận bản cuối</button><p class="field-hint">Bản cục bộ dùng xác nhận tự khai, chưa xác thực danh tính qua tài khoản.</p></form>`}</section></div>`;
}
function auditTime(value) { return new Intl.DateTimeFormat('vi-VN',{dateStyle:'short',timeStyle:'short'}).format(new Date(value)); }
function auditView() {
  const p=state.project,records=[...p.audit].filter(entry=>entry.event==='export.created').reverse();
  return `${header('LỊCH SỬ BẢN XUẤT','Mỗi lần xuất, <em>một bản lưu.</em>','Chỉ lưu các bản đã bàn giao cùng người duyệt và thời điểm duyệt.')}${demoBanner()}<section class="card">${records.length?`<table class="audit-table"><thead><tr><th>PHIÊN BẢN</th><th>THỜI ĐIỂM XUẤT</th><th>NGƯỜI DUYỆT</th><th>THỜI ĐIỂM DUYỆT</th><th>NỘI DUNG</th></tr></thead><tbody>${records.map(entry=>`<tr><td>Bản ${esc(String(entry.version||1))}</td><td>${esc(auditTime(entry.at))}</td><td>${esc(entry.reviewer||'Không rõ')}</td><td>${entry.approvedAt?esc(auditTime(entry.approvedAt)):'—'}</td><td class="audit-detail">${entry.scenes??'—'} cảnh đã duyệt</td></tr>`).join('')}</tbody></table>`:'<div class="empty-state"><div class="empty-icon">↗</div><h2>Chưa có bản xuất</h2><p>Hoàn tất duyệt rồi xuất kịch bản; mỗi lần xuất sẽ tạo một bản lưu tại đây.</p></div>'}</section><div class="delete-row"><button class="text-button" data-action="delete">Xóa dữ liệu dự án này</button></div>`;
}
function showDialog(title,content) {
  $('#dialog-title').textContent=title;$('#dialog-body').innerHTML=`<div class="dialog-content">${content}</div>`;
  if(!$('#detail-dialog').open)$('#detail-dialog').showModal();
}
function showSource(id, citation=null) {
  const s=state.project.sources.find(x=>x.id===id);if(!s)return;
  showDialog(s.title,`<div class="source-meta">${esc(s.publisher)} · ${esc(s.author||'Tác giả chưa xác định')}<br>Đăng: ${day(s.publishedAt)} · Cập nhật: ${day(s.updatedAt)} · Tải: ${day(s.fetchedAt)}</div><p>${s.provenance.type==='synthetic'?`<span class="badge pending">Nguồn giả để thử: ${esc(s.url)}</span>`:`<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">Mở trang gốc ↗</a>`}</p>${citation?`<div class="quote-block">${esc(citation.quote)}<p class="tiny">${esc(citation.chunkId)} · ${esc(citation.locator)}</p></div>`:''}
  <h3>Vì sao có điểm ${s.score}/100?</h3><div class="criteria">${s.criteria.map(c=>`<div><span>${esc(c.label)}</span><strong>${c.points}/${c.max}</strong></div>`).join('')}</div><p class="tiny">Điểm không chứng minh tính đúng; tính độc lập cần đối chiếu tổ chức và nguồn gốc nghiên cứu, không chỉ tên miền.</p><ul class="warning-list">${s.warnings.map(w=>`<li>${esc(w)}</li>`).join('')}</ul><p class="tiny">${esc(s.rights)}<br>SHA-256: ${esc(s.hash)}</p><h3>Bản văn bản đã lưu</h3>${s.chunks.map(c=>`<div class="source-chunk ${citation?.chunkId===c.id?'target':''}"><small>${esc(c.id)} · ${esc(c.locator)}</small>${esc(c.text)}</div>`).join('')}`);
}
function showEvidencePicker(id) {
  const scene=state.project.scenes.find(scene=>scene.id===id);if(!scene)return;
  const citedGroups=new Set(scene.citations.map(citation=>citation.publisherGroup));
  const sources=state.project.sources.filter(source=>source.decision==='approved'&&source.provenance?.verified);
  if(!sources.length){notice('Chưa có nguồn đã duyệt để chọn dẫn chứng.',true);return;}
  showDialog('Bổ sung dẫn chứng',`<p>Chọn tối đa tám đoạn thực sự hỗ trợ cảnh này. Đoạn chọn được gắn nguyên văn, không do AI tự tạo.</p><form id="citation-form" data-scene="${esc(scene.id)}"><div class="evidence-picker">${sources.map(source=>`<details><summary>${esc(source.title)} · ${esc(source.publisher)}${citedGroups.has(source.publisherGroup)?' · nguồn đang dẫn':' · tổ chức mới'}</summary><p class="tiny">${esc(source.url)}</p>${source.chunks.filter(chunk=>String(chunk.text||'').trim().length>=12).map(chunk=>`<label class="evidence-choice"><input type="checkbox" name="chunkIds" value="${esc(chunk.id)}"><span><strong>${esc(chunk.id)} · ${esc(chunk.locator)}</strong>${esc(chunk.text)}</span></label>`).join('')}</details>`).join('')}</div><p class="field-hint">Sau khi lưu, cảnh trở về trạng thái chờ duyệt để bạn đọc lại bằng chứng và xác nhận.</p><div class="button-row"><button class="button" type="submit">Gắn dẫn chứng đã chọn</button><button class="button secondary" type="button" data-action="close-dialog">Hủy</button></div></form>`);
}
function showBulkSourceApproval() {
  const pending=state.project.sources.filter(source=>source.decision==='pending');
  if(!pending.length)return notice('Không còn nguồn nào đang chờ duyệt.');
  const needsNote=pending.some(source=>!source.knownPublisher||['old','unknown','invalid-date'].includes(source.freshness));
  showDialog('Duyệt tất cả nguồn',`<p>Hệ thống sẽ chỉ duyệt các nguồn đang chờ, đọc được và không vi phạm chính sách. Nguồn bị cách ly hoặc chưa đủ điều kiện vẫn sẽ được giữ lại để xử lý riêng.</p><form id="approve-all-sources-form"><label class="check-row"><input name="confirmed" type="checkbox" required><span>Tôi đã đọc từng hồ sơ nguồn và kiểm tra uy tín, độ mới, ngữ cảnh cùng quyền sử dụng.</span></label>${needsNote?'<label class="field"><span>Ghi chú áp dụng cho nguồn cần xem xét</span><textarea name="note" required minlength="15" maxlength="1000" placeholder="Ví dụ: Đã kiểm tra tổ chức phát hành và lý do nguồn nền tảng này vẫn phù hợp."></textarea><small>Cần ít nhất mười lăm ký tự vì có nguồn thiếu ngày, đã cũ hoặc chưa rõ tổ chức.</small></label>':'<input type="hidden" name="note" value="">'}<div class="button-row"><button class="button" type="submit">Duyệt các nguồn đủ điều kiện</button><button class="button secondary" type="button" data-action="close-dialog">Hủy</button></div></form>`);
}
function showBulkSceneApproval() {
  const pending=state.project.scenes.filter(scene=>scene.decision==='pending');
  if(!pending.length)return notice('Không còn cảnh nào đang chờ chấp nhận.');
  showDialog('Chấp nhận tất cả cảnh',`<p>Chỉ cảnh đang chờ và vượt qua đúng các kiểm tra như khi duyệt từng cảnh mới được chấp nhận. Cảnh thiếu nguồn, còn lỗi mẫu hoặc có mâu thuẫn chưa giải quyết sẽ được giữ lại.</p><form id="approve-all-scenes-form"><label class="check-row"><input name="confirmed" type="checkbox" required><span>Tôi đã đọc bằng chứng và đối chiếu ý nghĩa, thuật ngữ, hình minh họa của từng cảnh đủ điều kiện.</span></label><div class="button-row"><button class="button" type="submit">Chấp nhận các cảnh đủ điều kiện</button><button class="button secondary" type="button" data-action="close-dialog">Hủy</button></div></form>`);
}
async function run(action,message,viewAfter=state.view,restore={}) {
  if(state.busy)return;state.busy=true;state.output=null;shell();
  const previousTop=window.scrollY;
  $('#workspace').innerHTML=`<div class="loading-panel" role="status"><span class="spinner"></span><h2>${esc(message)}</h2><p>Đang xử lý yêu cầu thật. Tài liệu đã lưu sẽ được giữ lại nếu có lỗi.</p><p>Với tìm web, hệ thống sẽ tải và đối chiếu từng nguồn; có thể cần một vài phút.</p></div>`;
  try { const result=await action();if(result?.id){state.project=result;remember(result.id);}state.view=viewAfter;await bootstrap(); }
  catch(e) { notice(e.message,true);if(state.project){try{state.project=await api(`/api/projects/${state.project.id}`);}catch{}} }
  finally {
    state.busy=false;render();
    if(restore.keepPosition)requestAnimationFrame(()=>{
      const target=restore.anchorId?document.getElementById(restore.anchorId):null;
      if(target)target.scrollIntoView({block:'center'});
      else window.scrollTo({top:previousTop,behavior:'auto'});
    });
  }
}
const post=(action,input={})=>api(`/api/projects/${state.project.id}/${action}`,input);
function download(name,content,type='application/json') {
  const blob=new Blob([typeof content==='string'?content:JSON.stringify(content,null,2)],{type:`${type};charset=utf-8`});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function help() {
  showDialog('Kết nối & hướng dẫn',`<h3>Chạy tại máy</h3><pre>npm install\nnpm start\n\nhttp://127.0.0.1:3000</pre>
  <h3>API đang chọn</h3><p>Viết: <strong>${esc(state.boot.providerLabel)}</strong> · <code>${esc(state.boot.model)}</code> · ${state.boot.aiEnabled?'đã có cấu hình khóa (chưa chứng minh kết nối thành công)':'chưa có khóa'}.<br>Tìm nguồn: <strong>${esc(state.boot.searchLabel)}</strong> · ${state.boot.searchEnabled?'đã có cấu hình khóa':'chưa bật'}.</p>
  <h3>Dùng DeepSeek + Exa</h3><p>Sao chép <code>.env.example</code> thành <code>.env</code> nếu chưa có. Điền khóa trên máy chủ:</p><pre>AI_PROVIDER=deepseek\nDEEPSEEK_API_KEY=khóa_của_bạn\nSEARCH_PROVIDER=exa\nEXA_API_KEY=khóa_Exa</pre>
  <p>DeepSeek viết kịch bản; Exa chỉ tìm URL. Nếu chưa có khóa Exa, đặt <code>SEARCH_PROVIDER=manual</code>, thêm URL và duyệt nguồn rồi viết bằng DeepSeek. Luồng tự tìm nguồn của C3 cần dịch vụ tìm kiếm được cấu hình.</p>
  <h3>Đổi nhà cung cấp</h3><p>Đổi <code>AI_PROVIDER</code> sang <code>openai</code>, <code>gemini</code> hoặc <code>compatible</code>; điền khóa và model tương ứng trong <code>.env</code>. Với endpoint tương thích, thêm <code>COMPATIBLE_BASE_URL</code>. Tìm kiếm giữ cấu hình độc lập; nhận <code>exa</code>, <code>tavily</code>, <code>openai</code> hoặc <code>manual</code>.</p>
  <p>Sau mỗi lần đổi, dừng máy chủ bằng Ctrl+C rồi chạy lại <code>npm start</code> và tải lại trang. Khóa chỉ nằm trên máy chủ; không nhập khóa vào trình duyệt hay lưu trong Git. API tính phí theo tài khoản; nhật ký ghi nhà cung cấp, model, token và thời gian chạy.</p>
  <h3>Phạm vi & dữ liệu</h3><p>Viết kịch bản toàn bài theo thời lượng đã chọn, chia thành cảnh để đối chiếu từng claim. Chỉ đọc HTML công khai, tôn trọng robots.txt, không vượt paywall. Trích dẫn khớp văn bản vẫn cần người có chuyên môn kiểm tra ý nghĩa, quyền sử dụng và tính độc lập. Bộ thử minh họa dùng dữ liệu giả.</p><p>Dữ liệu lưu ở <code>codebase/data</code>; bản hiện tại chạy cục bộ, chưa có đăng nhập đa người dùng. Xóa bản lưu tại “Nhật ký hoạt động → Xóa dữ liệu dự án”.</p>`);
}
document.addEventListener('click',async e=>{
  const button=e.target.closest('[data-action]');if(!button||button.disabled)return;
  const action=button.dataset.action,id=button.dataset.id;
  if(action==='close-dialog')return $('#detail-dialog').close();
  if(action==='close-delete')return $('#delete-dialog').close();
  if(action==='help')return help();
  if(state.busy)return;
  if(action==='new'){state.project=null;state.view='brief';state.editing=null;remember(null);render();return;}
  if(action==='navigate'){state.view=button.dataset.view;state.editing=null;render();return;}
  if(action.startsWith('to-')){state.view=action.slice(3);state.editing=null;render();window.scrollTo(0,0);return;}
  if(action==='open')return run(()=>api(`/api/projects/${id}`),'Đang mở bản đã lưu…','sources');
  if(action==='demo')return run(async()=>{
    state.project=await api('/api/projects',{topic:'Vì sao câu trả lời của mô hình cần được kiểm chứng?',goal:'Biết đối chiếu câu trả lời với tài liệu trước khi viết bài giảng.',audience:'Người mới tìm hiểu về mô hình học máy',duration:3,mode:'demo'});
    return post('research');
  },'Đang mở bộ thử tại máy…','sources');
  if(action==='research')return run(()=>post('research'),'Đang tìm và đọc nguồn trên web…','sources');
  if(action==='generate')return run(()=>post('generate'),'Đang lập dàn bài và soạn lời giảng chi tiết từng slide; bài dài có thể cần vài phút…','script');
  if(action==='regenerate')return run(()=>post('regenerate'),'Đang lập lại dàn bài và soạn chi tiết; giữ bản cũ nếu gọi model thất bại…','script');
  if(action==='repair')return run(()=>post('repair'),'Chỉ viết lại các câu bị ảnh hưởng…','script');
  if(action==='normalize-format')return run(()=>post('format'),'Đang mở rộng viết tắt trong lời đọc…','script');
  if(action==='hard-cases')return run(()=>post('hard-cases'),'Đang nạp tình huống mâu thuẫn và nguồn cũ…','sources');
  if(action==='approve-all-sources')return showBulkSourceApproval();
  if(action==='approve-all-scenes')return showBulkSceneApproval();
  if(action==='source-detail')return showSource(id);
  if(action==='recheck-source')return run(()=>post(`sources/${id}/recheck`),'Đang tải lại và kiểm tra nguồn với quy tắc an toàn mới…','sources',{keepPosition:true,anchorId:`source-${id}`});
  if(action==='approve-source'){
    const source=state.project.sources.find(s=>s.id===id),noteInput=$(`#note-${id}`);
    const verified=$(`#verify-${id}`)?.checked, note=noteInput?.value || '';
    if(!verified)return notice('Hãy đọc hồ sơ và xác nhận đã kiểm tra nguồn.',true);
    const needsNote=!source?.knownPublisher||['old','unknown','invalid-date'].includes(source?.freshness);
    if(needsNote&&note.trim().length<15){notice('Nguồn này thiếu ngày, đã cũ hoặc chưa rõ tổ chức. Hãy ghi lý do chấp nhận ít nhất 15 ký tự.',true);noteInput?.focus();noteInput?.scrollIntoView({behavior:'smooth',block:'center'});return;}
    return run(()=>post(`sources/${id}`,{action:'approve',verified,note}),'Đang lưu quyết định duyệt nguồn…','sources',{keepPosition:true,anchorId:`source-${id}`});
  }
  if(action==='reject-source')return run(()=>post(`sources/${id}`,{action:'reject'}),'Đang loại nguồn và xác định câu phụ thuộc…','sources',{keepPosition:true,anchorId:`source-${id}`});
  if(action==='citation'){
    const s=state.project.scenes.find(x=>x.id===id),c=s.citations[Number(button.dataset.index)];return showSource(c.sourceId,c);
  }
  if(action==='add-evidence')return showEvidencePicker(id);
  if(action==='ai-rewrite-scene')return run(()=>post(`scenes/${id}/ai-rewrite`),'AI đang viết lại riêng cảnh này từ các nguồn đã duyệt; bạn cần đối chiếu lại trước khi duyệt…','script',{keepPosition:true,anchorId:`scene-${id}`});
  if(action==='edit-scene'){state.editing=id;render();return;}
  if(action==='cancel-edit'){state.editing=null;render();return;}
  if(action==='accept-scene'){
    const scene=state.project.scenes.find(x=>x.id===id);
    if(scene?.issues?.length)return notice('Cảnh này chưa đúng mẫu; hãy bấm Sửa hoặc viết lại toàn bài trước khi chấp nhận.',true);
    const verified=$(`#scene-verify-${id}`)?.checked;
    if(!verified)return notice('Hãy xác nhận đã đọc bằng chứng và đối chiếu nội dung.',true);
    const resolution=$(`#resolution-${id}`)?.value;
    return run(()=>post(`scenes/${id}`,{action:'accept',verified,resolution}),'Đang lưu lượt duyệt câu…','script',{keepPosition:true,anchorId:`scene-${id}`});
  }
  if(action==='reject-scene'||action==='reset-scene')return run(()=>post(`scenes/${id}`,{action:action==='reject-scene'?'reject':'reset'}),'Đang cập nhật quyết định…','script',{keepPosition:true,anchorId:`scene-${id}`});
  if(action==='criteria')return showDialog('Tiêu chí chọn nguồn',`<p>Điểm công khai trên thang một trăm: tổ chức nhận diện được (35), có tác giả công bố (15), ngày rõ và trong ngưỡng độ mới (15), khớp từ khóa (20), đọc được HTML qua HTTPS (15).</p><p>Độ mới: quá một trăm tám mươi ngày với giá/chi phí/nội dung mới nhất; quá hai năm với chủ đề khác thì gắn cờ. Nguồn nền tảng cũ vẫn có thể phù hợp nếu người duyệt ghi rõ lý do.</p><p>Danh mục tổ chức gồm cơ quan công, đại học, nhà xuất bản nghiên cứu và tài liệu chính thức. Việc nằm trong danh mục không chứng minh mọi khẳng định đều đúng. Nguồn không thuộc danh mục chỉ được dùng khi người duyệt ghi lý do xác minh uy tín.</p><p>Hai tên miền khác nhau chưa chắc độc lập: hãy kiểm tra tác giả, tổ chức, dữ liệu và nghiên cứu gốc. Nguồn có lệnh thao túng bị cách ly; ngày thiếu ghi rõ chưa xác định.</p>`);
  if(action==='conflicts')return showDialog('Những bằng chứng cần đối chiếu',state.project.conflicts.map(c=>`<div class="banner">${esc(c.description)}</div>${c.citations.map(c=>`<blockquote class="quote-block">${esc(c.quote)}<p class="tiny">${esc(c.sourceId)} · ${esc(c.locator)}</p></blockquote>`).join('')}`).join(''));
  if(action==='profile-download'){
    const p=state.project;download('source-profile-draft.json',{status:'Hồ sơ đang duyệt, chưa phải bản dùng dựng video',mode:p.mode,topic:p.brief.topic,sources:p.sources.map(({text,chunks,...s})=>({...s,evidence:chunks.slice(0,2).map(c=>({id:c.id,excerpt:c.text.slice(0,400),locator:c.locator}))})),conflicts:p.conflicts,failures:p.failures});notice('Đã tải hồ sơ nguồn hiện tại.');return;
  }
  if(action==='download'){
    button.disabled=true;
    try{state.output=await post('export');state.project=await api(`/api/projects/${state.project.id}`);const key=button.dataset.key;const names={markdown:'script.md',script:'script.json',profile:'source-profile.json',trace:'trace.json',audit:'audit-log.json'};download(names[key],state.output[key],key==='markdown'?'text/markdown':'application/json');notice(`Đã xuất và tải ${names[key]}. Nhật ký đã được cập nhật.`);}catch(err){notice(err.message,true);}finally{button.disabled=false;}return;
  }
  if(action==='delete')return $('#delete-dialog').showModal();
  if(action==='confirm-delete'){$('#delete-dialog').close();return run(async()=>{await post('delete',{confirmed:true});state.project=null;remember(null);},'Đang xóa dữ liệu dự án…','brief');}
});
document.addEventListener('submit',async e=>{
  e.preventDefault();if(state.busy)return;const form=e.target,data=Object.fromEntries(new FormData(form));
  if(form.id==='brief-form')return run(async()=>{
    state.project=await api('/api/projects',{...data,mode:'live'});remember(state.project.id);
    if(state.boot.searchEnabled)return post('research');return state.project;
  },'Đang lập hồ sơ nghiên cứu…','sources');
  if(form.id==='source-form')return run(()=>post('sources',{url:data.url}),'Đang tải và đánh giá nguồn…','sources');
  if(form.id==='approve-all-sources-form'){ $('#detail-dialog').close();return run(()=>post('sources/approve-all',{confirmed:data.confirmed==='on',note:data.note||''}),'Đang duyệt các nguồn đủ điều kiện…','sources'); }
  if(form.id==='approve-all-scenes-form'){ $('#detail-dialog').close();return run(()=>post('scenes/approve-all',{confirmed:data.confirmed==='on'}),'Đang chấp nhận các cảnh đủ điều kiện…','script'); }
  if(form.id==='citation-form'){const id=form.dataset.scene,chunkIds=new FormData(form).getAll('chunkIds');$('#detail-dialog').close();return run(()=>post(`scenes/${id}/evidence`,{chunkIds}),'Đang gắn dẫn chứng và yêu cầu duyệt lại cảnh…','script',{keepPosition:true,anchorId:`scene-${id}`});}
  if(form.classList.contains('scene-edit')){const id=form.dataset.scene;return run(async()=>{const p=await post(`scenes/${id}`,{...data,action:'edit'});state.editing=null;return p;},'Đang lưu nội dung và kiểm tra mẫu…','script',{keepPosition:true,anchorId:`scene-${id}`});}
  if(form.id==='teacher-form')return run(()=>post('teacher',{reviewer:data.reviewer,confirmed:data.confirmed==='on'}),'Đang ghi xác nhận của giảng viên…','export');
});
try {
  await bootstrap();
  let id;try{id=localStorage.getItem('scriptforge.project');}catch{}
  if(id&&state.boot.projects.some(p=>p.id===id)){state.project=await api(`/api/projects/${id}`);state.view=state.project.scenes.length?'script':'sources';}
  render();
} catch(e) { $('#workspace').innerHTML='<div class="empty-state"><h2>Chưa kết nối được máy chủ</h2><p>Chạy npm start từ thư mục dự án, rồi tải lại trang.</p></div>';notice(e.message,true); }
