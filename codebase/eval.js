import { spawnSync } from 'node:child_process';
import { mkdir, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const testFiles=(await readdir(path.join(root,'codebase','tests'))).filter(name=>name.endsWith('.test.js')).sort().map(name=>path.join('codebase','tests',name));
const run=spawnSync(process.execPath,['--test','--test-reporter=tap',...testFiles],{cwd:root,encoding:'utf8'});
const output=(run.stdout || '')+(run.stderr || '');
const count=name=>Number(output.match(new RegExp(`^# ${name} (\\d+)`,'m'))?.[1] || 0);
const report={at:new Date().toISOString(),type:'automated-regression-not-live-AI-evaluation',exitCode:run.status,
  tests:count('tests'),passed:count('pass'),failed:count('fail'),liveAIQuality:'NOT_MEASURED',userAcceptance:'NOT_MEASURED'};
await mkdir(path.join(root,'test-output'),{recursive:true});
await writeFile(path.join(root,'test-output','regression.tap'),output,'utf8');
await writeFile(path.join(root,'test-output','regression.json'),JSON.stringify(report,null,2),'utf8');
console.log(JSON.stringify(report,null,2));
console.log('Chi tiết: test-output/regression.tap. Kết quả này không phải tỷ lệ trích dẫn đúng ngữ nghĩa của AI.');
if(run.error)console.error(run.error.message);
process.exitCode=run.status===0&&report.tests>0?0:1;
