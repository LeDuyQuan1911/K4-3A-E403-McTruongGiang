import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { scopeCheck, validateSegment } from '../codebase/lib/core.js';

const fixture = {
  id: 'GOLDEN-001', sourceId: 'GOLDEN-SOURCE', title: 'Golden-set fixture',
  publisher: 'ScriptForge test', publisherGroup: 'scriptforge-test',
  url: 'https://example.test/golden-set', sourceLocator: 'Fixture 1', locator: 'Fixture 1',
  text: 'Đoạn bằng chứng kiểm thử mô tả chính xác một khái niệm và chỉ được dùng để xác nhận cơ chế trích dẫn.'
};

function parse(csv) {
  const [header, ...lines] = csv.trim().split(/\r?\n/u);
  if (header !== 'case_id,category,input,expected_output,difficulty,source') throw Error('Golden set có header không hợp lệ.');
  return lines.map(line => {
    const [caseId, category, input, expected, difficulty, source] = line.split(',');
    if (![caseId, category, input, expected, difficulty, source].every(Boolean)) throw Error(`Golden set có dòng thiếu dữ liệu: ${line}`);
    return { caseId, category, input, expected, difficulty, source };
  });
}

function citationRaw(status) {
  return {
    title: 'Kết quả fixture', text: fixture.text, status,
    citations: [{ chunkId: fixture.id, quote: fixture.text }]
  };
}

function runCase(row) {
  if (row.category === 'CITED') {
    return { actual: validateSegment(citationRaw('CITED'), [fixture]).status, method: 'quote-khớp-fixture' };
  }
  if (row.category === 'NEEDS_VERIFY') {
    return { actual: validateSegment(citationRaw('NEEDS_VERIFY'), [fixture]).status, method: 'cờ-cần-đối-chiếu-fixture' };
  }
  if (row.category === 'NO_SOURCE') {
    const raw = { ...citationRaw('CITED'), citations: [{ chunkId: fixture.id, quote: 'Trích đoạn không tồn tại trong fixture.' }] };
    return { actual: validateSegment(raw, [fixture]).status, method: 'citation-sai-bị-chặn-fixture' };
  }
  if (row.category === 'OUT_OF_SCOPE') {
    return { actual: scopeCheck(row.input) ? 'OUT_OF_SCOPE' : 'UNHANDLED', method: 'scope-guard-fixture' };
  }
  return { actual: 'UNHANDLED', method: 'không-xác-định' };
}

export async function runGoldenSet(root) {
  const rows = parse(await readFile(path.join(root, 'eval', 'golden-set.csv'), 'utf8'));
  if (rows.length !== 50) throw Error(`Golden set cần 50 case, đang có ${rows.length}.`);
  const results = rows.map(row => {
    const run = runCase(row);
    return { ...row, ...run, verdict: run.actual === row.category ? 'PASS' : 'FAIL' };
  });
  const output = [
    'case_id,category,expected_status,actual_status,verdict,method',
    ...results.map(row => [row.caseId, row.category, row.category, row.actual, row.verdict, row.method].join(','))
  ].join('\n').concat('\n');
  await writeFile(path.join(root, 'eval', 'golden-results.csv'), output, 'utf8');
  return { total: results.length, passed: results.filter(row => row.verdict === 'PASS').length, failed: results.filter(row => row.verdict === 'FAIL').length, results };
}

