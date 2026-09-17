# Đối chiếu C3 và trạng thái kiểm chứng

Đối chiếu với bản gốc tại `Yêu cầu/tracks/track-c-lesson-studio.md`, `Yêu cầu/data/studio-pack/c3-scriptscout/README.md` và `mau-kich-ban.md`. Tài liệu ban tổ chức giữ cục bộ, không đưa lên Git. Ngày cập nhật: 17/09/2026.

| Yêu cầu | Phần thực hiện | Trạng thái bằng chứng |
|---|---|---|
| Bốn đầu vào, tự tìm web, không cần cấp tài liệu | Form brief; `Search`: Tavily hoặc OpenAI; `Studio.research` | Tavily thật đã kết nối; trace đầu trả nhiều URL nhiễu nên đã thêm lọc liên quan trước tải; cần chạy lại và demo brief thật |
| DeepSeek và đổi API dễ dàng | Preset DeepSeek/OpenAI/Gemini/custom, khóa và model riêng trong `.env` | Kiểm thử giao thức đã qua; một lời gọi DeepSeek thật ngày 17/09 trả JSON hợp lệ, response ID và usage được lưu trong `eval/results.md` |
| Hồ sơ URL/tác giả/ngày/uy tín/độ mới | Tải HTML, metadata, tiêu chí công khai, ngày thiếu ghi rõ | Bộ giả kiểm tra metadata và nguồn cũ; tải MDN thật thành công |
| Người duyệt nguồn trước khi viết; thêm/bỏ URL | Quyết định từng nguồn, server chặn khi còn nguồn chờ | Kiểm thử HTTP và trình duyệt |
| Năm câu mở đầu đúng mẫu | JSON `hackathon-kich-ban/1`; mỗi câu một cảnh; kiểm tra lời/screen/visual | Luồng giả và schema đã kiểm tra; văn nói tự nhiên cần chấm model thật |
| Từng câu bấm xem bằng chứng | Citation → source/chunk/quote/vị trí trong bản văn bản lưu | UI mở đúng đoạn; kiểm thử mã và quote sai bị chặn |
| Loại nguồn chỉ sửa câu phụ thuộc | Vô hiệu hóa nguồn–câu; repair theo ID/n; không thay câu khác | Kiểm thử demo và DeepSeek giả lập |
| Số liệu cần hai nguồn độc lập | Gắn NEEDS_VERIFY; kiểm tra nhóm nguồn, quote và xác nhận người duyệt | Có kiểm thử thiếu nguồn; tính độc lập/đúng ngữ nghĩa cần người có chuyên môn |
| Lệnh ẩn, mâu thuẫn, nguồn cũ, ngoại ngữ, URL hỏng | Cách ly injection; so sánh phần trăm; metadata; lỗi thu thập; mẫu tiếng Anh được giữ trong retrieval | Heuristic, không bảo đảm phát hiện mọi dạng tấn công hoặc mâu thuẫn |
| Bản quyền, điều khoản, không vượt rào truy cập | robots/noai/paywall; xuất trích đoạn thay vì toàn trang; bước xác nhận quyền sử dụng | Có kiểm thử; không thay thế việc đọc điều khoản thực tế |
| Giảng viên duyệt trước khi dựng video | Khóa export, lưu mã người duyệt và hủy duyệt khi nội dung/nguồn đổi | Kiểm thử HTTP; danh tính tự khai, chưa xác thực tài khoản |
| Xuất kịch bản + hồ sơ + truy vết | Markdown và JSON; audit có provider/model/usage | Kiểm thử luồng cục bộ |
| Cách chạy, chi phí, giới hạn | `codebase/README.md`, `.env.example`, `doctor`, `check:api`, `check:search` | Có số token của một lượt DeepSeek kiểm tra; chưa có chi phí một brief thật hoặc lượt tìm kiếm đã xác nhận |

## Những mục chưa được chứng minh

- DeepSeek đã kết nối thật một lần với evidence rỗng. Tavily đã chạy ba lượt: hết nhiễu ngoài chủ đề ở lượt ba nhưng còn một ứng viên gần nghĩa `Map/Set`; danh sách khám phá không được coi là nguồn đã xác minh. Chưa chạy brief trọn vẹn qua bước tải/duyệt nguồn hoặc quay video CP3.
- 48/48 là kết quả kiểm thử phần mềm với nguồn giả và phản hồi API giả lập, **không phải** tỷ lệ câu trả lời đúng của model.
- Golden set tại `eval/golden-set.md` là bản dự thảo cần nhóm/người phụ trách nội dung duyệt; chưa chấm model thật hay đo user acceptance.
- Các số liệu khảo sát trong spec cũ chưa có log dẫn chứng đi kèm. Không dùng chúng làm bằng chứng đã xác minh. Track C cần phỏng vấn Studio/lab coach hoặc mining tái lập theo yêu cầu chung; không tự điền kết quả phỏng vấn.
- Chưa có slide/video trình bày, xác thực nhiều người dùng, tự phát hiện bản cập nhật của trang, đọc PDF hoặc dựng video.

## Kịch bản demo thực tế cần chạy khi có khóa

1. `npm run doctor`, `npm run check:api` và `npm run check:search` đã thành công về kết nối. Không cần tiêu thêm lượt smoke test; chuyển sang một brief thật trong giao diện để kiểm tra tải và duyệt nguồn.
2. Nhập chủ đề mới và đủ bốn trường; cho hệ thống tự tìm nguồn; kiểm tra ít nhất một URL, metadata và đoạn văn tải về.
3. Duyệt/bỏ nguồn, tạo năm câu; mở một citation bất kỳ và đối chiếu ngữ nghĩa.
4. Bỏ một nguồn đang được dẫn; ghi lại các `n` bị ảnh hưởng; repair và so sánh nguyên văn những câu còn lại.
5. Mở bộ thử lệnh ẩn và mâu thuẫn, xác nhận nguồn bị cách ly/cảnh báo hiện ra.
6. Duyệt từng câu, xác nhận giảng viên, xuất bộ tệp; giữ audit thật và số token cho CP3. Không lấy audit của bộ giả làm trace AI thật.
