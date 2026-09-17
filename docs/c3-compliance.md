# Đối chiếu C3 và trạng thái kiểm chứng

Đối chiếu với bản gốc tại `Yêu cầu/tracks/track-c-lesson-studio.md`, `Yêu cầu/data/studio-pack/c3-scriptscout/README.md` và `mau-kich-ban.md`. Tài liệu ban tổ chức giữ cục bộ, không đưa lên Git. Ngày cập nhật: 17/09/2026.

| Yêu cầu | Phần thực hiện | Trạng thái bằng chứng |
|---|---|---|
| Bốn đầu vào, tự tìm web, không cần cấp tài liệu | Form brief; `Search`: Exa/Tavily/OpenAI; `Studio.research` | Adapter tìm nguồn và lọc trước tải được regression; cần demo brief thật với nguồn được người dùng duyệt |
| DeepSeek và đổi API dễ dàng | Preset DeepSeek/OpenAI/Gemini/custom, khóa và model riêng trong `.env` | Kiểm thử giao thức adapter đã qua; CP4 không lưu trace hay kết quả model thật |
| Hồ sơ URL/tác giả/ngày/uy tín/độ mới | Tải HTML, metadata, tiêu chí công khai, ngày thiếu ghi rõ | Bộ giả kiểm tra metadata và nguồn cũ; tải MDN thật thành công |
| Người duyệt nguồn trước khi viết; thêm/bỏ URL | Quyết định từng nguồn, server chặn khi còn nguồn chờ | Kiểm thử HTTP và trình duyệt |
| Kịch bản bài học chi tiết đúng mẫu | JSON `hackathon-kich-ban/1`; mỗi cảnh có tiêu đề, ý slide, lời đọc, hình và citation; kiểm tra lời/screen/visual | Luồng giả và schema đã kiểm tra; văn nói tự nhiên cần chấm model thật |
| Từng câu bấm xem bằng chứng | Citation → source/chunk/quote/vị trí trong bản văn bản lưu | UI mở đúng đoạn; kiểm thử mã và quote sai bị chặn |
| Loại nguồn chỉ sửa câu phụ thuộc | Vô hiệu hóa nguồn–câu; repair theo ID/n; không thay câu khác | Kiểm thử fixture/API giả lập |
| Số liệu cần hai nguồn độc lập | Gắn NEEDS_VERIFY; kiểm tra nhóm nguồn, quote và xác nhận người duyệt | Có kiểm thử thiếu nguồn; tính độc lập/đúng ngữ nghĩa cần người có chuyên môn |
| Lệnh ẩn, mâu thuẫn, nguồn cũ, ngoại ngữ, URL hỏng | Cách ly injection; so sánh phần trăm; metadata; lỗi thu thập; mẫu tiếng Anh được giữ trong retrieval | Heuristic, không bảo đảm phát hiện mọi dạng tấn công hoặc mâu thuẫn |
| Bản quyền, điều khoản, không vượt rào truy cập | robots/noai/paywall; xuất trích đoạn thay vì toàn trang; bước xác nhận quyền sử dụng | Có kiểm thử; không thay thế việc đọc điều khoản thực tế |
| Giảng viên duyệt trước khi dựng video | Khóa export, lưu mã người duyệt và hủy duyệt khi nội dung/nguồn đổi | Kiểm thử HTTP; danh tính tự khai, chưa xác thực tài khoản |
| Xuất kịch bản + hồ sơ + truy vết | Markdown và JSON; audit có provider/model/usage | Kiểm thử luồng cục bộ |
| Cách chạy, chi phí, giới hạn | `codebase/README.md`, `.env.example`, `doctor`, `check:api`, `check:search` | Có hướng dẫn cấu hình và kiểm tra kết nối; CP4 không công bố chi phí hay số đo model thật |

## Những mục chưa được chứng minh

- 81/81 regression và 50/50 case fixture là kết quả kiểm thử phần mềm với nguồn giả và phản hồi API giả lập, **không phải** tỷ lệ câu trả lời đúng của model.
- Golden set 50 ca tại `eval/golden-set.md` đã chốt về thiết kế; CP4 chỉ công bố regression/tính toàn vẹn của bộ case, không chấm model thật hay đo user acceptance.
- Evidence khảo sát/mining đã được chuẩn hóa và ẩn danh tại `evidence/README.md`. Đây là mẫu thuận tiện; chỉ dùng claim trong giới hạn mẫu và không đưa danh tính hay quote gốc chưa được phép công bố lên Git.
- Chưa có slide/video trình bày, xác thực nhiều người dùng, tự phát hiện bản cập nhật của trang, đọc PDF hoặc dựng video.

## Kịch bản demo thực tế cần chạy khi có khóa

1. Chạy `npm run doctor`, sau đó dùng `npm run check:api` và `npm run check:search` trên khóa của người vận hành để kiểm tra kết nối. Kết quả này không thay thế đánh giá chất lượng kịch bản.
2. Nhập chủ đề mới và đủ bốn trường; cho hệ thống tự tìm nguồn; kiểm tra ít nhất một URL, metadata và đoạn văn tải về.
3. Duyệt/bỏ nguồn, tạo kịch bản theo slide; mở một citation bất kỳ và đối chiếu ngữ nghĩa.
4. Bỏ một nguồn đang được dẫn; ghi lại các `n` bị ảnh hưởng; repair và so sánh nguyên văn những câu còn lại.
5. Mở bộ thử lệnh ẩn và mâu thuẫn, xác nhận nguồn bị cách ly/cảnh báo hiện ra.
6. Duyệt từng câu, xác nhận giảng viên, xuất bộ tệp; giữ audit thật và số token cho CP3. Không lấy audit của bộ giả làm trace AI thật.
