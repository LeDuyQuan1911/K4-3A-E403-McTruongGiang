import test from 'node:test';
import assert from 'node:assert/strict';
import { detailedLessonPlan, narrationUnits, teachingIssues } from '../lib/lesson.js';
import { researchTopic, sourcePolicy } from '../lib/source-policy.js';
import { filterSearchResults } from '../lib/search.js';
import { Studio } from '../lib/service.js';
import { normalizeScene, reviewScene, buildExports, spokenSentences } from '../lib/core.js';
import { parsePage, publisherFor } from '../lib/web.js';
import { AI } from '../lib/ai.js';

const brief={topic:'Kỹ thuật viết câu lệnh cho mô hình ngôn ngữ',goal:'Giải thích và thực hành chỉ dẫn rõ ràng',audience:'Người mới',duration:3};
const chunk={id:'S1-001',sourceId:'S1',title:'Synthetic documentation fixture',publisherGroup:'test',text:'Prompt engineering uses clear instructions to describe the task, the context, and the expected format. Evaluate the output against the requirements and revise ambiguous instructions.',locator:'Dòng 1'};
const source={id:'S1',title:chunk.title,url:'https://platform.claude.com/docs/test-only',language:'en',decision:'approved',provenance:{verified:true},chunks:[chunk],warnings:[]};
const makeProject=()=>({id:'test',brief,mode:'live',sources:[source],scenes:[],audit:[],conflicts:[],teacherApproval:null});
const slide=(i=0)=>({title:`Ý dạy ${i}`,section:i===0?'Mở đầu':'Nội dung chính',teachingGoal:'Viết chỉ dẫn có thể đối chiếu',explanation:'Nhiệm vụ, bối cảnh, định dạng',workedExample:'Phân tích ví dụ giả định',checkUnderstanding:'Tự kiểm tra và đáp án',evidenceIds:[chunk.id]});
const raw=text=>({title:'Chỉ dẫn rõ ràng',text,slideBullets:['Nêu nhiệm vụ và bối cảnh','Kiểm tra theo yêu cầu'],screenText:'Chỉ dẫn rõ ràng',visual:'So sánh yêu cầu và đầu ra giả định.',style:'giang',claimType:'concept',status:'NEEDS_VERIFY',reason:'Cần người duyệt đối chiếu',citations:[{chunkId:chunk.id,quote:chunk.text}]});
// A teaching-output fixture, not a claim that a live model produced this text.
const narration='Khi viết chỉ dẫn, ta cần nói rõ công việc muốn hệ thống thực hiện, cung cấp bối cảnh cần dùng và mô tả cách trình bày kết quả. Hãy xét tình huống giả định: bạn muốn tóm tắt một thông báo cho người vừa tham gia lớp. Yêu cầu “viết giúp tôi” chưa nói rõ phải viết điều gì. Ta sửa thành “Tóm tắt thông báo được cung cấp, tập trung vào việc người học cần chuẩn bị, trình bày bằng các gạch đầu dòng ngắn”. Bây giờ hãy đối chiếu bản trả lời với thông báo và yêu cầu ban đầu: nội dung chuẩn bị đã được giữ lại chưa, hình thức có đúng không? Nếu chưa, hãy sửa phần yêu cầu còn mơ hồ rồi kiểm tra lại. Câu hỏi tự kiểm tra: chỉ viết “làm tốt hơn” có giúp xác định kết quả cần đạt không? Chưa, bởi người đọc vẫn không biết tiêu chí nào được dùng để đánh giá.';

test('academic subdomains are not counted as independent institutions',()=>{
 assert.equal(publisherFor('cs.stanford.edu').group,publisherFor('ai.stanford.edu').group);
 assert.equal(publisherFor('www.cl.cam.ac.uk').group,'cam.ac.uk');
 assert.notEqual(publisherFor('mit.edu').group,publisherFor('stanford.edu').group);
});

test('lesson timing follows 2.9 syllables/second and gives each slide enough narration budget',()=>{
 const plan=detailedLessonPlan(3);assert.equal(plan.targetWords,522);assert.equal(plan.sceneCount,4);assert.equal(plan.batchSize,1);assert.equal(plan.targetUnitsPerScene,131);
 assert.equal(detailedLessonPlan(30).sceneCount,36);assert.equal(detailedLessonPlan(30).targetWords,5220);
 assert.ok(narrationUnits(narration)>130);assert.deepEqual(teachingIssues(raw(narration),131),[]);
});

