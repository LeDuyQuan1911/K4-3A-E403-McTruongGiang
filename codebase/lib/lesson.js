// Vietnamese timing follows the organizer's template: 2.9 syllables per second.
// Whitespace units are a practical estimate, not measured audio duration.
export const narrationUnits = text => String(text || '').trim().split(/\s+/u).filter(Boolean).length;
export function duplicateNarration(text, previous) {
  const shingles = value => {
    const words=String(value || '').toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
    return new Set(words.slice(2).map((_,i)=>words.slice(i,i+3).join(' ')));
  };
  const current=shingles(text);
  if (current.size<30) return -1;
  return previous.findIndex(value=>{
    const other=shingles(value), shared=[...current].filter(item=>other.has(item)).length;
    return shared/Math.max(current.size,other.size)>.88;
  });
}
export function detailedLessonPlan(duration) {
  const targetWords = Math.round(duration * 60 * 2.9);
  const sceneCount = Math.max(3, Math.min(36, Math.ceil(duration * 60 / 50)));
  return { version:2, targetWords, sceneCount, batchSize:1, targetUnitsPerScene:Math.round(targetWords/sceneCount), unitsPerSecond:2.9 };
}
export function teachingIssues(scene, target = 0) {
  if (!scene.text || scene.status === 'NO_SOURCE') return [];
  const issues = [];
  if (scene.duplicateOf) issues.push(`Lời giảng lặp lại gần như toàn bộ slide ${scene.duplicateOf}; cần dạy nội dung mới thay vì kéo dài bài.`);
  if (target && narrationUnits(scene.text) < Math.floor(target * 0.7)) issues.push('Lời giảng quá ngắn so với phần thời lượng được phân bổ; cần giải thích và phân tích cụ thể hơn.');
  if (/\[(?:bổ sung|thêm|ví dụ|nội dung)|(?:giảng viên|mentor|người dạy)\s+(?:hãy|cần|nên|sẽ)\s+(?:giải thích|trình bày|bổ sung|soạn)|(?:hãy|cần)\s+(?:thêm ví dụ|bổ sung nội dung)/iu.test(scene.text)) issues.push('Lời đọc còn giao việc soạn bài cho giảng viên hoặc chứa chỗ trống.');
  if (/^\s*(?:nội dung chương trình có|khóa học (?:này |sẽ |hướng)|chương trình (?:này |sẽ )|bạn sẽ (?:học|được học))/iu.test(scene.text)) issues.push('Nội dung đang giới thiệu chương trình học thay vì trực tiếp giảng kiến thức.');
  return issues;
}
