# Bằng chứng nhu cầu — đã ẩn danh

Tài liệu ghi lại evidence cho giả thuyết C3: người viết nội dung giảng dạy cần định vị đoạn nguồn chính xác trước khi viết kịch bản. Tên, lớp, liên hệ và định danh trực tiếp của người trả lời đã bị loại bỏ trước khi đưa vào Git. Chỉ dùng mã `P01`–`P20`. Vai trò chỉ được ghi ở hai mức: **Học viên** hoặc **Lab coach**.

## Quy tắc bảo mật

- Không đưa họ tên, liên hệ, lớp cụ thể, file gốc hay bảng nối mã `Pxx` với danh tính vào Git.
- Quote chỉ dùng trong bài nộp hackathon. Trước khi công bố rộng hơn, nhóm cần xác nhận sự đồng ý; trạng thái đồng ý gốc không lưu tại đây.
- Vai trò được khái quát thành Học viên/Lab coach để tránh suy luận ngược danh tính. Bản ghi gốc phải ở kho riêng có quyền truy cập hạn chế.

## Evidence chuẩn A — khảo sát ẩn danh

**Mẫu ghi nhận:** hai mươi người ngoài nhóm: năm Lab coach và mười lăm Học viên. **Kết quả:** mười chín trên hai mươi phản hồi có pain point, một phản hồi không rõ; tỷ lệ mô tả là **95%**. Đây là mẫu thuận tiện, không phải kết quả đại diện thống kê.

| Mã | Vai trò khái quát | Câu hỏi | Trả lời đã khử định danh | Pain? |
|---|---|---|---|:---:|
| P01 | Lab coach | Công đoạn tốn thời gian nhất? | “Lội lại transcript video cũ với slide để tìm đoạn công thức; có khi xem hai tiếng video chỉ để lấy hai câu trích dẫn.” | Có |
| P02 | Lab coach | AI viết kịch bản có vấn đề gì? | “AI viết mượt nhưng hay bịa tài liệu tham khảo với số trang; trích dẫn sai trong slide sẽ mất uy tín.” | Có |
| P03 | Học viên | Từng gặp nguồn mâu thuẫn chưa? | “Slide tóm tắt một kiểu nhưng transcript nhấn mạnh số liệu khác; phải hỏi riêng rất mất thời gian.” | Có |
| P04 | Học viên | Viết kịch bản video tốn bao lâu? | “Video mười phút mất cả buổi chiều để tìm định nghĩa chính xác và đưa vào kịch bản.” | Có |
| P05 | Học viên | Đã dùng RAG tra cứu bài giảng? | “Công cụ hỏi đáp theo tài liệu trả lời được nhưng không định dạng thành kịch bản slide có lời thoại.” | Có |
| P06 | Lab coach | Khó nhất khi biên tập kịch bản? | “Người viết không ghi rõ nguồn từ slide/bài nào; phải kiểm chứng lại từng đoạn từ đầu.” | Có |
| P07 | Học viên | Cần AI hỗ trợ gì nhất? | “Cần trích đúng đoạn kèm mã bài và nói rõ phần nào chắc chắn, phần nào là suy luận thêm.” | Có |
| P08 | Học viên | Có tin hoàn toàn vào AI? | “Không dám copy hoàn toàn nếu không có text gốc đối chiếu kế bên để kiểm tra trực tiếp.” | Có |
| P09 | Học viên | Thời lượng kịch bản AI có đạt yêu cầu? | “Yêu cầu mười phút nhưng AI trả khoảng ba trăm từ, đọc chưa tới hai phút và nội dung rất lướt.” | Có |
| P10 | Lab coach | Có dùng công cụ tìm đoạn nguồn/gắn trạng thái? | “Rất cần tính năng từ chối sinh khi không có nguồn để tránh ngộ nhận kiến thức sai.” | Có |
| P11 | Học viên | Lời thoại kèm gợi ý hình ảnh slide có hữu ích? | “Rất tiện vì sau lời thoại còn phải nghĩ hình, biểu đồ nào khớp.” | Có |
| P12 | Học viên | Chuẩn bị một slide kỹ thuật mất bao lâu? | “Khoảng ba mươi đến bốn mươi lăm phút vì phải tra công thức và thuật ngữ tiếng Anh chuẩn.” | Có |
| P13 | Học viên | Tra cứu tài liệu học tập bằng cách nào? | “Tìm từng file PDF bằng từ khóa; gặp từ đồng nghĩa thì vẫn phải đọc lướt bằng mắt.” | Có |
| P14 | Học viên | Có gặp lỗi dịch thuật ngữ kỹ thuật gượng? | “Có; cần giữ nguyên thuật ngữ gốc thay vì tự dịch làm sai bản chất.” | Có |
| P15 | Học viên | Có cần duyệt từng slide trước khi xuất? | “Nên có nút duyệt nhanh hoặc cảnh báo nếu lỡ bỏ sót slide chưa đọc.” | Có |
| P16 | Học viên | Có trễ hạn vì kiểm tra nguồn? | “Có; khâu kiểm tra nguồn tốn hơn sáu mươi phần trăm thời gian làm bài.” | Có |
| P17 | Học viên | Có cần công cụ tự viết kịch bản? | “Không cần lắm vì thích tự đọc, nhưng làm bài nhóm nhanh thì có thể thử.” | Không rõ |
| P18 | Học viên | Ghét nhất điều gì ở công cụ AI? | “Hay trả lời tự tin thái quá, không biết vẫn cố trả lời như thật.” | Có |
| P19 | Lab coach | Mong muốn gì ở kịch bản bài giảng? | “Cần cấu trúc rõ: mục đích slide, hình minh họa và bài học rút ra.” | Có |
| P20 | Học viên | Làm slide từ transcript dài như thế nào? | “Đọc lướt rất mệt; đôi lúc nản và muốn copy đại một đoạn trên mạng.” | Có |

