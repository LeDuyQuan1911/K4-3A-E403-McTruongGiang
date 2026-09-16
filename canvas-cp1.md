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

**Dự kiến mining (chuẩn B):**
- Mining `data/vlearn-pack/` (6 transcript + 2 slide): đếm số concept lặp lại giữa các transcript, số chỗ thiếu trích dẫn nguồn gốc
- So sánh: cho AI sinh kịch bản từ transcript → đếm bao nhiêu câu có trích dẫn đúng vs bịa nguồn vs không có nguồn

**Dự kiến phỏng vấn (chuẩn evidence riêng Track C — ≥3 người):**
- Phỏng vấn Studio team theo Mom Test: *"Lần gần nhất viết kịch bản cho 1 bài giảng, bạn phải tra cứu bao nhiêu nguồn? Phần nào tốn thời gian nhất?"*
- BTC sẽ bố trí đầu mối Studio team — hỏi ở kênh chung Discord

> ⚠ Không copy số liệu, snippet hay mã nguồn thật ra ngoài `data/` khi chưa được nhóm hoặc TA cho phép.

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

**Willing users dự kiến:** ≥2 người
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
