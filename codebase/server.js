import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { Store, Studio } from './lib/service.js';
import { AppError, buildExports } from './lib/core.js';

const directory = path.dirname(fileURLToPath(import.meta.url));
export async function createServer(options = {}) {
  const store = options.store || new Store(path.join(directory, 'data'));
  await store.init();
  const studio = new Studio(store, options);
  const csrf = randomBytes(32).toString('hex');
  const busy = new Set();
  const assets = { '/':['index.html','text/html'], '/app.js':['app.js','text/javascript'], '/styles.css':['styles.css','text/css'] };
  const server = http.createServer(async (req,res) => {
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Cache-Control','no-store');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    const send = (value,status=200) => { res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(value)); };
    let lock;
    try {
      const host = req.headers.host || '';
      if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) throw new AppError('Host không được phép.',403);
      if (req.headers.origin && req.headers.origin !== `http://${host}`) throw new AppError('Nguồn yêu cầu không được phép.',403);
      const url = new URL(req.url, `http://${host}`);
      if (req.method === 'GET' && assets[url.pathname]) {
        const [file,type] = assets[url.pathname];res.writeHead(200,{'Content-Type':`${type}; charset=utf-8`});res.end(await readFile(path.join(directory,file)));return;
      }
      if (req.method === 'GET' && url.pathname === '/api/bootstrap') return send({ csrf, ...studio.ai.publicConfig(),
        projects: store.projects.map(p => ({ id:p.id, topic:p.brief.topic, mode:p.mode, updatedAt:p.updatedAt })) });
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts[0] !== 'api' || parts[1] !== 'projects') throw new AppError('Không tìm thấy.',404);
      if (req.method === 'GET' && parts.length === 3) return send(store.get(parts[2]));
      if (req.method !== 'POST') throw new AppError('Phương thức không được hỗ trợ.',405);
      if (req.headers['x-csrf-token'] !== csrf || !req.headers['content-type']?.startsWith('application/json')) throw new AppError('Phiên làm việc hết hạn; tải lại trang.',403);
      let text = '', size = 0;
      for await (const chunk of req) { size += chunk.length; if (size > 200_000) throw new AppError('Yêu cầu quá lớn.',413);text += chunk; }
      let input;try { input = JSON.parse(text || '{}'); } catch { throw new AppError('JSON không hợp lệ.'); }
      if (parts.length === 2) return send(await studio.create(input),201);
      const p = store.get(parts[2]);
      if (busy.has(p.id)) throw new AppError('Dự án đang xử lý; hãy chờ thao tác hiện tại hoàn tất.',409);
      lock = p.id; busy.add(lock);
      const action = parts[3];
      if (action === 'research') return send(await studio.research(p));
      if (action === 'sources' && parts.length === 4) return send(await studio.addURL(p,input.url));
      if (action === 'sources' && parts.length === 5 && parts[4] === 'approve-all') return send(await studio.approveAllSources(p,input));
      if (action === 'sources' && parts.length === 5) return send(await studio.decideSource(p,parts[4],input));
      if (action === 'sources' && parts.length === 6 && parts[5] === 'recheck') return send(await studio.recheckSource(p,parts[4]));
      if (action === 'generate') return send(await studio.generate(p));
      if (action === 'regenerate') return send(await studio.regenerate(p));
      if (action === 'repair') return send(await studio.repair(p));
      if (action === 'format') return send(await studio.formatNarration(p));
      if (action === 'scenes' && parts.length === 5 && parts[4] === 'approve-all') return send(await studio.approveAllScenes(p,input));
      if (action === 'scenes' && parts.length === 5) return send(await studio.review(p,parts[4],input));
      if (action === 'scenes' && parts.length === 6 && parts[5] === 'evidence') return send(await studio.attachEvidence(p,parts[4],input));
      if (action === 'teacher') return send(await studio.approveTeacher(p,input));
      if (action === 'hard-cases') return send(await studio.hardCases(p));
      if (action === 'export') { const data = buildExports(p);studio.audit(p,'export.created');await store.save();return send(data); }
      if (action === 'delete') {
        if (input.confirmed !== true) throw new AppError('Cần xác nhận xóa dữ liệu dự án.');
        store.projects = store.projects.filter(x=>x.id !== p.id);await store.save();return send({deleted:true});
      }
      throw new AppError('Không tìm thấy thao tác.',404);
    } catch(e) {
      if (lock) await store.save().catch(()=>{});
      send({ error:e instanceof AppError ? e.message : 'Không xử lý được yêu cầu. Hãy thử lại; bản đã lưu vẫn còn.' },e instanceof AppError ? e.status : 500);
    } finally { if(lock) busy.delete(lock); }
  });
  server.requestTimeout = 240000;
  return {server,studio,store};
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const {server} = await createServer();
  const port = Number(process.env.PORT || 3000);
  server.listen(port,'127.0.0.1',()=>console.log(`ScriptForge: http://127.0.0.1:${port}`));
}
