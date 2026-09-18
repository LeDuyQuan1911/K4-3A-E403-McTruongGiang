# Thu Hoạch Cá Nhân — Vũ Minh Hoàng

- **Họ và tên:** Vũ Minh Hoàng
- **Mã học viên (MSSV):** `2A202602371`
- **Lớp:** 3A · **Phòng:** E403
- **Nhóm:** McTruongGiang · **Track:** C3 — Research-to-Script (Lesson Studio)

---

## 1. Vai trò cá nhân trong nhóm

Trong dự án **ScriptForge (Research-to-Script)**, tôi đảm nhiệm vai trò **Khảo sát + Validation**, phụ trách khảo sát Studio team, user test và demo.

- **Spec + Evidence:** cùng Nguyễn Lê Phúc Thắng phỏng vấn/khảo sát người dùng mục tiêu, mining dấu hiệu pain point và đóng góp cho đặc tả sản phẩm.
- **Validation:** thiết kế cách quan sát người dùng làm task, thu quote và chuyển feedback thành thay đổi có căn cứ.
- **Demo:** chuẩn bị cách kể câu chuyện sản phẩm, slide và video demo dự phòng cùng các thành viên liên quan.

---

## 2. Phần việc trực tiếp phụ trách

1. **Khảo sát nhu cầu của Studio team**
   - Cùng Nguyễn Lê Phúc Thắng làm rõ pain point: người viết mất thời gian tìm transcript/slide, khó kiểm chứng citation và cần một kịch bản có cấu trúc cho slide/lời đọc.
   - Góp phần chuẩn hóa evidence theo hướng không đưa danh tính, liên hệ hay dữ liệu gốc của người trả lời lên repo.

2. **Chuẩn bị validation với người dùng**
   - Xác định task test phù hợp với prototype: tạo brief, xem nguồn, duyệt nguồn, đọc citation và quyết định sửa/chấp nhận/bỏ cảnh.
   - Chuẩn bị khung ghi nhận `task – quan sát – quote nguyên văn – mức nghiêm trọng – thay đổi sau feedback` trong [`validation/README.md`](../validation/README.md).

3. **Chuẩn bị nội dung demo**
   - Phối hợp với Lê Duy Quân và Bùi Trọng Trịnh chọn một case chuẩn và một case khó để demo không chỉ trình diễn happy path.
   - Đưa các thông tin có thể kiểm chứng lên slide: pain point/evidence, lựa chọn giải pháp, trạng thái an toàn, kết quả eval và giới hạn cần nói rõ.

---

## 3. Cách thức ứng dụng AI trong quá trình xây dựng

Tôi dùng AI để nháp câu hỏi phỏng vấn, đề xuất nhiệm vụ user test và rút gọn thông điệp cho demo. Tuy nhiên, AI chỉ hỗ trợ chuẩn bị; nó không được thay người dùng trả lời khảo sát hay tạo feedback giả.

1. Câu hỏi được chỉnh lại theo hành vi đã xảy ra gần nhất, không hỏi theo kiểu dự đoán “bạn có muốn dùng tính năng này không?”.
2. Quote và quan sát chỉ được ghi khi có phiên thử/khảo sát thực tế; AI không được dùng để lấp log còn trống.
3. Các thay đổi sản phẩm phải liên kết lại với feedback hoặc lỗi đã quan sát, để demo thể hiện được vòng lặp học hỏi thay vì chỉ là tính năng đã build.

---

## 4. Một bài học thực tế rút ra từ chính các trường hợp thất bại của nhóm

### 🔴 Feedback ở bản cũ không tự động chứng minh trải nghiệm bản hiện tại

- **Sự cố/giới hạn:** Nhóm có log feedback ẩn danh của prototype trước, nhưng chưa chạy lại đầy đủ cùng các task đó trên phiên bản hiện tại. Vì vậy, nhóm không có cơ sở để nói người dùng chấp nhận bản nháp hiện tại hoặc hiểu ngay bước duyệt nguồn.
- **Phân tích:** Với ScriptForge, người dùng phải nhìn thấy lý do của `NEEDS_VERIFY`/`NO_SOURCE` và biết vì sao chưa thể xuất kịch bản. Nếu họ bỏ qua bước duyệt nguồn hoặc không hiểu citation, cơ chế an toàn trong code sẽ không tự tạo ra trải nghiệm tốt.
- **Bài học rút ra:** Tôi học được rằng validation không phải một mục để điền cho đủ bonus. Nó là cách kiểm tra giả định UX quan trọng nhất: người dùng có hiểu giới hạn của AI và còn kiểm soát được quyết định hay không. Trước khi kết luận về user acceptance của bản hiện tại, tôi cần chạy lại tối thiểu hai phiên thử, ghi trung thực cả phản hồi tiêu cực và cập nhật changelog từ kết quả đó.