test('depth gate rejects outlines and mentor homework, and cannot be bypassed by approval',()=>{
 const short=normalizeScene({...raw('Giảng viên cần giải thích nội dung và bổ sung ví dụ.'),targetUnits:131},[chunk],1);
 assert.ok(short.issues.some(issue=>issue.includes('quá ngắn')));assert.ok(short.issues.some(issue=>issue.includes('giao việc')));
 assert.throws(()=>reviewScene(short,{action:'accept',verified:true}),/Chưa thể chấp nhận/);
 const full=normalizeScene({...raw(narration),targetUnits:131},[chunk],1);
 assert.equal(full.status,'NEEDS_VERIFY');assert.equal(full.decision,'pending');assert.throws(()=>reviewScene(full,{action:'accept'}),/xác nhận/);
 assert.equal(reviewScene(full,{action:'accept',verified:true}).decision,'accepted');
});

test('AI discovery excludes domestic sales, foreign sales, Scholar listings, mirrors and irrelevant official pages',()=>{
 const urls=['https://example.vn/prompt','https://www.udemy.com/course/prompt-engineering/','https://scholar.google.com/scholar?q=prompt','https://mirror.example/prompt','https://platform.claude.com/docs/prompt','https://aclanthology.org/test-only'];
 const results=urls.map(url=>({url,title:'Prompt engineering tutorial',content:'Prompting techniques',score:1}));
 results.push({url:'https://nist.gov/unrelated',title:'Measurement standards',content:'Thermometry and calibration',score:1});
 assert.deepEqual(filterSearchResults(results,brief).map(r=>r.url),urls.slice(4));
 assert.equal(sourcePolicy('https://platform.claude.com.evil.org/docs/prompt').eligible,false);
 assert.equal(sourcePolicy('https://huggingface.co/community-post').eligible,false);
 assert.equal(sourcePolicy('https://huggingface.co/learn/llm-course/chapter1/1').eligible,true);
 assert.match(researchTopic(brief),/prompt engineering/);
});

test('approved old course marketing cannot remain writer evidence; unverified sources are excluded',()=>{
 const studio=new Studio({projects:[],save:async()=>{}}), p=makeProject();
 p.sources=[{...source,title:'Khóa học Prompt Engineering',url:'https://academy.vn/prompt'}];assert.equal(studio.candidates(p).length,0);
 p.sources=[{...source,provenance:{verified:false}}];assert.equal(studio.candidates(p).length,0);
 p.sources=[source];assert.ok(studio.candidates(p).length);
});

test('downloaded redirects and unrelated recognized publishers must still pass policy/relevance',async()=>{
 const p=makeProject();p.sources=[];
 const studio=new Studio({save:async()=>{}},{reader:async()=>({...source,url:'https://academy.vn/prompt',text:chunk.text})});
 await assert.rejects(studio.addURL(p,'https://platform.claude.com/docs/prompt',{discovered:true}),/không phải học liệu/);assert.equal(p.sources.length,0);
 studio.reader=async()=>({...source,title:'Weather measurements',text:'Thermometry and calibration standards',knownPublisher:true});
 await assert.rejects(studio.addURL(p,source.url,{discovered:true}),/không khớp/);
});

test('HTML reader retains practical code and warns when only a research abstract was read',()=>{
 const page=parsePage('<html lang="en"><title>Code example fixture</title><main><p>This synthetic documentation explains a worked example with its input and expected output for testing.</p><pre>const prompt = "Summarize the supplied document in short bullet points.";</pre></main></html>',source.url);
 assert.match(page.text,/const prompt/);
 const abstract=parsePage('<html><title>Abstract fixture</title><blockquote class="abstract">This is a synthetic research abstract for testing extraction only. No claims about real experiments are made in this test passage.</blockquote></html>','https://arxiv.org/abs/test-only');
 assert.ok(abstract.warnings.some(w=>w.includes('tóm tắt nghiên cứu')));
});

