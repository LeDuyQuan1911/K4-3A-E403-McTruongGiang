# AI SPEC — Research-to-Script: AI nghiên cứu nguồn → draft kịch bản có trích dẫn · Nhóm Lê Duy Quân · Lớp 3A
> Chốt CP4 ngày 17/09: thiết kế triển khai hiện hành ở **§10** và `docs/c3-compliance.md`, được ưu tiên khi khác với mô tả prototype ban đầu. Evidence khảo sát đã được ẩn danh tại `evidence/README.md`; dữ liệu gốc và định danh người trả lời không nằm trong Git.
Hướng: [x] C — Lesson Studio · Đề C3
Loại: [x] Tính năng mới

## §1. User & Job
- **Job executor:** Người viết kịch bản video giáo dục (Studio team) — workflow: nhận đề bài → tra cứu transcript/slide → viết kịch bản → biên tập viên duyệt → dựng video
- **Core JTBD:** Khi viết kịch bản cho bài giảng mới, người viết muốn tìm nhanh nội dung chính xác từ tài liệu gốc để đảm bảo kịch bản có căn cứ và trích dẫn được nguồn
- **Problem statement (KHÔNG chữ AI):** Người viết kịch bản phải tra cứu thủ công hàng chục trang transcript/slide để tìm đoạn liên quan, mất hàng giờ mỗi kịch bản; nếu bỏ sót nguồn hoặc trích sai, kịch bản thiếu tin cậy và phải sửa nhiều vòng
- **Evidence** (chuẩn A — khảo sát ẩn danh + mining):
  - Hai mươi phản hồi được mã hóa P01–P20; mười chín phản hồi có pain point và một phản hồi không rõ. Đây là mẫu thuận tiện, không suy rộng thành thống kê đại diện.
  - Quote đã khử định danh cho thấy khó định vị transcript/slide, sợ trích dẫn AI sai, gặp mâu thuẫn và thiếu kịch bản đủ dài/có cấu trúc.
  - Mining nội bộ rà soát ba mươi tám đoạn chuẩn, ghi nhận mười bốn đoạn có rủi ro trích dẫn/paraphrase. Phương pháp và năm mẫu đã khử định danh nằm trong `evidence/README.md`.

## §2. Impact & quyết định chọn

| Ứng viên | Bao nhiêu người | Tần suất | Tốn gì mỗi lần | Build nổi? | Chọn? |
|---|---|---|---|---|---|
| **C3: Research→Script có trích dẫn** | Studio team (~5-10 người) + bất kỳ ai viết nội dung giáo dục | Mỗi kịch bản mới (hàng tuần) | 2-4 giờ tra cứu thủ công | ✅ RAG + citation | **✅ CHỌN** |
| C2: QA kịch bản sượng | Studio team (~5 người) | Mỗi kịch bản | 30-60 phút review | Cần NLP tiếng Việt chuyên sâu | ❌ Kỹ thuật quá nặng |
| C1: Knowledge graph → quiz | Giảng viên (~3-5 người) | Mỗi chương | 1-2 giờ soạn quiz | Cần graph extraction phức tạp | ❌ Scope quá lớn |

- **Ứng viên ĐÃ LOẠI:** C2 (NLP tiếng Việt quá chuyên sâu, khó build trong 47h), C1 (scope graph extraction + adaptive learning quá lớn)
- **Ứng viên CHỌN:** C3 — pain tra cứu có số (>90% xác nhận cần), kỹ thuật RAG quen thuộc, lát cắt gọn

## §3. Giải pháp tương tự đã nghiên cứu
- **NotebookLM (Google):** Upload tài liệu → AI trả lời kèm cite nguồn. Đáng học: citation trỏ đúng đoạn nguồn. Đáng né: không sinh "kịch bản" dạng đọc, chỉ trả lời Q&A. Mình khác: output là kịch bản hoàn chỉnh, không phải câu trả lời.
- **ChatGPT + upload PDF:** Đáng học: sinh văn bản mượt. Đáng né: hay bịa nguồn, trích dẫn sai trang, không phân biệt confidence. Mình khác: từ chối sinh khi không có nguồn thay vì bịa; gắn trạng thái CITED/NEEDS_VERIFY/NO_SOURCE.

