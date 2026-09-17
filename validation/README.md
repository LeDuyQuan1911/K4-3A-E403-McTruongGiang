# Validation — Feedback từ user (Bonus R6, +8 điểm)

## Willing Users (đã đăng ký từ CP1)

| # | Tên / Vai trò | Liên hệ | Đã thử? |
|---|---|---|:---:|
| 1 | Tai Thanh (Lab Coach) | TaiThanh@lab.edu.vn | ☑ ĐÃ THỬ |
| 2 | Mây (Lab Coach) | MayCoach@lab.edu.vn | ☑ ĐÃ THỬ |
| 3 | Nguyễn Hồng Thái (Học viên) | ThaiNH@student.edu.vn | ☑ ĐÃ THỬ |
| 4 | Võ Phú Hãn (Học viên) | HanVP@student.edu.vn | ☑ ĐÃ THỬ |

---

## Feedback Log

### User 1: Tai Thanh (Lab Coach)
- **Task giao:** Nhập chủ đề *"Giải thích cơ chế Attention trong Transformer"*, chọn nguồn `Transcript-06` và `Slide Bài 3`, chọn thời lượng 10 phút, kiểm tra tính xác thực của các mã trích dẫn.
- **Quan sát:** 
  - Người dùng bấm vào từng mã trích dẫn `[T06-042]`, `[Slide3-p22]` để mở rộng đoạn text gốc đối chiếu.
  - Ban đầu nhận xét: kịch bản AI tạo ra hơi ngắn so với thời lượng 10 phút thực tế.
  - Sau khi nhóm nâng cấp prompt và tính năng tính toán độ dài theo tốc độ nói (130 từ/phút), người dùng rất hài lòng với độ sâu nội dung.
- **Quote nguyên văn:** 
  > *"Nội dung trích đúng công thức $Softmax(QK^T/\sqrt{d_k})V$ từ slide 3 mà không bịa bậy. Nhưng lúc đầu kịch bản có 300 từ thì nói được 2 phút là hết. Sau khi các bạn scale lên hơn 1400 từ chia 7 slide có đầy đủ ví dụ 'con mèo' thì dùng dạy được luôn!"*

### User 2: Mây (Lab Coach)
- **Task giao:** Thử nghiệm tạo kịch bản với chủ đề không có trong tài liệu: *"Giải thích Quantum Computing cho AI"*.
- **Quan sát:**
  - Hệ thống gắn nhãn đỏ `🔴 NO_SOURCE`, không sinh nội dung kịch bản và hiển thị cảnh báo: *"Không tìm thấy nguồn về quantum computing trong tài liệu đã chọn"*.
  - Người dùng thử tính năng duyệt slide và xuất file markdown.
- **Quote nguyên văn:** 
  > *"Rất ưng ý điểm này! Hệ thống dám từ chối chứ không chém gió liều mạng như ChatGPT. Ngoài ra, giao diện mới có phần 'Gợi ý hình ảnh slide' và 'Mục đích slide' giúp người soạn bài hình dung ngay bố cục trình chiếu."*

### User 3: Nguyễn Hồng Thái (Học viên)
- **Task giao:** Tạo kịch bản bài thuyết trình về *"Backpropagation & Gradient Descent"*, thử chỉnh sửa nội dung và tải file markdown.
- **Quan sát:**
  - Người dùng phản ánh nút 'Chấp nhận' từng slide bấm hơi mất thời gian nếu có nhiều slide.
  - Thấy thanh search bị icon kính lúp đè lên chữ placeholder.
- **Quote nguyên văn:** 
  > *"Nên có nút 'Chấp nhận tất cả' cho nhanh. Với lại nếu mình chưa đọc hết mà lỡ bấm Xuất kịch bản thì nên có alert nhắc nhở xem có muốn chấp nhận hết các slide còn lại hay không."*

---

## Changelog — Thay đổi từ feedback

| Thời điểm | Đổi gì | Căn cứ feedback nào | Giữ nguyên / Sửa |
|---|---|---|---|
| 17/9 14:30 | Scale độ sâu kịch bản: Tính toán từ theo thời lượng (130 từ/phút $\approx$ 1300-1600 từ cho 10 phút, 6-8 slide có số liệu cụ thể) | Feedback User 1 (Tai Thanh): Kịch bản ngắn không đủ thời lượng 10 phút | ✅ ĐÃ SỬA |
| 17/9 14:45 | Thêm trường Slide Blueprint: `slide_title`, `purpose`, `visual_cue` (gợi ý hình ảnh/sơ đồ), `key_takeaway` (bài học người xem nhận được) | Feedback User 2 (Mây): Cần thông tin định hướng trực quan cho slide | ✅ ĐÃ SỬA |
| 17/9 15:00 | Sửa lỗi icon kính lúp đè placeholder trong ô tìm kiếm sidebar | Feedback User 3 (Nguyễn Hồng Thái): Lỗi hiển thị CSS | ✅ ĐÃ SỬA |
| 17/9 15:25 | Thêm nút **"✓ Chấp nhận tất cả"** và cơ chế **Hộp thoại Modal cảnh báo khi bấm xuất kịch bản mà chưa duyệt hết** | Feedback User 3 (Nguyễn Hồng Thái): Tránh click thừa và tránh sót slide chưa đọc | ✅ ĐÃ SỬA |
| 17/9 15:30 | Đổi màu Header và Sidebar sang tone xám nhạt cao cấp, phân biệt 3 tầng với Canvas chính | Feedback chung về trải nghiệm thị giác | ✅ ĐÃ SỬA |
