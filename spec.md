# AI SPEC — Research-to-Script: AI nghiên cứu nguồn → draft kịch bản có trích dẫn · Nhóm Lê Duy Quân · Lớp 3A
Hướng: [x] C — Lesson Studio · Đề C3
Loại: [x] Tính năng mới

## §1. User & Job
- **Job executor:** Người viết kịch bản video giáo dục & slide bài giảng (Studio team / Giảng viên / Học viên thuyết trình) — workflow: nhận đề bài → tra cứu transcript/slide → viết kịch bản → biên tập viên duyệt → dựng video/slide.
- **Core JTBD:** Khi viết kịch bản cho bài giảng mới, người viết muốn nhanh chóng trích xuất nội dung chính xác từ tài liệu gốc, có cấu trúc slide trực quan (mục đích, hình ảnh gợi ý, takeaway) để đảm bảo kịch bản có căn cứ vững chắc và trích dẫn kiểm chứng được.
- **Problem statement (KHÔNG chữ AI):** Người viết kịch bản phải tra cứu thủ công hàng chục trang transcript/slide để tìm đoạn liên quan, mất từ 2-4 giờ mỗi kịch bản; nếu bỏ sót nguồn hoặc trích sai số liệu, kịch bản mất uy tín và phải biên tập sửa đi sửa lại nhiều vòng.
- **Evidence thực tế (Chuẩn A & Chuẩn B — Chi tiết tại [`evidence/README.md`](file:///c:/Users/PC/Desktop/hackathonAI/evidence/README.md)):**
  - **Khảo sát 20 người (Chuẩn A):** 19/20 người (95%) xác nhận gặp khó khăn lớn khi tra cứu tài liệu và đối mặt với rủi ro tài liệu mâu thuẫn hoặc AI thông thường bịa nguồn.
  - **Quote nguyên văn:** 
    > *"Lội lại transcript video cũ với slide bài giảng để tìm xem thầy nói đoạn công thức đó ở phút thứ mấy, nhiều khi xem hết 2 tiếng video chỉ để lấy 2 câu trích dẫn."* — Tai Thanh (Lab Coach)
    > *"ChatGPT viết mượt nhưng hay bịa tài liệu tham khảo với số trang. Đưa vào slide dạy học viên mà trích dẫn sai là mất uy tín ngay."* — Mây (Lab Coach)
  - **Mining data (Chuẩn B):** Rà soát 38 đoạn trích qua 6 transcript và 3 bài slide kỹ thuật; phát hiện 14 điểm nghẽn dễ gây mâu thuẫn hoặc biến dạng công thức toán nếu không có cơ chế Grounded RAG.

---

## §2. Impact & quyết định chọn

| Ứng viên | Bao nhiêu người | Tần suất | Tốn gì mỗi lần | Build nổi? | Chọn? |
|---|---|---|---|---|---|
| **C3: Research→Script có trích dẫn** | Studio team (~5-10 người) + giảng viên, học viên | Mỗi kịch bản mới (hàng tuần) | 2-4 giờ tra cứu thủ công | ✅ RAG + Citation + Schema JSON | **✅ CHỌN** |
| C2: QA kịch bản sượng | Studio team (~5 người) | Mỗi kịch bản | 30-60 phút review | Cần NLP tiếng Việt chuyên sâu | ❌ Kỹ thuật quá nặng |
| C1: Knowledge graph → quiz | Giảng viên (~3-5 người) | Mỗi chương | 1-2 giờ soạn quiz | Cần graph extraction phức tạp | ❌ Scope quá lớn |

- **Ứng viên ĐÃ LOẠI:** C2 (NLP phân tích độ sượng tiếng Việt cần fine-tune sâu, rủi ro cao trong 47h), C1 (Knowledge Graph phức tạp vượt ngoài thời lượng hackathon).
- **Ứng viên CHỌN:** C3 — Pain point rõ ràng nhất (95% xác nhận), có giải pháp kỹ thuật khả thi, lát cắt sắc bén, giải quyết đúng bài toán tin cậy nội dung.

---

## §3. Giải pháp tương tự đã nghiên cứu
- **NotebookLM (Google):** Upload tài liệu → AI trả lời kèm cite nguồn. Đáng học: Trích dẫn trỏ đúng đoạn văn bản gốc. Đáng né: Chỉ trả lời Q&A dạng chat, không hỗ trợ cấu trúc kịch bản slide có lời thoại thuyết trình và gợi ý visual. Khác biệt của ScriptForge: Trả về kịch bản theo thời lượng thực tế, có đầy đủ Slide Blueprint (Tiêu đề, Mục đích, Gợi ý hình ảnh, Takeaway).
- **ChatGPT / Claude (Prompt trực tiếp):** Đáng học: Câu văn mượt mà. Đáng né: Bịa nguồn (hallucination), không có cơ chế từ chối khi tài liệu rỗng, không gắn cờ cảnh báo mức độ tin cậy. Khác biệt của ScriptForge: Chế độ kiểm soát nghiêm ngặt (Refusal 100% khi không có nguồn), phân loại 3 trạng thái minh bạch (CITED, NEEDS_VERIFY, NO_SOURCE).

---

## §4. Thiết kế & Kiến trúc

- **Lát cắt MỘT CÂU:**
  > *Một người viết kịch bản · nhập chủ đề + chọn thời lượng + chọn transcript/slide nguồn · AI trích nội dung và sinh kịch bản chi tiết chuẩn tốc độ nói kèm mã trích dẫn [Txx-NNN] và Slide Blueprint (mục đích, hình ảnh, takeaway) · người viết duyệt/sửa/chấp nhận hàng loạt trước khi xuất bản.*

- **Non-goals:**
  1. KHÔNG làm trình biên tập video (Video Editor / NLE) hay preview Text-to-Speech dạng render sóng âm.
  2. KHÔNG tự động publish kịch bản lên mạng xã hội/YouTube mà bắt buộc phải có bước con người duyệt (Human-in-the-loop).
  3. KHÔNG hỗ trợ các ngôn ngữ ngoài tiếng Việt trong phạm vi bài thi.
  4. KHÔNG thay thế con người — AI đóng vai trò người trợ lý tổng hợp nguồn và tạo bản nháp chất lượng cao.

- **Mức prototype:** Working Prototype hoàn chỉnh kết nối API thật:
  - Frontend: Single Page Application giao diện sáng cao cấp (Light Theme) 3 tầng phân cấp rõ rệt.
  - Backend: Node.js server proxy an toàn qua 9Router (`cx/gpt-5.6-luna(medium)`).
  - Tự động scale độ dài: Tính toán theo tốc độ nói chuẩn (~130 từ/phút $\approx$ 1300–1600 từ cho video 10 phút, 6–8 slide chi tiết có công thức toán học và số liệu).

- **Cấu trúc Slide Blueprint Metadata:**
  Mỗi phân đoạn slide gồm:
  - `slide_title`: Tiêu đề súc tích của slide.
  - `purpose`: Mục đích truyền tải kiến thức của slide.
  - `visual_cue`: Gợi ý hình ảnh, sơ đồ, biểu đồ minh họa cụ thể để người làm slide thiết kế.
  - `key_takeaway`: Thông điệp / bài học cốt lõi người xem nhận được sau khi nghe xong slide.
  - `content`: Lời thoại thuyết trình chi tiết (Voiceover Script) kèm các mã trích dẫn `[Txx-NNN]`.
  - `citations` & `source_quotes`: Đoạn văn bản nguyên văn trích từ tài liệu gốc.

- **Automation: Conditional (Có điều kiện)**
  - Tự draft khi có nguồn đủ tin cậy trong transcript/slide (`CITED`).
  - Gắn cờ cảnh báo vàng khi thông tin liên quan nhưng không trực tiếp (`NEEDS_VERIFY`).
  - **Từ chối sinh nội dung** và giải thích lý do khi không có nguồn (`NO_SOURCE`).

---

### §4b. Nguyên tắc HAX/PAIR đã áp dụng (5 nguyên tắc)

| Nguyên tắc | Áp cụ thể vào đâu trong prototype |
|---|---|
| **G1 — Làm rõ hệ thống làm được gì** | Bước 1 & Bước 2: Hiển thị banner cam kết "ScriptForge chỉ trích dẫn từ tài liệu bạn chọn — từ chối bịa thông tin ngoài nguồn" |
| **G2 — Làm rõ nó làm tốt đến đâu** | Bước 4: Thẻ trạng thái 3 màu (🟢 CITED, 🟡 NEEDS_VERIFY, 🔴 NO_SOURCE) kèm thanh tiến độ duyệt real-time |
| **G9 — Sửa dễ dàng** | Bước 4: Hỗ trợ sửa nội dung inline trực tiếp, nút bỏ slide, và nút **"✓ Chấp nhận tất cả"** để duyệt hàng loạt |
| **G10 — Thu hẹp phạm vi khi nghi ngờ** | Khi chủ đề mơ hồ hoặc nguồn không trực tiếp $\rightarrow$ banner cảnh báo ⚠️ kèm nhãn NEEDS_VERIFY; khi không có nguồn $\rightarrow$ từ chối sinh và đề xuất thêm tài liệu |
| **G11 — Tương tác nhịp nhàng / Tránh sót việc** | Khi người dùng bấm "Xuất kịch bản" mà còn slide chưa duyệt $\rightarrow$ Hộp thoại Modal thông minh bật lên cảnh báo số lượng slide chưa duyệt và cung cấp tùy chọn "✓ Chấp nhận tất cả các slide còn lại để xuất ngay" |

---

## §5. Kiểu lỗi — 4 lớp chỗ khó + kịch bản kiểm thử

| Lớp | Chỗ khó | Kịch bản kiểm thử cụ thể |
|---|---|---|
| **① Nguồn sự thật** | AI bịa nội dung không có trong tài liệu nguồn | • KB1: Hỏi về "Quantum Computing" khi nguồn chỉ có Transformer $\rightarrow$ AI từ chối sinh (`NO_SOURCE`).<br>• KB2: Hai nguồn nói trái ngược về learning rate $\rightarrow$ AI trích dẫn cả hai và gắn `NEEDS_VERIFY`. |
| **② Mơ hồ / thiếu thông tin** | Chủ đề đa nghĩa hoặc phạm vi quá rộng | • KB3: Nhập từ khóa "attention" (ML vs Tâm lý học) $\rightarrow$ Cảnh báo cần xác minh.<br>• KB4: Nguồn nhắc đến Regularization nhưng không phân tích sâu $\rightarrow$ Gắn `NEEDS_VERIFY`. |
| **③ Ngoài phạm vi** | Yêu cầu các tác vụ hệ thống không hỗ trợ | • KB5: Yêu cầu lấy tin tức từ Wikipedia bên ngoài $\rightarrow$ Từ chối và hướng dẫn chọn nguồn nội bộ.<br>• KB6: Yêu cầu tự động publish video lên YouTube $\rightarrow$ Từ chối, chỉ cho xuất bản nháp markdown. |
| **④ Đặc thù domain** | Dịch sai thuật ngữ kỹ thuật, sai lệch công thức | • KB7: Thuật ngữ "Gradient", "Dropout", "Perceptron" $\rightarrow$ Bắt buộc giữ nguyên từ gốc kèm giải nghĩa.<br>• KB8: Công thức toán học $\rightarrow$ Trích nguyên bản $Attention(Q,K,V) = \text{softmax}(QK^T/\sqrt{d_k})V$, không paraphrase sai ma trận. |

---

## §6. Bốn đường đi của trải nghiệm

1. **Happy Path (CITED):**
   - Người dùng nhập chủ đề $\rightarrow$ chọn nguồn $\rightarrow$ chọn thời lượng (10 phút) $\rightarrow$ AI tạo kịch bản 6-8 slide đầy đủ blueprint $\rightarrow$ Người dùng kiểm tra mã trích dẫn $\rightarrow$ Bấm "✓ Chấp nhận tất cả" $\rightarrow$ Xuất file Markdown hoàn chỉnh.
2. **Low-Confidence Path (NEEDS_VERIFY):**
   - Khi chủ đề mơ hồ hoặc thông tin suy luận ngoài nguồn $\rightarrow$ Slide gắn nhãn 🟡 NEEDS_VERIFY kèm banner cảnh báo $\rightarrow$ Người dùng đọc kỹ và quyết định Chấp nhận hoặc Bấm Sửa câu chữ.
3. **Failure / Refusal Path (NO_SOURCE):**
   - Khi chủ đề không có trong nguồn $\rightarrow$ Slide hiển thị nhãn 🔴 NO_SOURCE và ghi rõ "[Không sinh] Không tìm thấy tài liệu liên quan" $\rightarrow$ Gợi ý người dùng quay lại Bước 2 để tải thêm tài liệu.
4. **Correction & Guided Review Path:**
   - Người dùng bấm "✗ Bỏ đoạn" ở các slide không cần thiết (slide bị mờ đi).
   - Nếu bấm "Tiếp → Xuất kịch bản" khi còn slide chưa duyệt $\rightarrow$ Hộp thoại cảnh báo xuất hiện:
     - Cho phép quay lại đọc tiếp, HOẶC
     - Tự động chấp nhận tất cả các slide còn lại (ngoại trừ các slide đã bấm bỏ) và xuất ngay lập tức.

---

## §7. Kết quả Kiểm thử thực tế (Cập nhật từ [`eval/results.md`](file:///c:/Users/PC/Desktop/hackathonAI/eval/results.md))

### Quality Bar đã đặt ra:
> *"Đạt khi ≥80% citation chính xác, 100% case NO_SOURCE được từ chối đúng (không bịa), và ≥70% user chấp nhận draft không cần sửa lớn"*

### Kết quả đo lường tự động trên 24 cases Golden Set:
- **Model:** `cx/gpt-5.6-luna(medium)` qua cổng 9Router API
- **Runner:** Script tự động [`codebase/run-eval.js`](file:///c:/Users/PC/Desktop/hackathonAI/codebase/run-eval.js)

| Tiêu chí | Mục tiêu (Quality Bar) | Kết quả thực tế | Đánh giá |
|---|:---:|:---:|:---:|
| **Tỷ lệ Pass toàn bộ** | $\ge 80\%$ | **20/24 (83.3%)** | ✅ ĐẠT VƯỢT CHỈ TIÊU |
| **Độ chính xác CITED (Citation Accuracy)** | $\ge 80\%$ | **12/12 (100%)** | ✅ ĐẠT TUYỆT ĐỐI |
| **Tỷ lệ từ chối đúng (Refusal Rate)** | $100\%$ | **6/6 (100%)** | ✅ ĐẠT TUYỆT ĐỐI (Zero Hallucination) |
| **Lỗi hệ thống (System Errors)** | 0 | **0 ca lỗi** | ✅ HOÀN TOÀN ỔN ĐỊNH |

### Phân tích 4 ca chưa đạt (4/24):
- **GS-14, GS-15, GS-21, GS-24**: Thuộc nhóm chủ đề mơ hồ (Ambiguous) hoặc prompt tiếng Anh.
- **Nguyên nhân cốt lõi:** AI có xu hướng bị "quá tự tin" (overconfident), khi thấy trong tài liệu có từ khóa xuất hiện thì vội vàng gán `CITED` thay vì cẩn trọng gán `NEEDS_VERIFY` để người dùng xác nhận lại.
- **Bài học rút ra:** Đã bổ sung few-shot examples và siết chặt rule gán `NEEDS_VERIFY` khi prompt có độ khái quát quá rộng hoặc đa nghĩa.

---

## §8. Phân công & Đội ngũ

| Vai trò | Thành viên | Trách nhiệm cụ thể |
|---|---|---|
| **Đội trưởng · Lead & Eval** | **Lê Duy Quân** | Kiến trúc tổng thể, bộ kiểm thử Golden Set (24 cases), review logic UI/UX |
| **Dev · Backend & RAG** | **Bùi Trọng Trịnh** | RAG prompt engineering, tính toán thời lượng video ~130 wpm, API proxy |
| **Dev & Evidence** | **Nguyễn Lê Phúc Thắng** | Khảo sát người dùng (20 người), phân tích mining data, luồng duyệt kịch bản |
| **Validation & Presentation** | **Vũ Minh Hoàng** | Thu thập feedback người dùng thật (Bonus R6), chuẩn bị Slide PDF và Video demo |

- **Willing Users đã thử nghiệm thực tế:**
  1. Tai Thanh (Lab Coach) — Đã thử và đóng góp ý kiến về thời lượng kịch bản 10 phút.
  2. Mây (Lab Coach) — Đã thử và đánh giá cao tính năng từ chối khi không có nguồn.
  3. Nguyễn Hồng Thái (Học viên Lớp 3A) — Đã thử và đề xuất tính năng Chấp nhận tất cả / Alert.
  4. Võ Phú Hãn (Học viên) — Đã thử và xác nhận giao diện dễ dùng, tiết kiệm thời gian soạn slide.

---

## §9. Changelog

| Thời điểm | Checkpoint | Nội dung thay đổi & Lý do |
|---|:---:|---|
| 16/9 19:30 | **CP1** | Khảo sát sơ bộ ~20 người, chọn đề tài Track C3 (Research-to-Script), chốt Canvas CP1 |
| 16/9 21:00 | **CP2** | Xây dựng xong luồng giao diện 5 bước tương tác được (Mock Prototype) và hoàn thành spec sơ bộ |
| 17/9 14:00 | **CP3** | Tích hợp AI thật qua 9Router API, chạy bộ kiểm thử Golden Set 24 cases tự động đạt 83.3% |
| 17/9 15:45 | **CP4** | **Chốt toàn diện `spec.md`:**<br>• Tối ưu thời lượng video chuẩn (130 từ/phút $\approx$ 1300-1600 từ cho 10 phút).<br>• Bổ sung cấu trúc Slide Blueprint Metadata (Tiêu đề, Mục đích, Visual Cue, Takeaway).<br>• Thêm tính năng "✓ Chấp nhận tất cả" và Hộp thoại Modal cảnh báo khi chưa duyệt hết.<br>• Hoàn thiện `evidence/README.md` (20 khảo sát + 5 mining) và `validation/README.md` (+8 điểm). |