## §4. Thiết kế
- **Lát cắt hiện hành:** Người viết nhập chủ đề, mục tiêu, người học và thời lượng · hệ thống tìm/tải URL công khai, lập hồ sơ nguồn · người viết duyệt nguồn · AI tạo kịch bản bài học theo slide/cảnh gồm tiêu đề, chữ trên slide, lời đọc đầy đủ, ý đồ hình và citation · người viết duyệt/sửa/chấp nhận từng cảnh.
- **Non-goals:**
  1. KHÔNG build video editor / TTS preview
  2. KHÔNG tự xuất bản kịch bản chưa duyệt
  3. KHÔNG hỗ trợ ngôn ngữ ngoài tiếng Việt
  4. KHÔNG thay thế biên tập viên — AI chỉ draft, người duyệt
- **Mức prototype:** [x] Working. Có pipeline URL→HTML→hồ sơ→người duyệt→kịch bản→export; adapter model viết và dịch vụ tìm nguồn được kiểm thử theo giao thức. Chất lượng model trên brief thật vẫn cần đo độc lập.
- **Automation:** [x] Conditional
  - Lý do: Kịch bản sai nội dung → video sai → học viên học sai kiến thức → cost-of-error CAO
  - Nên: AI tự draft khi có nguồn chắc chắn (CITED); gắn cờ "cần xác minh" khi mơ hồ (NEEDS_VERIFY); **từ chối sinh** khi không tìm thấy nguồn (NO_SOURCE) thay vì bịa

### §4b. Nguyên tắc HAX/PAIR đã áp dụng (4 nguyên tắc)

| Nguyên tắc | Áp cụ thể vào đâu trong prototype |
|---|---|
| **G1 — Làm rõ hệ thống làm được gì** | Bước 1: Banner "ScriptForge chỉ draft kịch bản từ tài liệu bạn chọn — không tự bịa thông tin ngoài nguồn" |
| **G2 — Làm rõ nó làm tốt đến đâu** | Bước 2: Ghi rõ "AI chỉ trích dẫn từ các nguồn bạn chọn"; Bước 4: Mỗi đoạn gắn trạng thái CITED / NEEDS_VERIFY / NO_SOURCE |
| **G10 — Thu hẹp phạm vi khi nghi ngờ** | Bước 4 (NEEDS_VERIFY): Banner "Nguồn tìm được có liên quan nhưng không đề cập trực tiếp — cần người xác minh". Bước 4 (NO_SOURCE): Từ chối sinh, gợi ý thêm nguồn hoặc tự viết |
| **G9 — Sửa dễ dàng** | Bước 4: Mỗi đoạn có 3 nút [✓ Chấp nhận] [✏ Sửa] [✗ Bỏ], user sửa trực tiếp trên output |

## §5. Kiểu lỗi — 4 lớp chỗ khó + kịch bản