### Diễn giải được phép

Các phản hồi ủng hộ ba pain point: tốn thời gian định vị evidence; khó truy vết/kiểm chứng nội dung AI; và cần kịch bản có cấu trúc slide cùng lời thoại đủ chi tiết. Chúng không chứng minh hiệu quả của sản phẩm hoặc quan hệ nhân quả. P17 được giữ để không làm sai lệch tỷ lệ.

## Evidence chuẩn B — mining tài liệu học liệu

### Phương pháp có thể lặp lại

- Phạm vi: sáu transcript và ba bộ slide Machine Learning/Deep Learning mà nhóm có quyền truy cập nội bộ; bản gốc không lên Git.
- Đơn vị đếm: một đoạn trích chuẩn có locator ổn định. Không đếm lại cùng đoạn ở các lần tìm kiếm khác nhau.
- Nhãn: (một) công thức/thuật ngữ dễ sai khi paraphrase; (hai) cùng khái niệm nhưng ngữ cảnh khác; (ba) bằng chứng quá vắn tắt để tự ngoại suy.
- Kiểm lại: người có quyền truy cập mở đúng locator, xác nhận văn bản và nhãn; không tìm lại được thì loại khỏi tổng.

### Kết quả

- Rà soát ba mươi tám đoạn trích chuẩn; ghi nhận mười bốn đoạn có rủi ro trích dẫn/paraphrase.
- Transformer, Scaled Dot-Product, Backpropagation, Perceptron, Dropout và ReLU được giữ nguyên trong trace. Đây là quy ước biên soạn, không phải tỷ lệ cho mọi tài liệu.

### Ví dụ đã khử định danh nguồn nội bộ

| Mã | Locator đã khử định danh | Đoạn trích | Pain |
|---|---|---|---|
| M01 | Transcript 06 · 055 | “Attention(Q,K,V) = softmax(QK^T / sqrt(d_k)) × V. Phần chia cho sqrt(d_k) là scaled factor.” | Công thức/thuật ngữ dễ sai |
| M02 | Slide 03 · 025 | “MultiHead(Q,K,V) = Concat(head_1,...,head_h)W_O. Mỗi head_i = Attention(QW_i^Q, KW_i^K, VW_i^V).” | Công thức đa chiều |
| M03 | Transcript 03 · 035 và 05 · 025 | “Gradient descent: w_new = w_old - learning_rate × gradient” đối chiếu với mô tả vanishing gradient trong RNN. | Cùng thuật ngữ khác ngữ cảnh |
| M04 | Transcript 06 · 058 | Ví dụ đại từ “it” và attention weight hướng tới thực thể trước đó. | Ví dụ cần citation đúng đoạn |
| M05 | Transcript 03 · 052 | “Regularization: L1, L2, Dropout… L2 thêm λ·||w||² vào loss function.” | Bằng chứng vắn tắt; không tự ngoại suy |

## Trạng thái CP4

Evidence đã được chuẩn hóa cho review nội bộ và loại bỏ tên người trả lời. Nhóm vẫn cần lưu ngày thu thập, cách lấy mẫu và xác nhận đồng ý trong kho riêng nếu dùng quote trong thuyết trình hoặc công bố ngoài lớp học.
