/**
 * ScriptForge Backend Server
 * - Ẩn API key + model config phía server
 * - Proxy requests đến 9Router
 * - Serve static files (index.html)
 * - Endpoints: POST /api/test, POST /api/generate
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

// ==================== SERVER CONFIG ====================
const PORT = process.env.PORT || 3000;

// 🔒 Đọc config từ .env (không hardcode trong source code)
function loadEnv() {
    try {
        const envPath = path.join(__dirname, '.env');
        const envContent = fs.readFileSync(envPath, 'utf-8');
        envContent.split('\n').forEach(line => {
            line = line.trim();
            if (!line || line.startsWith('#')) return;
            const [key, ...vals] = line.split('=');
            process.env[key.trim()] = vals.join('=').trim();
        });
    } catch (e) {
        console.error('⚠️  Không tìm thấy file .env — dùng biến môi trường');
    }
}
loadEnv();

const CONFIG = {
    apiBaseUrl: process.env.API_BASE_URL || 'https://9r.thaidangcap.io.vn',
    apiKey: process.env.API_KEY || '',
    model: process.env.AI_MODEL || 'cx/gpt-5.6-luna(medium)',
};

// ==================== MIME TYPES ====================
const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.md': 'text/markdown; charset=utf-8',
    '.woff2': 'font/woff2',
};

// ==================== HELPERS ====================
function sendJSON(res, statusCode, data) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify(data));
}

function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (e) {
                reject(new Error('Invalid JSON body'));
            }
        });
        req.on('error', reject);
    });
}

function callAI(messages, maxTokens = 3000, temperature = 0.3) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({
            model: CONFIG.model,
            messages,
            temperature,
            max_tokens: maxTokens,
        });

        const apiUrl = new URL(`${CONFIG.apiBaseUrl}/v1/chat/completions`);
        const options = {
            hostname: apiUrl.hostname,
            port: 443,
            path: apiUrl.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.apiKey}`,
                'Content-Length': Buffer.byteLength(body),
            },
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode !== 200) {
                    reject(new Error(`API Error ${res.statusCode}: ${data}`));
                    return;
                }
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error(`Parse error: ${e.message}`));
                }
            });
        });

        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

// ==================== ROUTE HANDLERS ====================

/**
 * POST /api/test — Test kết nối AI (không lộ key)
 */
async function handleTestConnection(req, res) {
    try {
        const result = await callAI(
            [{ role: 'user', content: 'Xin chào' }],
            10
        );
        sendJSON(res, 200, {
            ok: true,
            model: CONFIG.model,
            message: 'Kết nối thành công',
        });
    } catch (e) {
        sendJSON(res, 500, {
            ok: false,
            error: e.message,
        });
    }
}

/**
 * POST /api/generate — Tạo kịch bản bằng AI
 * Body: { topic, audience, duration, extra, sources, sourceContext }
 */
