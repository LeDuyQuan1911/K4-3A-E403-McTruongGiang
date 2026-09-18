# Validation — Feedback người dùng ẩn danh

> Bản ghi này được chuẩn hóa từ các phiên thử prototype ngày 17/09. Tên, liên hệ và dữ liệu nhận diện người thử đã được loại bỏ; chỉ giữ mã `U01`–`U03` và vai trò khái quát. Đây là feedback về trải nghiệm của phiên bản prototype tại thời điểm thử, **không phải** kết quả đánh giá độ đúng của model hay tỷ lệ user acceptance cho phiên bản hiện tại.

## Phạm vi phiên thử

| Mã người thử | Vai trò khái quát | Task | Đã hoàn thành? |
|---|---|---|:---:|
| U01 | Học viên | Tạo kịch bản có citation cho một chủ đề kỹ thuật | Có |
| U02 | Học viên | Thử yêu cầu ngoài nguồn để kiểm tra từ chối sinh | Có |
| U03 | Học viên | Duyệt, sửa và xuất kịch bản theo slide | Có |

Mỗi phiên dùng task cụ thể thay vì hỏi người thử có “muốn dùng AI” hay không. Quan sát hành vi và quote được ghi tách biệt để tránh suy diễn từ lời khen chung chung.

---

## Feedback log

### U01 — Học viên

- **Task giao:** Tạo bài học 10 phút về Attention trong Transformer, duyệt các nguồn liên quan và mở citation để đối chiếu đoạn evidence.
- **Quan sát:** Người thử mở từng citation để kiểm tra công thức/thuật ngữ. Ở bản nháp đầu, người thử nhận thấy lời đọc quá ngắn so với thời lượng đã nhập.
- **Quote nguyên văn đã ẩn danh:**

  > “Nội dung có căn cứ thì yên tâm hơn, nhưng bản ngắn quá sẽ không đủ để dạy trong thời lượng đã chọn.”

- **Mức nghiêm trọng:** Cao — lời đọc thiếu độ sâu làm kịch bản không dùng được cho đúng thời lượng.

### U02 — Học viên

- **Task giao:** Yêu cầu hệ thống viết về một chủ đề không có trong các nguồn đã chọn, sau đó xem gợi ý xử lý tiếp theo.
- **Quan sát:** Người thử chú ý trạng thái `NO_SOURCE` và đánh giá cao việc hệ thống không tự viết tiếp khi không có căn cứ. Người thử cũng dùng phần ý đồ hình/ý slide để hình dung bố cục bài giảng.
- **Quote nguyên văn đã ẩn danh:**

  > “Tốt là hệ thống dám nói chưa đủ nguồn thay vì trả lời chắc như đúng rồi.”

- **Mức nghiêm trọng:** Trung bình — trạng thái từ chối cần nói rõ bước tiếp theo để người dùng không bị chặn flow.

### U03 — Học viên

- **Task giao:** Tạo một kịch bản kỹ thuật, thử sửa một cảnh, duyệt các cảnh còn lại và xuất bản nháp.
- **Quan sát:** Người thử thấy việc duyệt từng cảnh hữu ích nhưng mất thời gian khi bài có nhiều cảnh; đồng thời cần một cảnh báo rõ ràng nếu đi tới bước xuất khi vẫn còn cảnh chưa đối chiếu.
- **Quote nguyên văn đã ẩn danh:**

  > “Nên có cách duyệt nhanh, nhưng vẫn phải nhắc mình kiểm tra trước khi xuất.”

- **Mức nghiêm trọng:** Trung bình — nếu không có thao tác duyệt nhanh và cảnh báo, người dùng dễ mất thời gian hoặc bỏ sót bước kiểm tra.

---

## Changelog — thay đổi từ feedback

| Thời điểm | Đổi gì | Căn cứ feedback | Trạng thái |
|---|---|---|:---:|
| 17/09 | Lập kế hoạch số cảnh và dung lượng lời đọc theo thời lượng; cảnh thiếu evidence được báo rõ thay vì lặp nội dung để kéo dài. | U01: bản nháp đầu quá ngắn | Đã áp dụng |
| 17/09 | Giữ `NO_SOURCE` là trạng thái không sinh claim, đồng thời gợi ý thêm/duyệt nguồn trước khi viết lại. | U02: cần từ chối có đường tiếp theo | Đã áp dụng |
| 17/09 | Thêm nút duyệt nhanh các cảnh đủ điều kiện; cảnh vẫn cần xác nhận đọc evidence, và export bị chặn khi còn nội dung chờ duyệt. | U03: duyệt từng cảnh tốn thời gian, dễ sót bước | Đã áp dụng |

## Giới hạn và việc tiếp theo

- Ba phiên trên giúp phát hiện vấn đề UX và không thay thế đánh giá model thật. Không suy ra citation accuracy hay tỷ lệ người dùng chấp nhận chỉ từ log này.
- Trước demo cuối, nên chạy lại ít nhất hai task trên phiên bản hiện tại, ghi ngày giờ, hành vi quan sát được và bất kỳ feedback mới nào. Nếu không có phiên chạy lại, khi trình bày cần gọi đây là feedback của prototype trước.