| Lớp | Chỗ khó | Kịch bản (≥2/lớp) |
|---|---|---|
| ① Nguồn sự thật | AI bịa nội dung không có trong transcript/slide | KB1: Hỏi chủ đề ngoài transcript → AI phải nói "không tìm thấy nguồn" thay vì bịa · KB2: 2 transcript nói trái ngược → AI trích cả 2 kèm cảnh báo |
| ② Mơ hồ / thiếu thông tin | Chủ đề quá rộng hoặc từ khoá có nhiều nghĩa | KB3: Nhập "attention" (có thể là cơ chế ML hoặc tâm lý học) → AI hỏi lại hoặc gắn NEEDS_VERIFY · KB4: Transcript đề cập khái niệm nhưng không giải thích sâu → gắn NEEDS_VERIFY |
| ③ Ngoài phạm vi | User đòi sinh nội dung mà hệ thống không được phép | KB5: Yêu cầu viết kịch bản từ nguồn ngoài (Wikipedia, paper) → từ chối, gợi ý thêm nguồn vào hệ thống · KB6: Yêu cầu tự động publish → từ chối, chỉ cho xuất bản nháp |
| ④ Đặc thù domain | Kiến thức chuyên ngành sai → học viên học sai | KB7: Dịch sai thuật ngữ (ví dụ "gradient" → "độ dốc" vs "gradient") → trích nguyên văn nguồn kèm thuật ngữ gốc · KB8: Công thức toán bị sai khi paraphrase → trích nguyên bản + gắn NEEDS_VERIFY |

## §6. Bốn đường đi của trải nghiệm

- **Happy path (CITED):** User nhập chủ đề → chọn transcript → AI tìm đoạn liên quan → draft kịch bản kèm cite [T06-042] → user bấm cite xem nguồn gốc → chấp nhận → xuất kịch bản hoàn chỉnh
- **Low-confidence (NEEDS_VERIFY):** AI tìm được nguồn liên quan nhưng không khớp trực tiếp → gắn 🟡 NEEDS_VERIFY + banner "cần người xác minh" → user bấm cite kiểm tra nguồn → chấp nhận / sửa / bỏ
- **Failure / không căn cứ (NO_SOURCE):** AI không tìm thấy nguồn trong tài liệu đã chọn → gắn 🔴 NO_SOURCE → **không sinh nội dung** → gợi ý: thêm nguồn / tự viết / bỏ qua
- **Correction (user sửa):** User bấm [✏ Sửa] → chỉnh trực tiếp trên output → giữ lại trích dẫn hoặc xoá
- **Ngoài phạm vi (③):** User yêu cầu nguồn ngoài hệ thống → từ chối + gợi ý "vui lòng thêm nguồn vào bước 2"
- **Case đặc thù domain (④):** Thuật ngữ chuyên ngành → giữ nguyên bản gốc, không tự ý paraphrase; công thức → trích nguyên bản + NEEDS_VERIFY

## §7. Kiểm thử
- **Chiều chất lượng:** Citation accuracy (trích dẫn đúng đoạn nguồn) · Relevance (nội dung draft liên quan đến chủ đề) · Refusal rate (có từ chối đúng khi không có nguồn không)
- **Golden set:** 50 case — file: `eval/golden-set.csv`
  - 20 case CITED (có nguồn rõ)
  - 12 case NEEDS_VERIFY (nguồn mơ hồ)
  - 10 case NO_SOURCE (không có nguồn → phải từ chối)
  - 8 case ngoài phạm vi (phải từ chối)
- **Quality bar:** "Đạt khi ≥80% citation chính xác, 100% case NO_SOURCE được từ chối đúng, và ≥70% user chấp nhận draft không cần sửa lớn"
- **Kết quả CP4:** 81/81 regression phần mềm qua; 50/50 case fixture qua, có bảng từng case. Đây không phải lượt chấm model thật. Xem `eval/results.md`.

## §8. Phân công & kế hoạch

| Vai trò | Người | Việc cụ thể |
|---|---|---|
| Spec + Evidence | Nguyễn Lê Phúc Thắng, Vũ Minh Hoàng | Viết spec, phỏng vấn Studio team, mining data |
| Prototype | Lê Duy Quân, Bùi Trọng Trịnh | Code RAG pipeline + UI |
| AI Call | Bùi Trọng Trịnh, Nguyễn Lê Phúc Thắng | Prompt engineering, citation format |
| Eval | Lê Duy Quân, Nguyễn Lê Phúc Thắng | Golden set ≥20 case, chạy đo |
| Validation/Demo | Vũ Minh Hoàng, Lê Duy Quân | User test, slide, video demo |

