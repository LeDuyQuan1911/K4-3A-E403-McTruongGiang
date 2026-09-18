const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state = { boot:null, project:null, view:'brief', busy:false, editing:null, output:null, noticeTimer:null, theme:'light' };
const labels = { brief:'Đề bài & mục tiêu', sources:'Hồ sơ nguồn', script:'Kịch bản', export:'Duyệt & xuất', audit:'Nhật ký hoạt động' };
const statusLabels = { approved:'Đã duyệt', pending:'Chờ duyệt', rejected:'Đã loại', quarantined:'Đã cách ly', CITED:'CITED · Khớp nguyên văn', NEEDS_VERIFY:'NEEDS_VERIFY · Cần xác minh', NO_SOURCE:'NO_SOURCE · Thiếu căn cứ' };
const day = value => value ? new Date(value).toLocaleDateString('vi-VN') : 'Chưa xác định';
const badge = status => `<span class="badge ${esc(status.toLowerCase())}">${esc(statusLabels[status] || status)}</span>`;
function getTheme() {
  try { return localStorage.getItem('scriptforge.theme') || 'light'; } catch { return 'light'; }
}
function applyTheme(theme) {
  state.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  try { localStorage.setItem('scriptforge.theme', theme); } catch {}
  const btn = $('.theme-toggle-btn');
  if (btn) {
    btn.setAttribute('data-theme-state', theme);
    btn.setAttribute('title', theme === 'dark' ? 'Chế độ hiện tại: Tối (Âm) · Nhấn để đổi sang Sáng (Dương)' : 'Chế độ hiện tại: Sáng (Dương) · Nhấn để đổi sang Tối (Âm)');
    btn.setAttribute('aria-label', theme === 'dark' ? 'Chế độ hiện tại: Tối (Âm) · Nhấn để đổi sang Sáng (Dương)' : 'Chế độ hiện tại: Sáng (Dương) · Nhấn để đổi sang Tối (Âm)');
  }
}
function toggleTheme() {
  const next = (state.theme || getTheme()) === 'dark' ? 'light' : 'dark';
  applyTheme(next);
}
applyTheme(getTheme());
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
  const conn = $('#connection');
  if (conn) {
    conn.textContent=`${state.boot.providerLabel} · ${state.boot.aiEnabled?'Đã cấu hình key':'Chưa có key'}`;
    conn.classList.toggle('connected',state.boot.aiEnabled);
  }
}
function shell() {
  const projects = state.boot?.projects || [];
  const countEl = $('#history-count');
  if (countEl) countEl.textContent = `${projects.length}`;
  
  const histEl = $('#project-history');
  if (histEl) {
    if (!projects.length) {
      histEl.innerHTML = `<div class="empty-projects-note"><span class="empty-box-icon">📁</span><p>Chưa có kịch bản nào.</p><span class="tiny">Bấm <b>＋ Kịch bản mới</b> để bắt đầu.</span></div>`;
    } else {
      histEl.innerHTML = projects.map(p => {
        const isCurrent = state.project?.id === p.id;
        return `<div class="project-card ${isCurrent ? 'active' : ''}" data-action="open" data-id="${esc(p.id)}" title="${esc(p.topic)}">
          <div class="project-card-top">
            <span class="project-badge ${p.mode==='demo'?'demo':'live'}">${p.mode==='demo'?'Thử nghiệm':'Chính thức'}</span>
            <span class="project-date">${day(p.updatedAt)}</span>
          </div>
          <div class="project-card-title">${esc(p.topic || 'Kịch bản chưa đặt tên')}</div>
          ${isCurrent ? '<div class="project-card-active-indicator"><span class="active-dot"></span> Đang mở</div>' : ''}
        </div>`;
      }).join('');
    }
  }

  const breadcrumb = $('#breadcrumb-current');
  if (breadcrumb) breadcrumb.textContent = labels[state.view] || '';
  applyTheme(state.theme || getTheme());
  document.querySelectorAll('[data-action="new"]').forEach(b => b.disabled = state.busy);
}
function steps(active) {
  const views = ['brief', 'sources', 'script', 'export'];
  const stepLabels = ['Đặt đề bài', 'Duyệt nguồn', 'Viết & đối chiếu', 'Duyệt & xuất'];
  return `<div class="stepper" aria-label="Tiến trình">${stepLabels.map((s,i)=>{
    const isCurrent = i === active;
    const isDone = i < active;
    const canNav = Boolean(state.project || i === 0);
    return `<button type="button" class="step ${isCurrent?'active':isDone?'done':''} ${canNav?'clickable':''}" ${canNav?`data-action="navigate" data-view="${views[i]}"`:'disabled'}>
      <b>${isDone?'✓':i+1}</b>
      <span>${s}</span>
    </button>`;
  }).join('')}</div>`;
}
function demoBanner() { return state.project?.mode==='demo'?'<div class="banner demo">◇ Bộ thử minh họa · Dữ liệu do nhóm tự tạo. Không tìm web, không gọi AI, không dùng làm tài liệu giảng dạy.</div>':''; }
function header(eyebrow,title,subtitle,extra='') { return `<div class="heading-row"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p class="subtitle">${subtitle}</p></div>${extra}</div>`; }
function render() {
  shell();
  const views={brief:briefView,sources:sourcesView,script:scriptView,export:exportView,audit:auditView};
  $('#workspace').innerHTML=(state.project?`<nav class="mobile-nav" aria-label="Chuyển bước">${Object.entries(labels).map(([key,label])=>`<button class="text-button" data-action="navigate" data-view="${key}">${label}</button>`).join('')}</nav>`:'')+views[state.view]();
}
function getBlueprintData(b) {
  const duration = Number(b?.duration) || 10;
  const topic = (b?.topic || '').trim() || 'Chủ đề bài giảng của bạn';
  const audience = (b?.audience || '').trim() || 'Người mới tìm hiểu';
  const goal = (b?.goal || '').trim();
  const words = duration * 140;
  const sources = Math.max(2, Math.round(duration * 0.8));

  let scenes = [];
  if (duration <= 1) {
    scenes = [
      { time: '00:00 - 00:20', tag: 'Hook', title: `Hiện tượng bất ngờ về ${topic}`, cite: '1 nguồn' },
      { time: '00:20 - 01:00', tag: 'Cốt lõi', title: `Bản chất vấn đề & Bài học 10 giây`, cite: '1 nguồn' }
    ];
  } else if (duration <= 3) {
    scenes = [
      { time: '00:00 - 00:45', tag: 'Mở đầu', title: `Đặt câu hỏi mâu thuẫn về ${topic}`, cite: '1 nguồn' },
      { time: '00:45 - 02:15', tag: 'Khai triển', title: `Cơ chế gốc & Bằng chứng thực nghiệm`, cite: '2 nguồn' },
      { time: '02:15 - 03:00', tag: 'Đúc kết', title: `Bài học ứng dụng tức thì cho ${audience}`, cite: '1 nguồn' }
    ];
  } else if (duration <= 5) {
    scenes = [
      { time: '00:00 - 01:00', tag: 'Mở đầu', title: `Tình huống thực tế dẫn nhập vào ${topic}`, cite: '1 nguồn' },
      { time: '01:00 - 02:30', tag: 'Luận điểm 1', title: `Giải thích bản chất & Lý do xảy ra`, cite: '2 nguồn' },
      { time: '02:30 - 04:00', tag: 'Luận điểm 2', title: `Thực nghiệm đối chứng & Dữ liệu xác thực`, cite: '1 nguồn' },
      { time: '04:00 - 05:00', tag: 'Tổng kết', title: `Quy tắc cốt lõi dành cho ${audience}`, cite: '1 nguồn' }
    ];
  } else if (duration <= 10) {
    scenes = [
      { time: '00:00 - 01:30', tag: 'Cảnh 01', title: `Hiện tượng & Lý do cần hiểu sâu ${topic}`, cite: '1 nguồn' },
      { time: '01:30 - 03:30', tag: 'Cảnh 02', title: `Cơ sở lý thuyết & Bằng chứng khoa học`, cite: '2 nguồn' },
      { time: '03:30 - 05:30', tag: 'Cảnh 03', title: `Thực nghiệm đối chứng & Phân tích nguyên nhân`, cite: '2 nguồn' },
      { time: '05:30 - 07:30', tag: 'Cảnh 04', title: `Những hiểu lầm phổ biến & Bằng chứng phản biện`, cite: '1 nguồn' },
      { time: '07:30 - 09:00', tag: 'Cảnh 05', title: `Quy trình giải quyết chuẩn từng bước`, cite: '1 nguồn' },
      { time: '09:00 - 10:00', tag: 'Cảnh 06', title: `Đúc kết toàn bài & Bài tập tư duy cho ${audience}`, cite: '1 nguồn' }
    ];
  } else if (duration <= 20) {
    scenes = [
      { time: '00:00 - 02:00', tag: 'Phần 1', title: `Mở đầu: Đặt bài toán lớn về ${topic}`, cite: '2 nguồn' },
      { time: '02:00 - 06:00', tag: 'Phần 2', title: `Khung lý thuyết & Nền tảng học thuật`, cite: '3 nguồn' },
      { time: '06:00 - 11:00', tag: 'Phần 3', title: `Nghiên cứu ca điển hình (Case Study) chuyên sâu`, cite: '3 nguồn' },
      { time: '11:00 - 16:00', tag: 'Phần 4', title: `Phân tích dữ liệu đối chiếu & Thảo luận rủi ro`, cite: '2 nguồn' },
      { time: '16:00 - 18:30', tag: 'Phần 5', title: `Giải pháp thực hành và chuyển giao kinh nghiệm`, cite: '2 nguồn' },
      { time: '18:30 - 20:00', tag: 'Phần 6', title: `Tổng kết chuyên đề & Bài tập đánh giá cho ${audience}`, cite: '1 nguồn' }
    ];
  } else {
    scenes = [
      { time: '00:00 - 03:00', tag: 'Chương 1', title: `Tổng quan & Động lực nghiên cứu ${topic}`, cite: '3 nguồn' },
      { time: '03:00 - 10:00', tag: 'Chương 2', title: `Hệ thống hóa kiến thức & Cơ sở dữ liệu`, cite: '4 nguồn' },
      { time: '10:00 - 18:00', tag: 'Chương 3', title: `Thực nghiệm, kiểm chứng và đối chiếu đa nguồn`, cite: '5 nguồn' },
      { time: '18:00 - 25:00', tag: 'Chương 4', title: `Ứng dụng thực tế & Hướng dẫn cho ${audience}`, cite: '3 nguồn' },
      { time: '25:00 - 30:00', tag: 'Chương 5', title: `Tổng kết toàn khóa & Tài liệu mở rộng`, cite: '2 nguồn' }
    ];
  }

  let pacing = 'Nhịp chuẩn · Cân bằng giữa giải thích & chứng minh';
  const audLower = audience.toLowerCase();
  if (audLower.includes('mới') || audLower.includes('cơ bản') || audLower.includes('bắt đầu')) {
    pacing = 'Nhịp chậm · Tăng ví dụ trực quan & giải thích khái niệm';
  } else if (audLower.includes('chuyên') || audLower.includes('kỹ sư') || audLower.includes('lập trình') || audLower.includes('nghiên cứu')) {
    pacing = 'Nhịp nhanh · Tập trung dữ liệu gốc, công thức & luận cứ kỹ thuật';
  } else if (audLower.includes('học sinh') || audLower.includes('sinh viên')) {
    pacing = 'Nhịp sư phạm · Có tình huống dẫn nhập & chốt ý sau từng cảnh';
  }

  return { duration, topic, audience, goal, words, sources, scenes, pacing };
}

