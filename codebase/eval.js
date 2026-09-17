import { spawnSync } from 'node:child_process';
import { mkdir, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { runGoldenSet } from '../eval/golden-runner.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const testFiles=(await readdir(path.join(root,'codebase','tests'))).filter(name=>name.endsWith('.test.js')).sort().map(name=>path.join('codebase','tests',name));
const run=spawnSync(process.execPath,['--test','--test-reporter=tap',...testFiles],{cwd:root,encoding:'utf8'});
const output=(run.stdout || '')+(run.stderr || '');
const count=name=>Number(output.match(new RegExp(`^# ${name} (\\d+)`,'m'))?.[1] || 0);
const report={at:new Date().toISOString(),type:'automated-regression-not-live-AI-evaluation',exitCode:run.status,
  tests:count('tests'),passed:count('pass'),failed:count('fail'),liveAIQuality:'NOT_MEASURED',userAcceptance:'NOT_MEASURED'};
let golden={total:0,passed:0,failed:1};
if (run.status===0) {
  try { golden=await runGoldenSet(root); }
  catch (error) { console.error(`Golden set thất bại: ${error.message}`); }
}
report.goldenSet={total:golden.total,passed:golden.passed,failed:golden.failed,kind:'fixture-regression-not-live-model-evaluation'};
await mkdir(path.join(root,'test-output'),{recursive:true});
await writeFile(path.join(root,'test-output','regression.tap'),output,'utf8');
await writeFile(path.join(root,'test-output','regression.json'),JSON.stringify(report,null,2),'utf8');
console.log(JSON.stringify(report,null,2));
console.log(`Golden set: ${golden.passed}/${golden.total} fixture pass; chi tiết: eval/golden-results.csv.`);
console.log('Chi tiết: test-output/regression.tap. Kết quả này không phải tỷ lệ trích dẫn đúng ngữ nghĩa của AI.');
if(run.error)console.error(run.error.message);
process.exitCode=run.status===0&&report.tests>0&&golden.failed===0?0:1;
