import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../server.js';
import { readFile } from 'node:fs/promises';
test('source decisions preserve the reviewed source position in the client renderer',async()=>{
 const app=await readFile(new URL('../app.js',import.meta.url),'utf8');
  assert.match(app,/keepPosition:true,anchorId:`source-\$\{id\}`/);
 assert.match(app,/target\.scrollIntoView\(\{block:'center'\}\)/);
  assert.match(app,/data-action="recheck-source"/);
  assert.match(app,/data-action="approve-all-sources"/);
  assert.match(app,/data-action="approve-all-scenes"/);
  assert.doesNotMatch(app,/\$\('#recent'\)/);
});
test('HTTP workflow enforces CSRF, disallows secrets/static traversal, persists and exports',async()=>{
 const store={projects:[],init:async()=>{},save:async()=>{},get(id){const p=this.projects.find(p=>p.id===id);if(!p)throw Error('not found');return p;}};
 const {server}=await createServer({store});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${server.address().port}`;
 try {
  const boot=await (await fetch(`${base}/api/bootstrap`)).json();assert.ok(boot.csrf);
  assert.equal((await fetch(`${base}/api/projects`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,403);
  for(const uri of ['/.env','/data/projects.json','/lib/ai.js','/../package.json'])assert.equal((await fetch(base+uri)).status,404);
  const post=async(uri,data)=>{const r=await fetch(base+uri,{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':boot.csrf},body:JSON.stringify(data)});return {status:r.status,data:await r.json()};};
  const created=await post('/api/projects',{topic:'Cách mô hình học từ dữ liệu',goal:'Biết cách kiểm chứng bài giảng',audience:'Người mới',duration:3,mode:'demo'});assert.equal(created.status,201);
  const prefix=`/api/projects/${created.data.id}`;
  let r=await post(`${prefix}/research`,{});assert.equal(r.status,200);
  r=await post(`${prefix}/sources/approve-all`,{confirmed:true});assert.equal(r.status,200);
  r=await post(`${prefix}/generate`,{});assert.equal(r.data.scenes.length,5);assert.equal(r.data.scriptPlan.complete,false);
  assert.equal((await post(`${prefix}/export`,{})).status,409);
  r=await post(`${prefix}/scenes/approve-all`,{confirmed:true});assert.equal(r.status,200);
  assert.ok(r.data.scenes.every(s=>s.decision==='accepted'));
  assert.equal((await post(`${prefix}/teacher`,{reviewer:'TEST-GV',confirmed:true})).status,200);
  const exported=await post(`${prefix}/export`,{});assert.equal(exported.status,200);assert.equal(exported.data.script.schema,'hackathon-kich-ban/1');
  assert.equal((await fetch(`${base}/api/bootstrap`,{headers:{Origin:'https://evil.test'}})).status,403);
  assert.equal((await post(`${prefix}/delete`,{confirmed:true})).status,200);assert.equal(store.projects.length,0);
 } finally { await new Promise(r=>server.close(r)); }
});