function blueprintView(b) {
  const d = getBlueprintData(b);
  const hookEnd = (d.duration * 0.15).toFixed(1).replace('.0','');
  const coreEnd = (d.duration * 0.85).toFixed(1).replace('.0','');
  return `<div class="blueprint-card" id="live-blueprint">
    <div class="blueprint-top">
      <div class="blueprint-badge"><span class="pulse-dot"></span> BẢN PHÁC THẢO THỜI GIAN THỰC</div>
    </div>
    <div class="blueprint-stats">
      <div class="blueprint-stat"><span class="stat-label">Thời lượng</span><strong>${d.duration} phút</strong></div>
      <div class="blueprint-stat"><span class="stat-label">Số cảnh</span><strong>${d.scenes.length} phân cảnh</strong></div>
      <div class="blueprint-stat"><span class="stat-label">Dung lượng</span><strong>~${d.words.toLocaleString('vi-VN')} từ</strong></div>
      <div class="blueprint-stat"><span class="stat-label">Nguồn dự kiến</span><strong>~${d.sources} nguồn</strong></div>
    </div>
    <div class="blueprint-timeline">
      <div class="timeline-header"><span>PHÂN BỔ THỜI LƯỢNG (CHUẨN SƯ PHẠM)</span><span>TỔNG ${d.duration} PHÚT</span></div>
      <div class="timeline-bar">
        <div class="timeline-seg hook" style="width: 15%" title="Mở đầu / Thu hút (15%)"><span>Mở đầu (15%)</span></div>
        <div class="timeline-seg core" style="width: 70%" title="Khai triển luận điểm & Dẫn chứng (70%)"><span>Khai triển kiến thức (70%)</span></div>
        <div class="timeline-seg outro" style="width: 15%" title="Đúc kết & Hành động (15%)"><span>Đúc kết (15%)</span></div>
      </div>
      <div class="timeline-ticks"><span>00:00</span><span>~${hookEnd}m</span><span>~${coreEnd}m</span><span>${d.duration}:00</span></div>
    </div>
    <div class="blueprint-paper">
      <div class="paper-header">
        <span class="paper-tag">KỊCH BẢN DỰ KIẾN</span>
        <span class="paper-meta" title="${esc(d.topic)}">${esc(d.topic)}</span>
      </div>
      <div class="blueprint-scenes">
        ${d.scenes.map((s, idx) => `
          <div class="blueprint-scene-row">
            <span class="scene-idx">${String(idx + 1).padStart(2, '0')}</span>
            <div class="scene-details">
              <div class="scene-head-line">
                <span class="scene-tag">${esc(s.tag)}</span>
                <span class="scene-time">${esc(s.time)}</span>
                <span class="scene-cite-req">${esc(s.cite)} ↗</span>
              </div>
              <p class="scene-title-text">${esc(s.title)}</p>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
    <div class="blueprint-footer-note">
      <div class="blueprint-tone">
        <span class="tone-icon">◎</span>
        <div>
          <strong>Phong cách: ${esc(d.audience)}</strong>
          <p>${esc(d.pacing)}</p>
        </div>
      </div>
      ${d.goal ? `
      <div class="blueprint-goal-box">
        <span class="goal-tag">MỤC TIÊU ĐẦU RA CAM KẾT</span>
        <p>${esc(d.goal)}</p>
      </div>` : ''}
    </div>
  </div>`;
}

function updateLiveBlueprint() {
  const form = $('#brief-form');
  if (!form) return;
  const data = Object.fromEntries(new FormData(form));
  const container = $('#blueprint-container');
  if (container) {
    container.innerHTML = blueprintView(data);
  }
}

function briefView() {
  const b=state.project?.brief || {};
  return `${steps(0)}
  <div class="brief-layout"><form class="card modern-box" id="brief-form">
    <div class="card-glow-bar"></div>
    <div class="card-heading">
      <div>
        <span class="box-tag">THIẾT KẾ ĐỀ BÀI</span>
        <h2>Bạn muốn dạy điều gì?</h2>
      </div>
      <span class="section-number">01 / 04</span>
    </div>
    <label class="field">
      <div class="field-top">
        <span class="field-label">Chủ đề bài giảng <span class="required">*</span></span>
        <div class="quick-chips">
          <span class="chip-hint">Gợi ý:</span>
          <button type="button" class="quick-chip" data-action="fill-topic" data-fill="Vì sao AI trả lời sai mà vẫn rất tự tin?">✦ Ảo giác AI</button>
          <button type="button" class="quick-chip" data-action="fill-topic" data-fill="RAG là gì và giúp AI tra cứu chính xác ra sao?">✦ RAG & Bằng chứng</button>
          <button type="button" class="quick-chip" data-action="fill-topic" data-fill="Prompt Engineering cơ bản cho người mới bắt đầu">✦ Prompt Engineering</button>
        </div>
      </div>
      <div class="input-wrap">
        <input name="topic" required minlength="8" maxlength="300" value="${esc(b.topic || '')}" placeholder="Ví dụ: Vì sao AI trả lời sai mà vẫn rất tự tin?">
      </div>
      <span class="field-hint">Một chủ đề cụ thể giúp tìm đúng tài liệu chuyên sâu.</span>
    </label>
    <label class="field">
      <span class="field-label">Mục tiêu học tập <span class="required">*</span></span>
      <div class="input-wrap">
        <textarea name="goal" required maxlength="700" rows="3" placeholder="Sau video, người học sẽ hiểu hoặc làm được điều gì?">${esc(b.goal || '')}</textarea>
      </div>
      <span class="field-hint">Xác định kiến thức hoặc kỹ năng cụ thể sau khi xem bài giảng.</span>
    </label>
    <div class="field-row">
      <label class="field">
        <span class="field-label">Người học là ai? <span class="required">*</span></span>
        <div class="input-wrap">
          <input name="audience" required maxlength="200" value="${esc(b.audience || '')}" placeholder="Người mới tìm hiểu về AI">
        </div>
        <span class="field-hint">Điều chỉnh thuật ngữ và ví dụ cho đối tượng này.</span>
      </label>
      <label class="field">
        <span class="field-label">Thời lượng video <span class="required">*</span></span>
        <div class="input-wrap select-wrap">
          <select name="duration">${[1,3,4,5,10,15,20,30].map(n=>`<option value="${n}" ${Number(b.duration || 10)===n?'selected':''}>Khoảng ${n} phút</option>`).join('')}</select>
        </div>
        <span class="field-hint">Phân bổ nhịp độ và cấu trúc theo thời lượng này.</span>
      </label>
    </div>
    <div class="form-bottom">
      <div class="form-bottom-note">
        <span class="note-icon">✦</span>
        <span>AI sẽ quét & đối chiếu tài liệu học thuật theo đề bài của bạn</span>
      </div>
      <button class="button primary action-cta" type="submit">
        <span>${state.project?'Tạo đề bài mới':'Bắt đầu tìm nguồn'}</span>
        <span class="arrow">↗</span>
      </button>
    </div>
  </form>
  <aside class="brief-aside"><div id="blueprint-container">${blueprintView(b)}</div></aside></div>`;
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
  return `${steps(1)}${demoBanner()}
  ${p.conflicts.length?`<div class="banner">⚑ Có ${p.conflicts.length} cặp bằng chứng cần đối chiếu. <button class="text-button" data-action="conflicts">Xem khác biệt →</button></div>`:''}
  <div class="source-layout">
    <section class="source-main-card card">
      <div class="card-heading">
        <h2>${p.sources.length} nguồn trong hồ sơ</h2>
        <div class="button-row">
          ${p.mode==='live'&&p.sources.length?`<button class="text-button" data-action="research" ${!state.boot.searchEnabled?'disabled':''}>↻ Tìm thêm nguồn chuyên sâu</button>`:''}
          <button class="text-button" data-action="criteria">Tiêu chí đánh giá ⓘ</button>
        </div>
      </div>
      <div class="source-list-scroll">
        ${p.sources.length?p.sources.map(sourceCard).join(''):`
          <div class="empty-state">
            <div class="empty-icon">⌕</div>
            <h2>Chưa có tài liệu</h2>
            <p>${state.boot.searchEnabled?`Tìm nguồn qua ${esc(state.boot.searchLabel)} từ chủ đề và mục tiêu của bạn.`:'Cấu hình dịch vụ tìm kiếm để tự tìm nguồn, hoặc thêm một URL HTTPS công khai ở bên dưới.'}</p>
            <button class="button primary action-cta" data-action="research" ${!state.boot.searchEnabled&&p.mode!=='demo'?'disabled':''}>
              <span>Tìm nguồn trên web</span>
              <span class="arrow">↗</span>
            </button>
          </div>
        `}
        ${p.failures.length?`<div class="card error-card"><h3>Nguồn không đọc được</h3>${p.failures.map(f=>`<p class="tiny">${esc(f.url)}<br>${esc(f.reason)}</p>`).join('')}</div>`:''}
      </div>
      ${p.mode==='live'?`
        <form id="source-form" class="source-add-bar">
          <span class="add-bar-label">Bổ sung nguồn:</span>
          <input name="url" type="url" required maxlength="2000" placeholder="https://…" aria-label="URL nguồn bổ sung">
          <button class="button secondary" type="submit">＋ Đọc và lập hồ sơ</button>
        </form>
      `:'<div class="source-add-bar"><button class="button secondary" data-action="hard-cases">＋ Thử hai nguồn mâu thuẫn & nguồn cũ</button></div>'}
    </section>
    <aside class="sticky-card source-aside-card">
      <div class="eyebrow">BẠN QUYẾT ĐỊNH</div>
      <h3>Chọn căn cứ cho bài viết</h3>
      <div class="summary-line"><span>Đã duyệt</span><b>${approved}</b></div>
      <div class="summary-line"><span>Chờ quyết định</span><b>${pending}</b></div>
      <div class="summary-line"><span>Đã loại / cách ly</span><b>${p.sources.length-approved-pending}</b></div>
      <div class="rule"></div>
      <p>Điểm là tổng tiêu chí công khai, không phải xác suất thông tin đúng. Đọc bản gốc và kiểm tra ngữ cảnh trước khi duyệt.</p>
      ${pending?'<button class="button secondary full-width" data-action="approve-all-sources">✓ Duyệt tất cả nguồn đủ điều kiện</button><p class="field-hint">Nguồn cách ly, thiếu điều kiện hoặc cần ghi chú sẽ không được duyệt tự động.</p>':''}
      <button class="button primary full-width" data-action="${p.scenes.length?'to-script':'generate'}" ${!p.scenes.length&&(pending||!approved)?'disabled':''}>${p.scenes.length?'Đến kịch bản':'Viết kịch bản toàn bài'} →</button>
      ${pending?'<p class="field-hint">Duyệt hoặc bỏ các nguồn còn chờ để tiếp tục.</p>':''}
      <div class="aside-bottom-link">
        <div class="rule"></div>
        <button class="text-button" data-action="profile-download">↓ Tải hồ sơ nguồn hiện tại</button>
      </div>
    </aside>
  </div>`;
}
function sceneCard(s, total) {
  const editing=state.editing===s.id;
  const hasIssues=Boolean(s.issues?.length);
  const phase=(s.section || (s.n===1?'Mở đầu':s.n===total?'Kết bài':'Nội dung')).toUpperCase();
  return `<article id="scene-${esc(s.id)}" class="scene-card ${s.decision}"><div class="scene-head"><div><span class="scene-number">Cảnh ${String(s.n).padStart(2,'0')}</span><span class="scene-label">${phase} · ${esc(s.style)}</span></div>${badge(s.status)}</div><div class="scene-content">
  ${editing?`<form class="scene-edit" data-scene="${s.id}"><label class="field"><span class="field-label">Nội dung slide · hai đến năm dòng</span><textarea name="slideBullets" required maxlength="604">${esc((s.slideBullets||[]).join('\n'))}</textarea></label><label class="field"><span class="field-label">Script nói · một ý dạy hoàn chỉnh, viết số bằng chữ</span><textarea name="text" required maxlength="6000">${esc(s.text)}</textarea></label><div class="field-row"><label class="field"><span class="field-label">Thông điệp chính · tối đa 100 ký tự</span><input name="screenText" required maxlength="100" value="${esc(s.screenText)}"></label><label class="field"><span class="field-label">Ý đồ hình</span><input name="visual" required maxlength="1000" value="${esc(s.visual)}"></label></div><div class="button-row"><button type="submit" class="button">Lưu & kiểm tra lại</button><button type="button" class="button secondary" data-action="cancel-edit">Hủy</button></div></form>`:s.text?`<div><h3>${esc(s.title)}</h3><div class="scene-info"><div><strong>NỘI DUNG SLIDE</strong><ul>${(s.slideBullets||[]).map(item=>`<li>${esc(item)}</li>`).join('')}</ul></div><div><strong>Ý ĐỒ HÌNH</strong><p>${esc(s.visual || '—')}</p></div></div><div class="eyebrow">SCRIPT NÓI</div><p class="scene-text">${esc(s.text)}</p><p class="tiny">Thông điệp chính: ${esc(s.screenText || '—')}</p></div>`:`<div class="banner error">Không sinh nội dung. ${esc(s.reason)}</div>`}
  <div class="citation-list">${s.citations.map((c,i)=>`<button class="citation-button" data-action="citation" data-id="${s.id}" data-index="${i}">↗ ${esc(c.title)} · ${esc(c.chunkId)}</button>`).join('')}${s.decision==='pending'&&s.text?`<button class="citation-button" data-action="add-evidence" data-id="${s.id}">＋ Bổ sung dẫn chứng</button>`:''}</div>
  <p class="review-note">${esc(s.reason)}</p>${s.issues?.length&&s.status!=='NO_SOURCE'?`<ul class="warning-list">${s.issues.map(i=>`<li>${esc(i)}</li>`).join('')}</ul>`:''}
  ${s.conflict?`<div class="banner">⚑ ${esc(s.conflict)}</div><label class="field"><span class="field-label">Cách xử lý mâu thuẫn</span><textarea class="inline-input" id="resolution-${s.id}" maxlength="1000" placeholder="Ghi phạm vi, thời điểm hoặc lý do không dùng số liệu…">${esc(s.resolution)}</textarea></label>`:''}
  ${s.claimType==='statistic'?`<label class="checkbox-row"><input type="checkbox" id="independent-${s.id}" ${s.numericVerified?'checked':''}><span>Tôi đã đối chiếu ít nhất hai nguồn thực sự độc lập, cùng xác nhận số liệu và phạm vi đo (${s.independentGroups.length} nhóm tổ chức được dẫn).</span></label>`:''}
  ${!editing?`<div class="scene-bottom">${s.decision==='accepted'?'<span class="badge approved">✓ Đã đối chiếu & chấp nhận</span>':s.decision==='rejected'?'<span class="tiny">Đã bỏ khỏi bản xuất.</span>':`${hasIssues?`<div class="review-blocker">Cần sửa trước khi xác nhận: ${esc(s.issues.join(' '))}</div>`:''}<label class="checkbox-row"><input type="checkbox" id="scene-verify-${s.id}" ${s.status==='NO_SOURCE'||hasIssues?'disabled':''}><span>Tôi đã đọc bằng chứng, kiểm tra mọi ý, thuật ngữ và hình minh họa.</span></label>`}<div class="button-row">${s.decision==='pending'?`<button class="button small" data-action="accept-scene" data-id="${s.id}" ${s.status==='NO_SOURCE'||hasIssues?'disabled':''}>✓ Chấp nhận</button><button class="button secondary small" data-action="edit-scene" data-id="${s.id}" ${s.status==='NO_SOURCE'?'disabled':''}>Sửa</button><button class="button secondary small" data-action="reject-scene" data-id="${s.id}">Bỏ</button>`:`<button class="button secondary small" data-action="reset-scene" data-id="${s.id}">Duyệt lại</button>`}</div></div>`:''}</div></article>`;
}
function scriptView() {
  const p=state.project, accepted=p.scenes.filter(s=>s.decision==='accepted').length, need=p.scenes.filter(s=>s.needsRepair).length;
  const malformed=p.scenes.filter(s=>s.issues?.length).length;
  const formatIssues=p.scenes.filter(s=>s.decision==='pending'&&s.issues?.some(issue=>issue.includes('Lời đọc còn chữ số')||issue.includes('Lời đọc còn viết tắt'))).length;
  const canRegenerate=p.scenes.length&&p.scenes.every(s=>s.decision==='pending');
  const target=p.scriptPlan?.sceneCount||p.scenes.length, estimatedSeconds=Math.round(p.scenes.filter(s=>s.decision!=='rejected').reduce((n,s)=>n+s.text.split(/\s+/).filter(Boolean).length,0)/2.9);
  return `${steps(2)}${demoBanner()}
  <div class="script-toolbar">
    <div class="stat-pills"><span class="stat-pill"><b>${p.scenes.length}/${target}</b> cảnh toàn bài</span><span class="stat-pill"><b>${accepted}</b> đã chấp nhận</span><span class="stat-pill"><b>${p.scenes.filter(s=>s.status==='NEEDS_VERIFY').length}</b> cần đối chiếu ý nghĩa</span><span class="stat-pill"><b>${estimatedSeconds}</b> giây đọc / mục tiêu ${p.brief.duration} phút</span></div>
    <div class="button-row"><button class="button secondary small" data-action="approve-all-scenes">✓ Duyệt tất cả cảnh đủ điều kiện</button><button class="button secondary small" data-action="to-sources">← Xem lại nguồn</button></div>
  </div>
  ${need?`<div class="banner error">${need} câu mất căn cứ sau khi bỏ nguồn. Các câu khác giữ nguyên. <button class="text-button" data-action="repair">Viết lại phần bị ảnh hưởng →</button></div>`:''}
  ${canRegenerate?`<div class="banner ${malformed?'error':''}">${malformed?`${malformed} cảnh chưa đúng mẫu. `:'Bạn chưa duyệt hoặc bỏ cảnh nào nên có thể '}Viết lại toàn bài sẽ tạo lại toàn bộ lời dạy từ evidence hiện có. <button class="text-button" data-action="regenerate">Viết lại toàn bài →</button></div>`:''}
  ${formatIssues?`<div class="banner">${formatIssues} cảnh còn chữ số hoặc viết tắt trong lời đọc. <button class="text-button" data-action="normalize-format">Tự chuẩn hóa lời đọc →</button><br><span class="tiny">Chỉ đổi cách đọc số và mở rộng viết tắt; không đổi giá trị, nguồn hay quyết định kiểm chứng.</span></div>`:''}
  ${p.scenes.length && (estimatedSeconds<p.brief.duration*60*.85 || p.scenes.some(s=>s.status==='NO_SOURCE'))?'<div class="banner error">Bản nháp còn thiếu nội dung hoặc chưa đủ thời lượng. Bổ sung học liệu chuyên sâu rồi viết lại; không dùng các câu lặp để kéo dài bài.</div>':''}
  ${p.scriptPlan?.missingEvidence?.length?`<div class="banner"><strong>Phần còn thiếu căn cứ</strong><ul>${p.scriptPlan.missingEvidence.map(item=>`<li>${esc(item)}</li>`).join('')}</ul></div>`:''}
  <div class="scene-list">${p.scenes.length?p.scenes.map(s=>sceneCard(s,p.scenes.length)).join(''):'<div class="empty-state"><div class="empty-icon">≡</div><h2>Nguồn sẵn sàng, bài học bắt đầu</h2><p>Duyệt hồ sơ nguồn trước khi tạo kịch bản đầy đủ có trích dẫn.</p><button class="button primary" data-action="to-sources">Đến hồ sơ nguồn →</button></div>'}</div>
  ${p.scenes.length?'<div class="form-bottom"><p class="tiny">Lời giảng được soạn để đọc nguyên văn. Thời lượng ước tính theo 2,9 tiếng/giây, chưa gồm dừng hình và thao tác. Độ dài không bảo đảm độ đúng; từng slide vẫn phải được đối chiếu nguồn.</p><button class="button primary" data-action="to-export">Duyệt & xuất kịch bản →</button></div>':''}`;
}
function exportView() {
  const p=state.project, accepted=p.scenes.filter(s=>s.decision==='accepted').length, pending=p.scenes.filter(s=>s.decision==='pending').length;
  const ready=accepted>0&&pending===0;
  const files=[['markdown','MD','script.md','Kịch bản đúng mẫu, có bằng chứng'],['script','JSON','script.json','Câu / cảnh để chuyển sang C4'],['profile','JSON','source-profile.json','Tác giả, ngày, đánh giá & claim'],['trace','JSON','trace.json','Liên kết từng câu với nguồn'],['audit','JSON','audit-log.json','Lịch sử duyệt và thay đổi']];
  return `${steps(3)}${demoBanner()}
  ${!ready?`<div class="banner">Còn ${pending} câu chờ quyết định; ${accepted} câu được chấp nhận. <button class="text-button" data-action="to-script">Quay lại đối chiếu →</button></div>`:''}
  <div class="export-grid"><section class="card"><div class="card-heading"><h2>Bộ bàn giao</h2><span class="badge">${accepted} câu đã duyệt</span></div>${files.map(([key,type,name,desc])=>`<div class="download-item"><span class="download-icon">${type}</span><div><strong>${name}</strong><p>${desc}</p></div><button class="button secondary small" data-action="download" data-key="${key}" ${!p.teacherApproval?'disabled':''} aria-label="Tải ${name}">↓ Tải</button></div>`).join('')}<div class="rule"></div><p class="tiny">Tệp tải xuống chứa trích đoạn cần thiết và đường dẫn gốc. Không xuất toàn bộ nội dung đã thu thập; người dùng chịu trách nhiệm quyền sử dụng.</p></section>
  <section class="card"><div class="eyebrow">GIẢNG VIÊN DUYỆT CUỐI</div><h2>Kiểm soát trước khi xuất</h2><p class="subtitle">Mỗi lần sửa câu hoặc thay đổi nguồn sẽ hủy xác nhận này và yêu cầu duyệt lại.</p>${p.teacherApproval?`<div class="banner success">✓ Đã duyệt bởi ${esc(p.teacherApproval.reviewer)}<br>${day(p.teacherApproval.at)} · ${accepted} câu được giữ</div>`:`<form id="teacher-form"><label class="field"><span class="field-label">Mã người duyệt</span><input name="reviewer" required maxlength="80" placeholder="Ví dụ: GV01 — không cần tên cá nhân"></label><label class="checkbox-row"><input name="confirmed" type="checkbox" required ${!ready?'disabled':''}><span>Tôi là giảng viên/người phụ trách nội dung, đã kiểm tra ý nghĩa, số liệu, nguồn, quyền sử dụng và đồng ý bản này để chuyển sang dựng video.</span></label><button class="button primary full-width" type="submit" ${!ready?'disabled':''}>Xác nhận bản cuối</button><p class="field-hint">Bản cục bộ dùng xác nhận tự khai, chưa xác thực danh tính qua tài khoản.</p></form>`}</section></div>`;
}
const eventLabels={ 'project.created':'Tạo đề bài','demo.loaded':'Nạp bộ thử','fixture.loaded':'Nạp trang thử','ai.completed':'AI hoàn thành','ai.error':'Lỗi AI','ai.output_retry':'AI trả lại kết quả theo cấu trúc','ai.output_invalid':'Đầu ra AI bị chặn','search.completed':'Tìm kiếm hoàn thành','source.fetched':'Đọc & lưu nguồn','source.approved':'Duyệt nguồn','source.approved_all':'Duyệt nguồn hàng loạt','source.rejected':'Loại nguồn','source.rechecked':'Kiểm tra lại nguồn','script.created':'Tạo kịch bản','script.failed':'Tạo kịch bản thất bại','script.repaired':'Viết lại câu phụ thuộc','script.format_normalized':'Chuẩn hóa cách đọc số','sentence.accept':'Chấp nhận câu','sentence.accept_all':'Chấp nhận cảnh hàng loạt','sentence.reject':'Bỏ câu','sentence.edit':'Sửa câu','sentence.evidence_attached':'Bổ sung dẫn chứng cho cảnh','teacher.approved':'Giảng viên duyệt','export.created':'Xuất bộ bàn giao' };
function auditView() {
  const p=state.project;return `${header('DẤU VẾT QUYẾT ĐỊNH','Mọi thay đổi <em>đều rõ ràng.</em>','Xem nguồn nào được dùng, câu nào bị ảnh hưởng và ai xác nhận bản cuối.')}${demoBanner()}<section class="card"><table class="audit-table"><thead><tr><th>THỜI ĐIỂM</th><th>THAO TÁC</th><th>CHI TIẾT</th></tr></thead><tbody>${[...p.audit].reverse().map(a=>`<tr><td>${new Date(a.at).toLocaleTimeString('vi-VN')}</td><td>${esc(eventLabels[a.event]||a.event)}</td><td class="audit-detail">${esc(JSON.stringify(Object.fromEntries(Object.entries(a).filter(([k])=>!['at','event'].includes(k)))))}</td></tr>`).join('')}</tbody></table></section><div class="delete-row"><button class="text-button" data-action="delete">Xóa dữ liệu dự án này</button></div>`;
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
  const sources=state.project.sources.filter(source=>source.decision==='approved'&&source.provenance?.verified&&
    (scene.claimType!=='statistic'||!citedGroups.has(source.publisherGroup)));
  if(!sources.length){notice(scene.claimType==='statistic'?'Chưa có nguồn đã duyệt thuộc tổ chức độc lập. Hãy thêm URL ở Hồ sơ nguồn, duyệt nguồn đó rồi quay lại cảnh này.':'Chưa có nguồn đã duyệt để chọn dẫn chứng.',true);return;}
  showDialog('Bổ sung dẫn chứng',`<p>Chọn tối đa tám đoạn thực sự hỗ trợ cảnh này. ${scene.claimType==='statistic'?'Vì đây là số liệu, chỉ hiện nguồn thuộc tổ chức khác với các nguồn đang được dẫn.':''} Đoạn chọn được gắn nguyên văn, không do AI tự tạo.</p><form id="citation-form" data-scene="${esc(scene.id)}"><div class="evidence-picker">${sources.map(source=>`<details><summary>${esc(source.title)} · ${esc(source.publisher)}${citedGroups.has(source.publisherGroup)?' · nguồn đang dẫn':' · tổ chức mới'}</summary><p class="tiny">${esc(source.url)}</p>${source.chunks.filter(chunk=>String(chunk.text||'').trim().length>=12).map(chunk=>`<label class="evidence-choice"><input type="checkbox" name="chunkIds" value="${esc(chunk.id)}"><span><strong>${esc(chunk.id)} · ${esc(chunk.locator)}</strong>${esc(chunk.text)}</span></label>`).join('')}</details>`).join('')}</div><p class="field-hint">Sau khi lưu, cảnh trở về trạng thái chờ duyệt để bạn đọc lại bằng chứng và xác nhận.</p><div class="button-row"><button class="button" type="submit">Gắn dẫn chứng đã chọn</button><button class="button secondary" type="button" data-action="close-dialog">Hủy</button></div></form>`);
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
  showDialog('Chấp nhận tất cả cảnh',`<p>Chỉ cảnh đang chờ và vượt qua đúng các kiểm tra như khi duyệt từng cảnh mới được chấp nhận. Cảnh thiếu nguồn, còn lỗi mẫu, số liệu chưa có hai nguồn độc lập hoặc có mâu thuẫn chưa giải quyết sẽ được giữ lại.</p><form id="approve-all-scenes-form"><label class="check-row"><input name="confirmed" type="checkbox" required><span>Tôi đã đọc bằng chứng và đối chiếu ý nghĩa, thuật ngữ, hình minh họa của từng cảnh đủ điều kiện.</span></label><div class="button-row"><button class="button" type="submit">Chấp nhận các cảnh đủ điều kiện</button><button class="button secondary" type="button" data-action="close-dialog">Hủy</button></div></form>`);
}
async function run(action,message,viewAfter=state.view,restore={}) {
  if(state.busy)return;state.busy=true;state.output=null;shell();
  const previousTop=window.scrollY;
  $('#workspace').innerHTML=`<div class="loading-panel" role="status"><span class="spinner"></span><h2>${esc(message)}</h2><p>Đang xử lý yêu cầu thật. Tài liệu đã lưu sẽ được giữ lại nếu có lỗi.</p><p>Với tìm web, hệ thống sẽ tải và đối chiếu từng nguồn; có thể cần một vài phút.</p></div>`;
  try { const result=await action();if(result?.id){state.project=result;remember(result.id);}if(viewAfter!==undefined)state.view=viewAfter;await bootstrap(); }
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
  if(action==='toggle-theme')return toggleTheme();
  if(action==='help')return help();
  if(state.busy)return;
  if(action==='new'){state.project=null;state.view='brief';state.editing=null;remember(null);render();return;}
  if(action==='navigate'){state.view=button.dataset.view;state.editing=null;render();return;}
  if(action.startsWith('to-')){state.view=action.slice(3);state.editing=null;render();window.scrollTo(0,0);return;}
  if(action==='open')return run(async()=>{
    const p = await api(`/api/projects/${id}`);
    state.view = p.scenes?.length ? 'script' : 'sources';
    return p;
  },'Đang mở bản đã lưu…', undefined);
  if(action==='demo')return run(async()=>{
    state.project=await api('/api/projects',{topic:'Vì sao câu trả lời của mô hình cần được kiểm chứng?',goal:'Biết đối chiếu câu trả lời với tài liệu trước khi viết bài giảng.',audience:'Người mới tìm hiểu về mô hình học máy',duration:3,mode:'demo'});
    return post('research');
  },'Đang mở bộ thử tại máy…','sources');
  if(action==='research')return run(()=>post('research'),'Đang tìm và đọc nguồn trên web…','sources');
  if(action==='generate')return run(()=>post('generate'),'Đang lập dàn bài và soạn lời giảng chi tiết từng slide; bài dài có thể cần vài phút…','script');
  if(action==='regenerate')return run(()=>post('regenerate'),'Đang lập lại dàn bài và soạn chi tiết; giữ bản cũ nếu gọi model thất bại…','script');
  if(action==='repair')return run(()=>post('repair'),'Chỉ viết lại các câu bị ảnh hưởng…','script');
  if(action==='normalize-format')return run(()=>post('format'),'Đang chuẩn hóa chữ số và viết tắt trong lời đọc…','script');
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
  if(action==='edit-scene'){state.editing=id;render();return;}
  if(action==='cancel-edit'){state.editing=null;render();return;}
  if(action==='accept-scene'){
    const scene=state.project.scenes.find(x=>x.id===id);
    if(scene?.issues?.length)return notice('Cảnh này chưa đúng mẫu; hãy bấm Sửa hoặc viết lại toàn bài trước khi chấp nhận.',true);
    const verified=$(`#scene-verify-${id}`)?.checked;
    if(!verified)return notice('Hãy xác nhận đã đọc bằng chứng và đối chiếu nội dung.',true);
    const independent=$(`#independent-${id}`)?.checked,resolution=$(`#resolution-${id}`)?.value;
    return run(()=>post(`scenes/${id}`,{action:'accept',verified,independent,resolution}),'Đang lưu lượt duyệt câu…','script',{keepPosition:true,anchorId:`scene-${id}`});
  }
  if(action==='reject-scene'||action==='reset-scene')return run(()=>post(`scenes/${id}`,{action:action==='reject-scene'?'reject':'reset'}),'Đang cập nhật quyết định…','script',{keepPosition:true,anchorId:`scene-${id}`});
  if(action==='criteria')return showDialog('Tiêu chí chọn nguồn',`<p>Điểm công khai trên thang một trăm: tổ chức nhận diện được (35), có tác giả công bố (15), ngày rõ và trong ngưỡng độ mới (15), khớp từ khóa (20), đọc được HTML qua HTTPS (15).</p><p>Độ mới: quá một trăm tám mươi ngày với giá/chi phí/nội dung mới nhất; quá hai năm với chủ đề khác thì gắn cờ. Nguồn nền tảng cũ vẫn có thể phù hợp nếu người duyệt ghi rõ lý do.</p><p>Danh mục tổ chức gồm cơ quan công, đại học, nhà xuất bản nghiên cứu và tài liệu chính thức. Việc nằm trong danh mục không chứng minh mọi khẳng định đều đúng. Nguồn không thuộc danh mục chỉ được dùng khi người duyệt ghi lý do xác minh uy tín.</p><p>Hai tên miền khác nhau chưa chắc độc lập: hãy kiểm tra tác giả, tổ chức, dữ liệu và nghiên cứu gốc. Nguồn có lệnh thao túng bị cách ly; ngày thiếu ghi rõ chưa xác định.</p>`);
  if(action==='conflicts')return showDialog('Những bằng chứng cần đối chiếu',state.project.conflicts.map(c=>`<div class="banner">${esc(c.description)}</div>${c.citations.map(c=>`<blockquote class="quote-block">${esc(c.quote)}<p class="tiny">${esc(c.sourceId)} · ${esc(c.locator)}</p></blockquote>`).join('')}`).join(''));
  if(action==='profile-download'){
    const p=state.project;download('source-profile-draft.json',{status:'Hồ sơ đang duyệt, chưa phải bản dùng dựng video',mode:p.mode,topic:p.brief.topic,sources:p.sources.map(({text,chunks,...s})=>({...s,evidence:chunks.slice(0,2).map(c=>({id:c.id,excerpt:c.text.slice(0,400),locator:c.locator}))})),conflicts:p.conflicts,failures:p.failures});notice('Đã tải hồ sơ nguồn hiện tại.');return;
  }
  if(action==='download'){
    button.disabled=true;
    try{state.output=await post('export');const key=button.dataset.key;const names={markdown:'script.md',script:'script.json',profile:'source-profile.json',trace:'trace.json',audit:'audit-log.json'};download(names[key],state.output[key],key==='markdown'?'text/markdown':'application/json');notice(`Đã tải ${names[key]}.`);}catch(err){notice(err.message,true);}finally{button.disabled=false;}return;
  }
  if(action==='delete')return $('#delete-dialog').showModal();
  if(action==='confirm-delete'){$('#delete-dialog').close();return run(async()=>{await post('delete',{confirmed:true});state.project=null;remember(null);},'Đang xóa dữ liệu dự án…','brief');}
  if(action==='fill-topic'){
    const input=$('input[name="topic"]');
    if(input){
      input.value=button.dataset.fill;
      input.focus();
      updateLiveBlueprint();
    }
    return;
  }
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
document.addEventListener('input',e=>{if(e.target.closest('#brief-form'))updateLiveBlueprint();});
document.addEventListener('change',e=>{if(e.target.closest('#brief-form'))updateLiveBlueprint();});
try {
  await bootstrap();
  let id;try{id=localStorage.getItem('scriptforge.project');}catch{}
  if(id&&state.boot.projects.some(p=>p.id===id)){state.project=await api(`/api/projects/${id}`);state.view=state.project.scenes.length?'script':'sources';}
  render();
} catch(e) { $('#workspace').innerHTML='<div class="empty-state"><h2>Chưa kết nối được máy chủ</h2><p>Chạy npm start từ thư mục dự án, rồi tải lại trang.</p></div>';notice(e.message,true); }
