# Thu Hoạch Cá Nhân — Nguyễn Lê Phúc Thắng

- **Họ và tên:** Nguyễn Lê Phúc Thắng
- **Mã học viên (MSSV):** `2A202602638`
- **Lớp:** 3A · **Phòng:** E403
- **Nhóm:** McTruongGiang · **Track:** C3 — Research-to-Script (Lesson Studio)

---

## 1. Vai trò cá nhân trong nhóm

Trong dự án **ScriptForge (Research-to-Script)**, tôi đảm nhiệm vai trò **Developer + Evidence**, phụ trách code, khảo sát, đặc tả sản phẩm và golden set.

- **Spec + Evidence:** cùng Vũ Minh Hoàng viết spec, phỏng vấn Studio team và mining dữ liệu để làm rõ pain point của người viết kịch bản.
- **Prototype + AI Call:** cùng Lê Duy Quân và Bùi Trọng Trịnh phát triển RAG pipeline + UI; cùng Bùi Trọng Trịnh làm prompt engineering và format citation.
- **Eval:** cùng Lê Duy Quân xây dựng golden set và chạy/ghi nhận kết quả đánh giá.

---

## 2. Phần việc trực tiếp phụ trách

1. **Hoàn thiện AI spec và evidence**
   - Viết và chuẩn hóa [`spec.md`](../spec.md): user/job, bảng impact, automation theo cost-of-error, bốn lớp chỗ khó, HAX/PAIR và quality bar.
   - Cùng Vũ Minh Hoàng tổng hợp evidence khảo sát và mining; giữ định danh người trả lời ngoài repo, chỉ dùng mã ẩn danh cùng quote đã khử định danh trong [`evidence/README.md`](../evidence/README.md).

2. **Phát triển và rà logic prototype**
   - Tham gia code luồng nguồn–citation–kịch bản, đặc biệt là các điều kiện để nguồn chưa duyệt, quote sai hoặc nội dung không có căn cứ không đi qua bước xuất.
   - Cùng Bùi Trọng Trịnh rà prompt, citation format và các trạng thái an toàn của đầu ra.

3. **Thiết kế golden set và báo cáo eval**
   - Cùng Lê Duy Quân chốt 50 case phủ bốn lớp chỗ khó: 20 `CITED`, 12 `NEEDS_VERIFY`, 10 `NO_SOURCE`, 8 `OUT_OF_SCOPE`.
   - Ghi rõ trong [`eval/results.md`](../eval/results.md) phạm vi của 81/81 regression và 50/50 fixture pass để không biến nó thành tuyên bố về chất lượng model thật.

---

## 3. Cách thức ứng dụng AI trong quá trình xây dựng

Tôi dùng AI để hỗ trợ brainstorm outline, rà tính nhất quán giữa spec–prompt–test case và đề xuất cách diễn đạt rõ hơn cho tiêu chí. Việc dùng AI được giới hạn như sau:

1. **Không dùng AI bịa evidence:** quote khảo sát, số đếm mining và claim trong spec phải có log hoặc phương pháp kiểm tra lại được.
2. **Không để AI tự thiết kế toàn bộ golden set:** nhóm chủ động phân bổ case theo bốn lớp chỗ khó; AI chỉ hỗ trợ tạo biến thể câu chữ hoặc tìm lỗ hổng coverage.
3. **Không để AI thay việc đánh giá:** kết quả do model sinh phải được đối chiếu với rubric, evidence và người chấm độc lập khi chạy model thật.

---

## 4. Một bài học thực tế rút ra từ chính các trường hợp thất bại của nhóm

### 🔴 Một bộ eval có cấu trúc vẫn có thể tạo cảm giác an toàn giả

- **Sự cố/giới hạn:** Golden set 50 ca và regression hiện xác nhận rule phần mềm trên fixture. Tuy nhiên, phần compliance của dự án cũng ghi rõ chưa có số đo citation accuracy của model thật và chưa có user acceptance.
- **Phân tích:** Nếu bỏ qua ranh giới này, nhóm có thể vô tình dùng test fixture làm bằng chứng rằng nội dung do model sinh đã đúng. Đây là lỗi phương pháp: test cơ chế không thay thế việc chấm ý nghĩa câu trả lời.
- **Bài học rút ra:** Tôi học được rằng một báo cáo tốt phải nêu cả phần đã chứng minh lẫn phần chưa chứng minh. Ở vòng sau, tôi sẽ chạy từng case với model thật, lưu output, cho hai người chấm độc lập các case khó và giữ lại cả case fail để biết cần sửa prompt hay guard nào.

