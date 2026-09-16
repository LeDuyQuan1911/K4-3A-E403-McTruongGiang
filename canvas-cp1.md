# CANVAS CP1 — Track C3 · Research-to-Script

**Hướng:** C — Lesson Studio · **Đề:** C3 — Nghiên cứu viết kịch bản có nguồn
**Loại:** Tính năng mới

---

## 01 · NGƯỜI DÙNG & NỖI ĐAU

**Job:** Người viết kịch bản video giáo dục (Studio team) đang cần viết kịch bản cho một bài giảng mới, phải tra cứu nhiều nguồn (transcript cũ, slide, tài liệu gốc) để đảm bảo nội dung chính xác và có căn cứ.

**Pain:** Viết một kịch bản 10 phút mất hàng giờ tra cứu thủ công qua nhiều file transcript/slide. Nếu dùng AI sinh trực tiếp thì kịch bản thường **bịa nguồn, thiếu trích dẫn, hoặc trộn thông tin từ nhiều bài không liên quan** — biên tập viên phải kiểm tra lại từng câu, tốn thời gian ngang tự viết.

**Hậu quả:** Kịch bản thiếu căn cứ → video thiếu tin cậy. Hoặc mất quá nhiều thời gian tra cứu → sản xuất chậm, backlog bài giảng tồn đọng.

---

## 02 · BẰNG CHỨNG BAN ĐẦU

Đã hỏi qua gần 20 người trong buổi học bao gồm cả lab coach và học viên, có rất nhiều người đã gặp trường hợp 2 nguồn đưa tin/số liệu trái ngược nhau, dẫn đến việc rất khó để có thể xác định đâu là nguồn tin chính xác, hoặc nguồn cũ, hoặc bị miss nguồn dẫn đến việc phải tìm lại khi nội dung gần xong. Trên 90% số người được hỏi nếu có một công cụ tự tìm nguồn đáng tin thì liệu họ có dùng không, họ vẫn trả lời khá đến rất cần.

---

## 03 · LÁT CẮT & AUTOMATION

**Lát cắt MỘT CÂU:**

> *Một người viết kịch bản · nhập chủ đề + chọn 1-2 transcript/slide nguồn · AI trích nội dung liên quan kèm mã đoạn [Txx-NNN] và draft đoạn kịch bản có trích dẫn · người viết duyệt/sửa/chấp nhận từng đoạn.*

**Quyết định AI:** Với mỗi câu trong draft → trích đúng đoạn nguồn nào, và mức confidence

**3 trạng thái output:**
- 🟢 **CITED** — có nguồn rõ ràng `[Txx-NNN]`, confidence cao
- 🟡 **NEEDS_VERIFY** — có nguồn nhưng AI không chắc, cần người kiểm
- 🔴 **NO_SOURCE** — không tìm thấy nguồn trong tài liệu được chọn

**Automation: Conditional**
- Tự draft khi có nguồn đủ chắc trong transcript/slide
- Ghi rõ "cần người xác minh" khi mơ hồ
- Từ chối sinh nội dung khi không có nguồn thay vì bịa

---

## 04 · NGƯỜI THỬ & PHÂN CÔNG

**Willing users dự kiến:** 
- Tai Thanh - Lab Coach
- Mây - Lab Coach
- Nguyễn Hồng Thái - Học Viên
- Võ Phú Hãn - Học Viên

**Đội trưởng:** Lê Duy Quân

**Phân công (điền tên thật sau):**

| Vai trò | Phần việc | Người |
|---|---|---|
| **Spec + Evidence** | Viết spec, phỏng vấn Studio team, mining data | Nguyễn Lê Phúc Thắng, Vũ Minh Hoàng |
| **Prototype** | Code RAG pipeline + UI | Lê Duy Quân, Bùi Trọng Trịnh |
| **AI Call** | Prompt engineering, trích dẫn nguồn, citation format | Bùi Trọng Trịnh, Nguyễn Lê Phúc Thắng |
| **Eval** | Golden set ≥20 case, chạy đo, bảng kết quả | Lê Duy Quân, Nguyễn Lê Phúc Thắng |
| **Validation/Demo** | User test, slide, video demo | Vũ Minh Hoàng, Lê Duy Quân |

> *Mỗi người có thể kiêm nhiều vai. Nhóm 3 người thì gộp vai.*
