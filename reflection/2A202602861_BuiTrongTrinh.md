# Thu Hoạch Cá Nhân — Bùi Trọng Trịnh

- **Họ và tên:** Bùi Trọng Trịnh
- **Mã học viên (MSSV):** `2A202602861`
- **Lớp:** 3A · **Phòng:** E403
- **Nhóm:** McTruongGiang · **Track:** C3 — Research-to-Script (Lesson Studio)

---

## 1. Vai trò cá nhân trong nhóm

Trong dự án **ScriptForge (Research-to-Script)**, tôi đảm nhiệm vai trò **Developer**, phụ trách prototype RAG pipeline + UI và prompt engineering.

- **RAG pipeline:** cùng nhóm xây dựng luồng dùng các đoạn nguồn đã được duyệt làm evidence cho bước tạo dàn bài và kịch bản.
- **Prompt engineering:** tham gia định nghĩa cách model trả về cảnh có cấu trúc, citation và trạng thái `CITED`/`NEEDS_VERIFY`/`NO_SOURCE`.
- **Demo:** phối hợp với Lê Duy Quân và Vũ Minh Hoàng chuẩn bị phần giải thích luồng AI và video demo dự phòng.

---

## 2. Phần việc trực tiếp phụ trách

1. **Xây dựng luồng RAG từ nguồn đến kịch bản**
   - Tham gia kết nối bước tìm/tải nguồn, duyệt nguồn và đưa các chunk đã duyệt vào bước tạo dàn bài/cảnh.
   - Bảo đảm model chỉ nhận evidence trong phạm vi nguồn người dùng đã duyệt; URL từ tìm kiếm chỉ được dùng để khám phá, không được xem là citation.

2. **Thiết kế prompt và format đầu ra có kiểm soát**
   - Cùng Nguyễn Lê Phúc Thắng thiết kế prompt yêu cầu kịch bản theo slide gồm tiêu đề, ý trên slide, lời đọc đầy đủ, ý đồ hình và citation.
   - Làm rõ khi nào câu trả lời phải là `NEEDS_VERIFY` hoặc `NO_SOURCE`: paraphrase, nguồn cũ, thiếu metadata hay thiếu evidence đều không được gắn `CITED` một cách tự tin.
   - Phối hợp để các đầu ra JSON lỗi, bị cắt hoặc không khớp schema bị chặn thay vì âm thầm dùng tiếp.

3. **Phối hợp UI và chuẩn bị demo**
   - Tham gia gắn trạng thái/citation vào giao diện để người viết có thể xem căn cứ và sửa, chấp nhận hoặc bỏ từng cảnh.
   - Cùng nhóm chuẩn bị demo cho thấy kịch bản chỉ được xuất sau các bước duyệt cần thiết.

---

## 3. Cách thức ứng dụng AI trong quá trình xây dựng

Tôi dùng AI như một **cộng sự kỹ thuật** để thử cấu trúc prompt, đề xuất schema và tạo input biên cho việc kiểm tra. Sau đó, tôi chuyển yêu cầu thành điều kiện có thể kiểm tra trong ứng dụng:

1. Citation phải trỏ đúng `chunkId` và quote nguyên văn trong chunk đã tải.
2. Đầu ra thiếu/không hợp lệ phải fail closed, giữ bản nháp an toàn thay vì tạo nội dung mới không có căn cứ.
3. AI không có quyền tự duyệt nguồn, tự xác nhận ý nghĩa citation hoặc bỏ qua thao tác xác nhận của người dùng.

AI giúp tăng tốc vòng lặp viết–review prompt, nhưng phần quyết định an toàn cuối cùng phải nằm ở logic ứng dụng và người biên soạn.

---

## 4. Một bài học thực tế rút ra từ chính các trường hợp thất bại của nhóm

### 🔴 Prompt tốt vẫn có thể nhận đầu ra không dùng được

- **Sự cố/giới hạn:** Các case `X02`, `X09` và `X10` trong golden set mô phỏng ba tình huống nguy hiểm: model đưa quote không tồn tại, JSON bị cắt/sai cấu trúc, hoặc dàn bài thiếu evidence cho một cảnh. Nếu ứng dụng chỉ tin vào lời model báo là `CITED`, kịch bản sai có thể đi tiếp đến bước xuất.
- **Phân tích:** Prompt không phải là hàng rào bảo vệ tuyệt đối. Model có thể trả format gần đúng, bịa citation hoặc cố hoàn thành yêu cầu khi nguồn chưa đủ.
- **Bài học rút ra:** Tôi rút ra nguyên tắc thiết kế **fail closed**: kiểm tra citation và schema ở phía ứng dụng; khi không đủ căn cứ thì hiển thị `NO_SOURCE`, không sinh claim để lấp chỗ trống. Đây là điểm quan trọng hơn việc làm output trông mượt, vì người dùng cuối đang viết nội dung giáo dục.

