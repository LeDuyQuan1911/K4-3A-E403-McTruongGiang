import { AI } from './lib/ai.js';

try {
  const ai=new AI(),config=ai.publicConfig();
  console.log(`Model viết: ${config.providerLabel} / ${config.model || '(chưa điền model)'}`);
  console.log(`${config.keyName}: ${config.aiEnabled?'đã cấu hình':'chưa đủ cấu hình'}`);
  console.log(`Tìm nguồn: ${config.searchLabel} / ${config.searchEnabled?'đã cấu hình':'chưa bật; vẫn có thể thêm URL thủ công'}`);
  console.log('Không in giá trị khóa. Có cấu hình không đồng nghĩa API đã kết nối thành công.');
  if(process.argv.includes('--live')) {
    const result=await ai.draft({topic:'Kiểm tra kết nối cho kịch bản giáo dục',goal:'Không viết claim khi không có bằng chứng',audience:'Người kiểm thử',duration:1},[],event=>{
      if(event.event==='ai.completed')console.log(JSON.stringify({provider:event.provider,model:event.model,responseId:event.responseId,usage:event.usage,elapsedMs:event.elapsedMs}));
    });
    if(result.scenes.some(s=>s.text.trim() || s.citations.length))throw new Error('API đã trả lời nhưng không tuân thủ trường hợp thiếu bằng chứng.');
    console.log('Lời gọi model thật thành công và đầu ra đúng cấu trúc. Chưa kiểm tra tìm web hoặc chất lượng kịch bản.');
  }
  if(process.argv.includes('--search')) {
    const urls=await ai.research({topic:'Array.prototype.map trong JavaScript',goal:'Tìm tài liệu kỹ thuật chính thức về phương thức Array.prototype.map, không phải kiểu dữ liệu Map',audience:'Người mới học lập trình',duration:1},event=>{
      if(event.event==='search.api_completed')console.log(JSON.stringify({provider:event.provider,requestId:event.requestId,resultCount:event.resultCount,selectedCount:event.selectedCount,elapsedMs:event.elapsedMs}));
    });
    console.log(JSON.stringify({selectedDiscoveryURLs:urls},null,2));
    console.log('Tìm kiếm thật thành công và trả URL HTTPS. Chưa tải trang, duyệt uy tín hoặc đánh giá chất lượng kịch bản.');
  }
} catch(error) { console.error(error.message);process.exitCode=1; }