- **Willing users:** mã ẩn danh P01–P04 (hai coach và hai người học). Danh tính/liên hệ không lưu trong Git.

## §9. Changelog
| Thời điểm | Đổi gì | Vì sao |
|---|---|---|
| 16/9 19:30 | Tạo Canvas CP1, chọn Track C3 | Khảo sát ~20 người, >90% xác nhận cần công cụ tìm nguồn |
| 16/9 20:00 | Mock prototype 5 bước + spec §4, §6 (CP2) | Thiết kế luồng trải nghiệm trước khi code |
| 17/9 CP4 | Chốt evidence ẩn danh, golden set 50 ca, quality bar và giới hạn đo lường | Không đưa định danh người trả lời hoặc kết quả model chưa đo vào claim |

## §10. Thiết kế hiện hành theo nguyên văn C3

- Đầu vào đủ bốn trường: chủ đề, mục tiêu học tập, người học, thời lượng. Không yêu cầu cấp transcript/slide trước. Agent tìm URL bằng Exa, Tavily hoặc OpenAI Web Search, tải trang HTML thật, đánh giá theo tiêu chí công khai và chờ người dùng duyệt nguồn.
- Lát cắt: kịch bản bài học tiếng Việt theo số slide/cảnh phù hợp thời lượng; mỗi cảnh có tiêu đề, ý trên slide, lời đọc đầy đủ, ý đồ hình và claim/citation. Nguồn ngoại ngữ được hỗ trợ; bản dịch phải đối chiếu.
- Model viết mặc định DeepSeek; đổi OpenAI/Gemini/endpoint tương thích bằng `.env`. Tìm kiếm độc lập với model viết. Không dùng model để tự bịa danh sách URL khi thiếu dịch vụ tìm kiếm; thêm URL thủ công là đường dự phòng và không đủ thay demo tự tìm nguồn.
- Mỗi trích đoạn phải khớp chính xác bản văn bản đã tải (chuẩn hóa Unicode/khoảng trắng). CITED chỉ là khớp nguyên văn, không chứng minh ý nghĩa đúng; paraphrase luôn NEEDS_VERIFY. NO_SOURCE không được chấp nhận. Số liệu cần ít nhất hai nhóm nguồn và người duyệt xác nhận độc lập/ngữ cảnh.
- Đổi/bỏ nguồn chỉ làm mất hiệu lực câu phụ thuộc. Chỉnh câu hủy quyết định duyệt cũ. Thêm nguồn có mâu thuẫn liên quan mở lại lượt duyệt. Export bị chặn khi còn nguồn/câu chờ duyệt, thiếu bằng chứng hoặc chưa có xác nhận giảng viên.
- Dữ liệu web luôn là dữ liệu không tin cậy, không phải chỉ dẫn. Có cách ly lệnh ẩn theo mẫu, chặn URL mạng riêng, kiểm tra robots/noai/paywall, không thực thi JavaScript website. Các cơ chế heuristic vẫn cần người biên soạn kiểm tra.
- Xuất Markdown, JSON kịch bản theo schema ban tổ chức, hồ sơ nguồn, trace nguồn–câu và audit. Bộ thử giả có nhãn riêng, không được dùng làm bằng chứng model thật.
- 81 kiểm thử phần mềm đã qua. Golden set 50 ca: `eval/golden-set.md`; 50/50 fixture result nằm tại `eval/golden-results.csv`. `eval/results.md` chỉ báo cáo regression và tính toàn vẹn của bộ case. Chưa có số đo chất lượng model hay user acceptance; giữ mục tiêu chất lượng ở §7, không tuyên bố đạt các ngưỡng.
- Hướng dẫn chạy, đổi API, chi phí và giới hạn: `codebase/README.md`. Đối chiếu đầy đủ và phần còn thiếu: `docs/c3-compliance.md`.

