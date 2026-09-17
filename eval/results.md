# Golden Set & Kết quả kiểm thử

## Kết quả thực tế ngày 17/09/2026

Lệnh `npm run eval` gần nhất lúc `2026-09-17T03:41:49.075Z`: **48/48 kiểm thử phần mềm qua**, không có ca thất bại. Báo cáo tái lập tại `test-output/regression.json` và `test-output/regression.tap` (không commit dữ liệu sinh ra). Các ca API trong bộ tự động dùng phản hồi giả lập; trace API thật được ghi riêng bên dưới.

Phạm vi: trích dẫn sai/thiếu, sửa và duyệt lại, số liệu thiếu nguồn độc lập, injection ẩn, nguồn cũ/paywall/noai, URL nội bộ, tách khóa giữa nhà cung cấp, DeepSeek/Gemini/OpenAI/custom, tìm kiếm độc lập, JSON bị cắt/rỗng/sai cấu trúc, HTTP/CSRF, export và viết lại chỉ câu phụ thuộc.

Kiểm tra bổ sung: bộ đọc nguồn đã tải trang MDN `https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map`, trả tiêu đề đúng và 41 đoạn. Giao diện hiển thị cấu hình DeepSeek, mở được citation đúng đoạn của bộ giả, duyệt từng câu và bật xuất sau xác nhận QA trên dự án minh họa. Phần này không chứng minh AI viết đúng nội dung.

Kết nối DeepSeek thật được người vận hành chạy ngày 17/09/2026 bằng `npm run check:api`: model `deepseek-flash`, response ID `f0a74704-191a-4193-b04c-d876cf1a6ed3`, 928 input token + 11 output token = 939 token, 416 ms. Đầu ra đúng JSON và không sinh claim khi evidence rỗng. Đây là **một trace API thật**, không phải đánh giá chất lượng kịch bản.

Kết nối Tavily thật được người vận hành chạy ngày 17/09/2026 bằng `npm run check:search`: request ID `1bfe2c23-45a5-4f9d-bac1-0d1d78b969c5`, trả sáu URL trong 2.101 ms. Hai kết quả đầu liên quan đến `Array.map`; bốn kết quả còn lại gồm PDF/crypto không liên quan. Kết quả này xác nhận API hoạt động, đồng thời tạo ra lỗi chất lượng thực tế. Sau trace này, pipeline được bổ sung lọc định dạng nhị phân và lọc liên quan bằng từ khóa + điểm semantic trước khi tải trang. Cần chạy lại để đo số URL được giữ sau sửa.

Lượt chạy lại sau bộ lọc đầu: request ID `9e5fe517-c251-440c-b135-5562329e73af`, sáu kết quả, giữ năm trong 2.190 ms. Không còn PDF/crypto; bốn URL nói về `Array.map`, còn một URL HowKTeam nói về kiểu dữ liệu `Map` khác với phương thức mảng. Bộ lọc tiếp tục được siết: chủ đề ngắn ở nhà xuất bản chưa nhận diện phải khớp toàn bộ từ khóa chủ đề. Tên trường báo cáo cũng đổi từ `verifiedDiscoveryURLs` thành `selectedDiscoveryURLs`, vì URL chưa được tải/duyệt thì chưa phải nguồn đã xác minh.

Lượt thứ ba: request ID `002a3520-0e55-42ff-bbf4-9efc90078a16`, sáu kết quả, giữ năm trong 2.054 ms. Không còn URL ngoài JavaScript; bốn ứng viên trực tiếp về phương thức mảng, một bài Viblo có tiêu đề `Map và Set` nên còn rủi ro nhầm khái niệm. Đây là ứng viên khám phá, chưa phải nguồn được xác minh. Smoke test sau đó đổi brief thành `Array.prototype.map` và ghi rõ loại trừ kiểu dữ liệu `Map`; quy trình sản phẩm vẫn bắt buộc tải trang, lập hồ sơ và người dùng duyệt.

Golden set hiện hành: [24 ca dự thảo](golden-set.md), cần nhóm/người chấm duyệt trước khi chốt. Chất lượng model thật trên brief có nguồn, tỷ lệ chấp nhận của người dùng và chi phí quy đổi: **NOT_MEASURED**. Tìm kiếm thật đã kết nối; chất lượng sau lần siết bộ lọc thứ hai chưa được đo lại. Không điền kết quả giả vào mẫu bên dưới.

## Chiều chất lượng

| Chiều | Định nghĩa kiểm chứng được |
|---|---|
|  |  |

## Quality Bar
> Chốt trước hạn CP4 (21:00 17/9), giữ nguyên sau đó

**"Đạt khi ≥ ___% qua bộ, và ___"**

## Kết quả các lượt chạy

### Lượt 1

| # | Input | Expected | Actual | Pass/Fail | Ghi chú |
|---|---|---|---|---|---|
| 1 |  |  |  |  |  |

**Tổng: ___/20 = ___%**

### Phân tích case chưa đạt

| Case # | Nguyên nhân | Hướng sửa |
|---|---|---|