async function handleGenerate(req, res) {
    const startTime = Date.now();
    const traceLog = [];

    try {
        const body = await parseBody(req);
        const { topic, audience, duration, extra, sources, sourceContext } = body;

        if (!topic || !topic.trim()) {
            sendJSON(res, 400, { ok: false, error: 'Chưa nhập chủ đề' });
            return;
        }

        traceLog.push({ ts: new Date().toISOString(), label: 'START', msg: `Bắt đầu RAG + Citation` });
        traceLog.push({ ts: new Date().toISOString(), label: 'INPUT', msg: `Chủ đề: "${topic}" | Đối tượng: ${audience} | Thời lượng: ${duration} phút` });
        traceLog.push({ ts: new Date().toISOString(), label: 'SOURCES', msg: `Nguồn: ${sources?.join(', ') || 'N/A'}` });
        traceLog.push({ ts: new Date().toISOString(), label: 'MODEL', msg: CONFIG.model });

        const durNum = parseInt(duration, 10) || 10;
        const targetWords = durNum * 130; // Tiêu chuẩn 130 từ/phút cho lời thoại video tiếng Việt
        const targetSegments = durNum >= 15 ? '8-10' : durNum >= 10 ? '6-8' : '4-6';
        const wordsPerSegment = Math.round(targetWords / (durNum >= 10 ? 7 : 5));

        const systemPrompt = `Bạn là ScriptForge AI — hệ thống chuyên gia thiết kế kịch bản video và bài giảng slide giáo dục chuyên sâu từ tài liệu nghiên cứu.

NGUYÊN TẮC BẮT BUỘC:
1. CHỈ sử dụng nội dung từ các nguồn tài liệu được cung cấp bên dưới. Tuyệt đối không tự bịa đặt thông tin.
2. Mỗi đoạn kịch bản PHẢI gắn mã trích dẫn [MÃ_NGUỒN] tương ứng ngay trong câu nói của lời thoại.
3. Nếu nội dung KHÔNG CÓ trong nguồn → gắn trạng thái "NO_SOURCE" và KHÔNG sinh nội dung (để content là lời giải thích lý do thiếu nguồn).
4. Nếu nguồn có liên quan nhưng KHÔNG đề cập trực tiếp hoặc suy diễn → gắn "NEEDS_VERIFY" kèm confidence_note.
5. Nếu nguồn rõ ràng và trực tiếp chứng minh được nội dung → gắn "CITED".
6. Giữ nguyên thuật ngữ gốc (tiếng Anh) kèm giải thích tiếng Việt dễ hiểu.
7. Công thức toán → trích nguyên bản từ nguồn, không tự ý sửa đổi hay paraphrase.

YÊU CẦU ĐẶC BIỆT VỀ CHIỀU SÂU & TÍNH CỤ THỂ (KHÔNG NÓI CHUNG CHUNG):
- Video có thời lượng yêu cầu là ${durNum} PHÚT (tương đương khoảng ${targetWords} từ lời thoại với tốc độ nói tiêu chuẩn 130 từ/phút).
- TỪNG PHÂN ĐOẠN PHẢI ĐI THẲNG VÀO BẢN CHẤT KỸ THUẬT: giải thích cơ chế cụ thể, cách tính toán từng bước, ví dụ đối chiếu trực quan (như ví dụ câu văn 'con mèo ngồi trên thảm' trong attention weight, cách nhân ma trận Q và K^T, hàm softmax...). TUYỆT ĐỐI KHÔNG NÓI CHUNG CHUNG MƠ HỒ LÝ THUYẾT SUÔNG.
- Lời thoại thuyết trình (content) dài từ 140 - 220 từ/đoạn (2-3 đoạn văn hoàn chỉnh có dẫn dắt, phân tích và kết luận).
- Hãy tạo ${targetSegments} phân đoạn/slide có cấu trúc rõ ràng.

ĐỊNH DẠNG OUTPUT — trả về DUY NHẤT một JSON array với cấu trúc đầy đủ cho từng Slide/Phân cảnh:
[
  {
    "slide_title": "Tiêu đề Slide ngắn gọn, ấn tượng (Ví dụ: Slide 1: Nút thắt cổ chai của RNN và Nhu cầu ra đời của Attention)",
    "title": "Tên phân đoạn kịch bản",
    "status": "CITED" | "NEEDS_VERIFY" | "NO_SOURCE",
    "purpose": "Mục đích của slide này: Làm rõ khái niệm gì, giải quyết câu hỏi nào trong chuỗi bài giảng",
    "visual_cue": "Gợi ý hình ảnh/sơ đồ/biểu đồ cụ thể có thể nhét vào slide này để minh họa trực quan (Ví dụ: Sơ đồ luồng Encoder-Decoder truyền thống với nút nghẽn fixed-vector màu đỏ, so sánh với Attention kết nối đa điểm)",
    "key_takeaway": "Điều người xem sẽ nhận ra/hiểu sâu sắc sau khi nghe xong slide này",
    "content": "Lời thoại thuyết trình chi tiết của người giảng (narrator script) có chiều sâu, đi vào cơ chế cụ thể, kèm các mã [MÃ_NGUỒN]...",
    "citations": ["T06-042", "Slide3-p22"],
    "source_quotes": ["Trích nguyên văn câu/đoạn từ nguồn chứng minh..."],
    "confidence_note": "Ghi chú nếu cần xác minh hoặc thiếu nguồn"
  }
]

CHỈ trả về JSON array hợp lệ, không kèm bất kỳ lời dẫn hay text markdown nào bên ngoài.`;

        const userPrompt = `CHỦ ĐỀ: ${topic}
ĐỐI TƯỢNG: ${audience || 'Người mới bắt đầu'}
THỜI LƯỢNG YÊU CẦU: ${durNum} phút (~${targetWords} từ lời thoại, tạo ${targetSegments} slide/đoạn chi tiết có chiều sâu)
YÊU CẦU BỔ SUNG: ${extra || 'Không có'}

=== TÀI LIỆU NGUỒN ===
${sourceContext || '(Không có nguồn)'}
=== HẾT TÀI LIỆU ===

Hãy tạo kịch bản video giáo dục ${durNum} phút chuyên sâu, đầy đủ Slide Title, Mục đích slide, Gợi ý hình ảnh, Key Takeaway và Lời thoại chi tiết không nói chung chung, CHỈ dựa trên tài liệu nguồn trên. Trả về JSON array.`;

        traceLog.push({ ts: new Date().toISOString(), label: 'PROMPT_SYSTEM', msg: systemPrompt.substring(0, 200) + '...' });
        traceLog.push({ ts: new Date().toISOString(), label: 'PROMPT_USER', msg: userPrompt.substring(0, 300) + '...' });
        traceLog.push({ ts: new Date().toISOString(), label: 'API_CALL', msg: `Gọi ${CONFIG.model} qua 9Router (Target: ${durNum}m, ~${targetWords} words)...` });

        const result = await callAI(
            [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            6000,
            0.3
        );

        const content = result.choices[0].message.content;
        const tokens = result.usage?.total_tokens || 'N/A';

        traceLog.push({ ts: new Date().toISOString(), label: 'API_RESPONSE', msg: `${content.length} ký tự, ${tokens} tokens` });
        traceLog.push({ ts: new Date().toISOString(), label: 'RAW_RESPONSE', msg: content.substring(0, 500) });

        // Parse JSON from response
        let segments;
        try {
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            segments = JSON.parse(jsonMatch ? jsonMatch[0] : content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
            traceLog.push({ ts: new Date().toISOString(), label: 'PARSE_OK', msg: `${segments.length} đoạn kịch bản` });
        } catch (e) {
            traceLog.push({ ts: new Date().toISOString(), label: 'PARSE_ERROR', msg: e.message });
            sendJSON(res, 500, { ok: false, error: 'Không thể parse response từ AI', traceLog });
            return;
        }

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const cited = segments.filter(s => s.status === 'CITED').length;
        const verify = segments.filter(s => s.status === 'NEEDS_VERIFY').length;
        const nosrc = segments.filter(s => s.status === 'NO_SOURCE').length;

        traceLog.push({ ts: new Date().toISOString(), label: 'SUMMARY', msg: `${cited} CITED, ${verify} NEEDS_VERIFY, ${nosrc} NO_SOURCE | ${elapsed}s` });

        sendJSON(res, 200, {
            ok: true,
            segments,
            model: CONFIG.model,
            tokens,
            elapsed,
            traceLog,
        });

    } catch (e) {
        traceLog.push({ ts: new Date().toISOString(), label: 'FATAL_ERROR', msg: e.message });
        sendJSON(res, 500, {
            ok: false,
            error: e.message,
            traceLog,
        });
    }
}

// ==================== SERVER ====================
const server = http.createServer(async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // ---- API Routes ----
    if (req.method === 'POST' && pathname === '/api/test') {
        return handleTestConnection(req, res);
    }

    if (req.method === 'POST' && pathname === '/api/generate') {
        return handleGenerate(req, res);
    }

    // ---- Static Files ----
    let filePath = pathname === '/' ? '/index.html' : pathname;
    filePath = path.join(__dirname, filePath);

    // Security: prevent directory traversal
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    const ext = path.extname(filePath);
    const contentType = MIME[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('Not found');
            return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
});

server.listen(PORT, () => {
    console.log('');
    console.log('  ╔═══════════════════════════════════════════╗');
    console.log('  ║   🚀 ScriptForge Backend Server           ║');
    console.log('  ╠═══════════════════════════════════════════╣');
    console.log(`  ║   📍 http://localhost:${PORT}                 ║`);
    console.log(`  ║   🤖 Model: ${CONFIG.model}   ║`);
    console.log('  ║   🔒 API Key: ẩn phía server              ║');
    console.log('  ╠═══════════════════════════════════════════╣');
    console.log('  ║   POST /api/test     — Test kết nối       ║');
    console.log('  ║   POST /api/generate — Tạo kịch bản      ║');
    console.log('  ╚═══════════════════════════════════════════╝');
    console.log('');
});