test('detailed generation uses planned evidence, retries shallow output, and keeps human review',async()=>{
 const p=makeProject(),requests=[];
 const ai={outline:async(_b,evidence,plan)=>({slides:Array.from({length:plan.sceneCount},(_,i)=>slide(i)),missingEvidence:[]}),
  draft:async(_b,evidence,_trace,request)=>{
   requests.push(request);assert.deepEqual(evidence.map(c=>c.id),[chunk.id]);
   return {scenes:[raw(request.feedback? narration:'Giảng viên cần giải thích nội dung này.')],conflicts:[]};
  }};
 const studio=new Studio({save:async()=>{}},{ai});await studio.generate(p);
 assert.equal(requests.length,8);assert.equal(p.scenes.length,4);assert.ok(p.scenes.every(s=>s.text===narration));assert.equal(p.scenes[0].issues.length,0);
 assert.ok(p.scenes.slice(1).every(s=>s.issues.some(issue=>issue.includes('lặp lại'))));assert.equal(p.scriptPlan.complete,false);
 assert.ok(requests.filter(r=>r.feedback).every(r=>r.feedback.length));assert.ok(p.scenes.every(s=>s.decision==='pending'&&!s.humanVerified));
 assert.equal(p.scriptPlan.actualUnits,narrationUnits(narration)*4);assert.equal(p.scriptPlan.estimatedSeconds,Math.round(narrationUnits(narration)*4/2.9));
});

test('provider failure during regeneration preserves old script, plan and human decisions',async()=>{
 const p=makeProject();p.scenes=[normalizeScene(raw(narration),[chunk],1)];p.scriptPlan={version:1};
 const before=JSON.stringify({scenes:p.scenes,plan:p.scriptPlan});let calls=0;
 const ai={outline:async(_b,_e,plan)=>({slides:Array.from({length:plan.sceneCount},(_,i)=>slide(i)),missingEvidence:[]}),draft:async()=>{if(++calls===2)throw Error('synthetic provider failure');return {scenes:[raw(narration)],conflicts:[]};}};
 await assert.rejects(new Studio({save:async()=>{}},{ai}).regenerate(p),/synthetic provider failure/);
 assert.equal(JSON.stringify({scenes:p.scenes,plan:p.scriptPlan}),before);
});

test('missing coverage creates a named NO_SOURCE slide, never asks writer to invent it',async()=>{
 const p=makeProject();let writes=0;
 const ai={outline:async(_b,_e,plan)=>({slides:Array.from({length:plan.sceneCount},(_,i)=>({...slide(i),evidenceIds:[]})),missingEvidence:['Thiếu tài liệu cho thực hành.']}),draft:async()=>{writes++;}};
 await new Studio({save:async()=>{}},{ai}).generate(p);assert.equal(writes,0);assert.equal(p.scenes.length,4);assert.ok(p.scenes.every(s=>s.status==='NO_SOURCE'&&!s.text));assert.equal(p.scriptPlan.complete,false);assert.equal(p.scriptPlan.missingEvidence.length,1);
});

test('outline validates real evidence IDs and batches long lessons within output budget',async()=>{
 let calls=0;const ai=new AI({env:{AI_PROVIDER:'deepseek',DEEPSEEK_API_KEY:'TEST'},fetcher:async(_url,opts)=>{
  calls++;const request=JSON.parse(JSON.parse(opts.body).messages[1].content);
  assert.equal(request.task,'lesson-outline');assert.ok(request.plan.count<=8);
  const value={slides:Array.from({length:request.plan.count},(_,i)=>slide(i)),missingEvidence:[]};
  return {ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify(value)}}]})};
 }});
 const outline=await ai.outline(brief,[chunk],detailedLessonPlan(30));assert.equal(calls,5);assert.equal(outline.slides.length,36);
 await assert.rejects(ai.outline(brief,[],detailedLessonPlan(3)),/mã nguồn/);
});

test('C3 export keeps detailed slide content but splits narration into traceable spoken sentences',()=>{
 const p=makeProject();p.createdAt='2026-09-17';p.failures=[];
 const normalized=normalizeScene({...raw(narration),targetUnits:131},[chunk],1);
 p.scenes=[reviewScene(normalized,{action:'accept',verified:true})];p.teacherApproval={reviewer:'TEST'};
 const out=buildExports(p);
 assert.equal(out.script.cau.length,spokenSentences(narration).length);assert.ok(out.script.cau.length>4);
 assert.equal(out.trace.length,out.script.cau.length);assert.equal(out.script.cau.map(line=>line.loi).join(' '),narration);
 assert.ok(out.script.cau.every((line,i)=>line.n===i+1&&line.slide===1&&out.profile.thongTin.some(claim=>line.nguon.includes(claim.id))));
 assert.ok(out.trace.every(item=>item.evidenceScope==='human-reviewed-slide'));assert.match(out.markdown,/Script nói/);
});
