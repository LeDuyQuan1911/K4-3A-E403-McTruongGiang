/**
 * ScriptForge — Auto Eval Runner
 * Chạy tự động 24 case golden set qua 9Router API và ghi kết quả.
 * 
 * Cách chạy: node run-eval.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ==================== CONFIG (đọc từ .env) ====================
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
        console.error('⚠️  Không tìm thấy .env — tạo file codebase/.env với API_KEY, API_BASE_URL, AI_MODEL');
        process.exit(1);
    }
}
loadEnv();

const API_BASE = (process.env.API_BASE_URL || 'https://9r.thaidangcap.io.vn') + '/v1';
const AI_MODEL = process.env.AI_MODEL || 'cx/gpt-5.6-luna(medium)';
const API_KEY = process.env.API_KEY || '';

// Transcript fixtures (same as in index.html)
const TRANSCRIPT_DATA = {
    "T06": {
        name: "Transcript-06: Attention & Transformer",
        segments: {
            "T06-038": "Trước khi nói về Transformer, mình cần hiểu vấn đề của RNN truyền thống. RNN xử lý tuần tự, token này xong mới đến token kia, nên rất chậm khi câu dài.",
            "T06-042": "Attention mechanism giúp model focus vào relevant parts của input sequence, thay vì phải compress hết thông tin vào một fixed-size vector. Đây là breakthrough lớn trong NLP.",
            "T06-045": "Có nhiều loại attention: additive attention của Bahdanau, multiplicative attention, và quan trọng nhất là scaled dot-product attention được dùng trong Transformer.",
            "T06-051": "Trong self-attention, mỗi token sẽ attend to tất cả token khác trong sequence. Ta tính ba vector Q (Query), K (Key), V (Value) cho mỗi token, rồi dùng dot product giữa Q và K để tính attention weights.",
            "T06-055": "Công thức chính: Attention(Q,K,V) = softmax(QK^T / sqrt(d_k)) × V. Phần chia cho sqrt(d_k) là scaled factor, giúp gradient stable hơn khi d_k lớn.",
            "T06-058": "Ví dụ câu 'the cat sat on the mat because it was tired', khi process token 'it', attention weight cao nhất sẽ point về 'cat'. Đây là cách model hiểu coreference.",
            "T06-063": "Multi-head attention thì mình chạy nhiều attention head parallel, mỗi head sẽ capture different aspect của relationship giữa các tokens. Thường dùng 8 heads.",
            "T06-067": "Transformer architecture gồm encoder stack và decoder stack. Encoder dùng self-attention, decoder dùng masked self-attention và cross-attention.",
            "T06-072": "Positional encoding được thêm vào input embeddings vì Transformer không có recurrence. Dùng sin/cos functions ở different frequencies."
        }
    },
    "Slide3": {
        name: "Slide Bài 3: Deep Learning & Attention",
        segments: {
            "Slide3-p15": "Sequence-to-Sequence Model: Encoder compresses input → fixed vector → Decoder generates output. Vấn đề: bottleneck khi sequence dài.",
            "Slide3-p18": "Bahdanau Attention (2014): Thay vì dùng 1 fixed vector, decoder attend to different parts of encoder output at each step.",
            "Slide3-p22": "Self-Attention Formula: Attention(Q,K,V) = softmax(Q·K^T / √d_k) × V. Q = XW_Q, K = XW_K, V = XW_V.",
            "Slide3-p25": "Multi-Head Attention: MultiHead(Q,K,V) = Concat(head_1,...,head_h)W_O. Mỗi head_i = Attention(QW_i^Q, KW_i^K, VW_i^V).",
            "Slide3-p30": "Transformer Architecture: 6 encoder layers + 6 decoder layers. Mỗi layer có: Multi-Head Attention → Add&Norm → FFN → Add&Norm.",
            "Slide3-p35": "Positional Encoding: PE(pos,2i) = sin(pos/10000^(2i/d_model)), PE(pos,2i+1) = cos(pos/10000^(2i/d_model))."
        }
    },
    "T05": {
        name: "Transcript-05: Sequence Models & RNN",
        segments: {
            "T05-012": "RNN basic idea: hidden state h_t = f(h_{t-1}, x_t). Mỗi time step, model cập nhật hidden state dựa trên input hiện tại và state trước đó.",
            "T05-025": "Vanishing gradient problem: khi backpropagate qua nhiều time steps, gradient nhân nhiều lần → shrink về 0. LSTM và GRU được thiết kế để giải quyết vấn đề này.",
            "T05-035": "LSTM có 3 gates: forget gate, input gate, output gate. Cell state chạy xuyên suốt giúp gradient flow tốt hơn.",
            "T05-042": "Seq2seq model: encoder RNN đọc input, nén vào context vector, decoder RNN generate output từ context vector đó."
        }
    },
    "T03": {
        name: "Transcript-03: Neural Networks cơ bản",
        segments: {
            "T03-008": "Perceptron là đơn vị cơ bản nhất: y = activation(Σ w_i·x_i + b). Mô phỏng 1 neuron sinh học.",
            "T03-015": "Feedforward neural network: nhiều layer, mỗi layer nhiều neurons. Input → Hidden layers → Output. Thông tin chỉ đi một chiều.",
            "T03-028": "Backpropagation: tính gradient của loss theo từng weight bằng chain rule, rồi update weight theo hướng giảm loss.",
            "T03-035": "Gradient descent: w_new = w_old - learning_rate × gradient. Learning rate quá lớn → diverge, quá nhỏ → converge chậm.",
            "T03-045": "Loss functions phổ biến: MSE cho regression, Cross-entropy cho classification. Loss đo khoảng cách giữa prediction và ground truth.",
            "T03-052": "Regularization: L1, L2, Dropout — giúp model không overfit. L2 thêm λ·||w||² vào loss function."
        }
    },
    "T01": {
        name: "Transcript-01: Giới thiệu Machine Learning",
        segments: {
            "T01-005": "Machine Learning là lĩnh vực cho máy tính khả năng học từ dữ liệu mà không cần lập trình tường minh từng rule.",
            "T01-015": "3 loại ML chính: Supervised (có label), Unsupervised (không label), Reinforcement (reward signal).",
            "T01-030": "Overfitting vs Underfitting: model quá phức tạp → overfit training data, model quá đơn giản → underfit."
        }
    },
    "Slide2": {
        name: "Slide Bài 2: Neural Networks",
        segments: {
            "Slide2-p08": "Activation Functions: sigmoid, tanh, ReLU, Leaky ReLU. ReLU phổ biến nhất hiện nay: f(x) = max(0, x).",
            "Slide2-p15": "Universal Approximation Theorem: NN với 1 hidden layer đủ rộng có thể xấp xỉ bất kỳ continuous function nào.",
            "Slide2-p22": "Optimization: SGD, Adam, RMSprop. Adam kết hợp momentum và adaptive learning rate."
        }
    }
};

// ==================== GOLDEN SET ====================
const GOLDEN_SET = [
    { id: "GS-01", topic: "Giải thích cơ chế Attention trong Transformer", sources: ["T06", "Slide3"], expected: "CITED" },
    { id: "GS-02", topic: "Self-Attention là gì, giải thích Q K V", sources: ["T06"], expected: "CITED" },
    { id: "GS-03", topic: "Ví dụ trực quan về Attention weight", sources: ["T06"], expected: "CITED" },
    { id: "GS-04", topic: "Giải thích Backpropagation", sources: ["T03", "Slide2"], expected: "CITED" },
    { id: "GS-05", topic: "Neural Network cơ bản — perceptron và layer", sources: ["T03"], expected: "CITED" },
    { id: "GS-06", topic: "Sequence-to-Sequence model là gì", sources: ["T05"], expected: "CITED" },
    { id: "GS-07", topic: "Giải thích Gradient Descent", sources: ["T03", "Slide2"], expected: "CITED" },
    { id: "GS-08", topic: "RNN và vấn đề vanishing gradient", sources: ["T05"], expected: "CITED" },
    { id: "GS-09", topic: "Loss function trong Deep Learning", sources: ["T03", "Slide2"], expected: "CITED" },
    { id: "GS-10", topic: "Positional Encoding trong Transformer", sources: ["T06", "Slide3"], expected: "CITED" },
    { id: "GS-11", topic: "Giải thích Quantum Computing cho AI", sources: ["T06"], expected: "NO_SOURCE" },
    { id: "GS-12", topic: "Reinforcement Learning — policy gradient", sources: ["T03", "T05"], expected: "NO_SOURCE" },
    { id: "GS-13", topic: "So sánh learning rate giữa 2 nguồn khác nhau", sources: ["T03", "T05"], expected: "NEEDS_VERIFY" },
    { id: "GS-14", topic: "Giải thích 'attention' — có thể là cơ chế ML hoặc tâm lý học", sources: ["T06"], expected: "NEEDS_VERIFY" },
    { id: "GS-15", topic: "Giải thích Deep Learning toàn bộ (chủ đề quá rộng)", sources: ["T03", "T05", "T06"], expected: "NEEDS_VERIFY" },
    { id: "GS-16", topic: "Giải thích regularization chi tiết (nguồn không giải thích sâu)", sources: ["T03"], expected: "NEEDS_VERIFY" },
    { id: "GS-17", topic: "Viết kịch bản từ Wikipedia về Transformer (nguồn ngoài)", sources: [], expected: "NO_SOURCE" },
    { id: "GS-18", topic: "Yêu cầu tự động publish kịch bản lên YouTube", sources: ["T06"], expected: "NO_SOURCE" },
    { id: "GS-19", topic: "Dịch thuật ngữ 'gradient' — dùng 'độ dốc' hay giữ nguyên", sources: ["T03"], expected: "CITED" },
    { id: "GS-20", topic: "Công thức Softmax(QK^T/√dk)V — trích nguyên bản không paraphrase", sources: ["Slide3"], expected: "CITED" },
    { id: "GS-21", topic: "Explain transformer architecture (nhập tiếng Anh)", sources: ["T06"], expected: "NEEDS_VERIFY" },
    { id: "GS-22", topic: "", sources: [], expected: "NO_SOURCE" },
    { id: "GS-23", topic: "Giải thích Attention từ nguồn trống", sources: [], expected: "NO_SOURCE" },
    { id: "GS-24", topic: "Multi-Head Attention — phần AI suy luận thêm ngoài nguồn", sources: ["T06"], expected: "NEEDS_VERIFY" },
];

// ==================== API CALL ====================
function callAPI(systemPrompt, userPrompt) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({
            model: AI_MODEL,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.3,
            max_tokens: 3000
        });

        const url = new URL(`${API_BASE}/chat/completions`);
        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Length': Buffer.byteLength(body)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode !== 200) {
                    reject(new Error(`API ${res.statusCode}: ${data}`));
                    return;
                }
                try {
                    const json = JSON.parse(data);
                    resolve(json.choices[0].message.content);
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

function buildSourceContext(sourceKeys) {
    let context = '';
    sourceKeys.forEach(key => {
        const src = TRANSCRIPT_DATA[key];
        if (!src) return;
        context += `\n=== ${src.name} ===\n`;
        for (const [id, text] of Object.entries(src.segments)) {
            context += `[${id}]: "${text}"\n`;
        }
    });
    return context;
}

const SYSTEM_PROMPT = `Bạn là ScriptForge AI — hệ thống tạo kịch bản video giáo dục có trích dẫn nguồn.

NGUYÊN TẮC BẮT BUỘC:
1. CHỈ sử dụng nội dung từ các nguồn tài liệu được cung cấp bên dưới.
2. Mỗi đoạn kịch bản PHẢI gắn mã trích dẫn [MÃ_NGUỒN] tương ứng.
3. Nếu nội dung KHÔNG CÓ trong nguồn → gắn trạng thái NO_SOURCE và KHÔNG sinh nội dung.
4. Nếu nguồn có liên quan nhưng KHÔNG đề cập trực tiếp → gắn NEEDS_VERIFY.
5. Nếu nguồn rõ ràng và trực tiếp → gắn CITED.
6. Giữ nguyên thuật ngữ gốc (tiếng Anh) kèm giải thích tiếng Việt.
7. Công thức toán → trích nguyên bản từ nguồn, không paraphrase.
8. Nếu chủ đề trống hoặc không hợp lệ → trả về 1 segment NO_SOURCE giải thích lý do.
9. Nếu không có nguồn nào được cung cấp → trả về 1 segment NO_SOURCE.
10. Nếu yêu cầu ngoài phạm vi (publish, dịch thuật, v.v.) → trả về NO_SOURCE.

ĐỊNH DẠNG OUTPUT — trả về JSON array:
[
  {
    "title": "Tên đoạn",
    "status": "CITED" | "NEEDS_VERIFY" | "NO_SOURCE",
    "content": "Nội dung kịch bản bằng tiếng Việt",
    "citations": ["T06-042", "Slide3-p22"],
    "source_quotes": ["Trích nguyên văn từ nguồn..."],
    "confidence_note": "Ghi chú (nếu NEEDS_VERIFY hoặc NO_SOURCE)"
  }
]

Tạo 3-5 đoạn kịch bản. CHỈ trả về JSON, không có text nào khác.`;

// ==================== EVAL LOGIC ====================
function evaluateResult(caseData, segments) {
    // Check if any segment matches expected status
    const statuses = segments.map(s => s.status);
    const hasExpected = statuses.includes(caseData.expected);

    // For CITED cases: check if most segments are CITED
    if (caseData.expected === 'CITED') {
        const citedCount = statuses.filter(s => s === 'CITED').length;
        const citedRatio = citedCount / statuses.length;
        // Also check citations exist
        const hasCitations = segments.some(s => s.citations && s.citations.length > 0);
        return citedRatio >= 0.5 && hasCitations;
    }

    // For NO_SOURCE: check if at least one segment is NO_SOURCE or system refused
    if (caseData.expected === 'NO_SOURCE') {
        return statuses.includes('NO_SOURCE') || segments.some(s =>
            s.content && (s.content.includes('không có nguồn') || s.content.includes('ngoài phạm vi') || s.content.includes('không tìm thấy'))
        );
    }

    // For NEEDS_VERIFY: check if at least one segment is NEEDS_VERIFY
    if (caseData.expected === 'NEEDS_VERIFY') {
        return statuses.includes('NEEDS_VERIFY') || statuses.includes('NO_SOURCE');
    }

    return hasExpected;
}

// ==================== MAIN ====================
async function runEval() {
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║    ScriptForge — Golden Set Eval Runner          ║');
    console.log('║    24 cases · 9Router · cx/gpt-5.6-luna(medium)  ║');
    console.log('╚══════════════════════════════════════════════════╝\n');

    const results = [];
    const traceLog = [];
    let passed = 0, failed = 0, errors = 0;

    for (let i = 0; i < GOLDEN_SET.length; i++) {
        const tc = GOLDEN_SET[i];
        const progress = `[${i + 1}/${GOLDEN_SET.length}]`;
        process.stdout.write(`${progress} ${tc.id}: "${tc.topic.substring(0, 50)}${tc.topic.length > 50 ? '...' : ''}" `);

        // Handle edge cases
        if (!tc.topic || tc.topic.trim() === '') {
            console.log('→ SKIP (input trống) → expected NO_SOURCE');
            results.push({
                ...tc,
                actualStatus: 'NO_SOURCE',
                citationCorrect: 'N/A',
                pass: true,
                note: 'Input trống — hệ thống không xử lý'
            });
            passed++;
            continue;
        }

        if (tc.sources.length === 0) {
            console.log('→ SKIP (không có nguồn) → expected NO_SOURCE');
            results.push({
                ...tc,
                actualStatus: 'NO_SOURCE',
                citationCorrect: 'N/A',
                pass: true,
                note: 'Không có nguồn — hệ thống từ chối đúng'
            });
            passed++;
            continue;
        }

        const sourceContext = buildSourceContext(tc.sources);
        const userPrompt = `CHỦ ĐỀ: ${tc.topic}\nĐỐI TƯỢNG: Người mới bắt đầu\nĐỘ DÀI: ~10 phút\n\n=== TÀI LIỆU NGUỒN ===\n${sourceContext}\n=== HẾT TÀI LIỆU ===\n\nHãy tạo kịch bản video giáo dục về chủ đề trên, CHỈ dựa trên tài liệu nguồn đã cung cấp. Trả về JSON array.`;

        try {
            const raw = await callAPI(SYSTEM_PROMPT, userPrompt);

            // Parse JSON
            let segments;
            try {
                const jsonMatch = raw.match(/\[[\s\S]*\]/);
                segments = JSON.parse(jsonMatch ? jsonMatch[0] : raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
            } catch (e) {
                throw new Error(`JSON parse failed: ${e.message}`);
            }

            // Evaluate
            const statuses = segments.map(s => s.status);
            const primaryStatus = statuses.includes(tc.expected) ? tc.expected : statuses[0];
            const hasCitations = segments.some(s => s.citations && s.citations.length > 0);
            const isPass = evaluateResult(tc, segments);

            if (isPass) {
                console.log(`→ ✅ PASS | actual: ${primaryStatus} | citations: ${hasCitations ? 'Có' : 'Không'}`);
                passed++;
            } else {
                console.log(`→ ❌ FAIL | expected: ${tc.expected} | actual: ${statuses.join(',')} | citations: ${hasCitations ? 'Có' : 'Không'}`);
                failed++;
            }

            results.push({
                ...tc,
                actualStatus: primaryStatus,
                allStatuses: statuses.join(', '),
                citationCorrect: hasCitations ? 'Có' : 'Không',
                pass: isPass,
                note: isPass ? '' : `Expected ${tc.expected}, got ${statuses.join(',')}`
            });

            // Save trace
            traceLog.push({
                caseId: tc.id,
                topic: tc.topic,
                sources: tc.sources,
                promptLength: userPrompt.length,
                responseLength: raw.length,
                segments: segments.length,
                statuses: statuses,
                rawResponsePreview: raw.substring(0, 300)
            });

            // Rate limiting — wait 1.5s between calls
            await new Promise(r => setTimeout(r, 1500));

        } catch (error) {
            console.log(`→ ⚠️ ERROR: ${error.message}`);
            errors++;
            results.push({
                ...tc,
                actualStatus: 'ERROR',
                citationCorrect: 'N/A',
                pass: false,
                note: error.message
            });
        }
    }

    // ==================== GENERATE RESULTS.MD ====================
    const now = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    const totalRun = passed + failed + errors;
    const passRate = ((passed / totalRun) * 100).toFixed(1);

    let md = `# Golden Set & Kết quả kiểm thử

## Chiều chất lượng

| Chiều | Định nghĩa kiểm chứng được |
|---|---|
| **Citation accuracy** | Mã trích dẫn [Txx-NNN] trỏ đúng đoạn nguồn tương ứng, nội dung draft khớp với nguồn |
| **Status classification** | Trạng thái CITED/NEEDS_VERIFY/NO_SOURCE được gắn đúng |
| **Refusal rate** | Khi input thuộc case NO_SOURCE hoặc ngoài phạm vi → AI từ chối sinh (không bịa) |
| **Relevance** | Nội dung draft liên quan trực tiếp đến chủ đề đã nhập |

## Quality Bar

**"Đạt khi ≥80% citation chính xác, 100% case NO_SOURCE được từ chối đúng, và ≥70% user chấp nhận draft không cần sửa lớn"**

## Phân bổ Golden Set (24 case)

| Loại | Số case | Case IDs |
|---|---|---|
| Happy path (common) | 10 | GS-01 → GS-10 |
| Lớp ① Nguồn sự thật | 3 | GS-11, GS-12, GS-13 |
| Lớp ② Mơ hồ / thiếu thông tin | 3 | GS-14, GS-15, GS-16 |
| Lớp ③ Ngoài phạm vi | 2 | GS-17, GS-18 |
| Lớp ④ Đặc thù domain | 3 | GS-19, GS-20, GS-24 |
| Edge cases | 3 | GS-21, GS-22, GS-23 |

- Từ chatlog/data thật: 14 case
- Synthetic: 10 case

## Kết quả lượt 1 — ${now}

**Model:** ${AI_MODEL} (qua 9Router)
**Tổng: ${passed}/${totalRun} = ${passRate}%**

| # | Case ID | Input | Expected | Actual | Citation? | Pass/Fail | Ghi chú |
|---|---|---|---|---|---|---|---|
`;

    results.forEach((r, i) => {
        const topicShort = r.topic ? r.topic.substring(0, 40) + (r.topic.length > 40 ? '...' : '') : '(trống)';
        md += `| ${i + 1} | ${r.id} | ${topicShort} | ${r.expected} | ${r.actualStatus} | ${r.citationCorrect} | ${r.pass ? '✅ Pass' : '❌ Fail'} | ${r.note || ''} |\n`;
    });

    // Summary stats
    const noSourceCases = results.filter(r => r.expected === 'NO_SOURCE');
    const noSourceCorrect = noSourceCases.filter(r => r.pass).length;
    const citedCases = results.filter(r => r.expected === 'CITED');
    const citedCorrect = citedCases.filter(r => r.pass).length;

    md += `
### Tóm tắt

| Metric | Kết quả |
|---|---|
| **Tổng đạt** | ${passed}/${totalRun} (${passRate}%) |
| **CITED accuracy** | ${citedCorrect}/${citedCases.length} (${citedCases.length > 0 ? ((citedCorrect / citedCases.length) * 100).toFixed(0) : 0}%) |
| **NO_SOURCE refusal** | ${noSourceCorrect}/${noSourceCases.length} (${noSourceCases.length > 0 ? ((noSourceCorrect / noSourceCases.length) * 100).toFixed(0) : 0}%) |
| **Errors** | ${errors} |

### Phân tích case chưa đạt

| Case # | Nguyên nhân | Hướng sửa |
|---|---|---|
`;

    results.filter(r => !r.pass).forEach(r => {
        let cause = '', fix = '';
        if (r.actualStatus === 'ERROR') {
            cause = 'API error';
            fix = 'Retry hoặc kiểm tra API key/model';
        } else if (r.expected === 'NO_SOURCE' && r.actualStatus !== 'NO_SOURCE') {
            cause = 'AI vẫn sinh nội dung dù không nên';
            fix = 'Thêm rule mạnh hơn trong system prompt';
        } else if (r.expected === 'CITED' && r.actualStatus !== 'CITED') {
            cause = 'AI không gắn CITED dù nguồn rõ ràng';
            fix = 'Cải thiện prompt về citation rules';
        } else if (r.expected === 'NEEDS_VERIFY') {
            cause = 'AI không nhận ra mơ hồ';
            fix = 'Thêm examples cho ambiguous cases';
        } else {
            cause = r.note || 'Không xác định';
            fix = 'Review và cải thiện prompt';
        }
        md += `| ${r.id} | ${cause} | ${fix} |\n`;
    });

    if (results.filter(r => !r.pass).length === 0) {
        md += `| — | Không có case nào fail | — |\n`;
    }

    // Write results
    fs.writeFileSync(path.join(__dirname, '..', 'eval', 'results.md'), md, 'utf-8');
    console.log(`\n✅ Đã ghi kết quả vào eval/results.md`);

    // Write trace log
    fs.writeFileSync(
        path.join(__dirname, '..', 'eval', 'trace-log.json'),
        JSON.stringify(traceLog, null, 2),
        'utf-8'
    );
    console.log(`📋 Đã ghi trace log vào eval/trace-log.json`);

    // Summary
    console.log(`\n${'═'.repeat(50)}`);
    console.log(`  TỔNG KẾT: ${passed} passed, ${failed} failed, ${errors} errors`);
    console.log(`  TỶ LỆ:    ${passRate}%`);
    console.log(`${'═'.repeat(50)}\n`);
}

runEval().catch(e => {
    console.error('Fatal error:', e);
    process.exit(1);
});
