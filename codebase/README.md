# ScriptForge — cách chạy và đổi API

Ứng dụng C3: nhập chủ đề, mục tiêu, người học và thời lượng → tìm web → duyệt hồ sơ nguồn → viết kịch bản toàn bài → đối chiếu từng cảnh → giảng viên duyệt → xuất tệp.

## Chạy trên Windows

Cần Node.js từ 22.13. Mở PowerShell tại thư mục gốc (nơi có `package.json`):

```powershell
cd "F:\New folder\hackathon\K4-3A-E403-McTruongGiang"
npm install
```

Nếu chưa có `.env`, sao chép `.env.example` thành `.env`. Nếu đã có, giữ các giá trị đang dùng và bổ sung cấu hình dưới đây. Khóa chỉ điền trong `.env` trên máy, không điền vào giao diện hay commit Git.

```dotenv
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=điền_khóa_DeepSeek_thật
DEEPSEEK_MODEL=deepseek-flash
SEARCH_PROVIDER=exa
EXA_API_KEY=điền_khóa_Exa_thật
PORT=3000
```

```powershell
npm run doctor
npm start
```

Mở [http://127.0.0.1:3000](http://127.0.0.1:3000). Giữ terminal đang chạy. Dừng bằng **Ctrl+C**. Sau khi đổi `.env`, khởi động lại và tải lại trang. `npm run dev` tự khởi động lại khi sửa mã nguồn; thay `.env` vẫn nên dừng/chạy lại.

Không mở trực tiếp `index.html`: giao diện cần máy chủ để gọi API và lưu dữ liệu. Nếu báo `EADDRINUSE`, một máy chủ khác đang chiếm cổng; dùng cửa sổ đang chạy đó hoặc đổi `PORT` rồi mở đúng cổng mới.

## DeepSeek khi chưa có khóa tìm kiếm

Đặt `SEARCH_PROVIDER=manual`, giữ khóa DeepSeek. Tạo đề bài → thêm URL HTML công khai → đọc và duyệt nguồn → viết kịch bản bằng DeepSeek. Đây là luồng nhập nguồn thủ công; để đáp ứng demo **tự tìm nguồn** của C3, cần cấu hình Exa, Tavily hoặc OpenAI Web Search.

“Mở bộ thử minh họa” chạy không cần khóa: dùng trang HTML giả do nhóm tự tạo, không gọi AI; tệp xuất cũng có nhãn minh họa.

## Đổi nhà cung cấp

Điền sẵn khóa theo từng nhà cung cấp, rồi đổi `AI_PROVIDER` và khởi động lại. Khóa/model không được dùng lẫn nhau. Không tự chuyển sang dịch vụ khác khi gặp lỗi.

| `AI_PROVIDER` | Khóa | Model có thể đổi | Kết nối |
|---|---|---|---|
| `deepseek` | `DEEPSEEK_API_KEY` | `DEEPSEEK_MODEL` | DeepSeek Chat Completions, JSON mode |
| `openai` | `OPENAI_API_KEY` | `OPENAI_MODEL` | OpenAI Responses, JSON schema |
| `gemini` | `GEMINI_API_KEY` | `GEMINI_MODEL` | Gemini OpenAI-compatible endpoint, JSON schema |
| `compatible` | `COMPATIBLE_API_KEY` | `COMPATIBLE_MODEL` | Endpoint Chat Completions tự cấu hình |

Ví dụ OpenAI:

```dotenv
AI_PROVIDER=openai
OPENAI_API_KEY=điền_khóa_OpenAI
OPENAI_MODEL=gpt-4.1-mini
# Có thể giữ Exa hoặc dùng OpenAI để tìm kiếm:
SEARCH_PROVIDER=openai
OPENAI_SEARCH_MODEL=gpt-4.1-mini
```

Ví dụ Gemini:

```dotenv
AI_PROVIDER=gemini
GEMINI_API_KEY=điền_khóa_Gemini
GEMINI_MODEL=gemini-3.8-flash
SEARCH_PROVIDER=exa
EXA_API_KEY=điền_khóa_Exa
```

Tên model mặc định lấy từ tài liệu API đã kiểm tra; quyền truy cập và vòng đời model phụ thuộc tài khoản nhà cung cấp. Có thể thay bằng model hỗ trợ giao thức tương ứng của tài khoản.

Với dịch vụ khác có API tương thích OpenAI:

```dotenv
AI_PROVIDER=compatible
COMPATIBLE_BASE_URL=https://dia-chi-api-cua-ban/v1
COMPATIBLE_API_KEY=điền_khóa_dịch_vụ_này
COMPATIBLE_MODEL=điền_tên_model
COMPATIBLE_JSON_MODE=json_object
SEARCH_PROVIDER=exa
EXA_API_KEY=điền_khóa_Exa
```

`BASE_URL` gồm tiền tố API nếu cần (`/v1`), không gồm `/chat/completions`. `COMPATIBLE_JSON_MODE` nhận `json_object`, `json_schema` hoặc `text` theo tài liệu nhà cung cấp. Với `text`, ứng dụng vẫn yêu cầu JSON qua prompt và kiểm tra schema tại máy chủ. API native không tương thích Chat Completions cần adapter mới; không nhập endpoint Anthropic Messages vào cấu hình này.

## Cấu trúc tích hợp

- `lib/providers.js`: preset, tách khóa, xử lý HTTP và hai giao thức Responses/Chat Completions.
- `lib/search.js`: Exa / Tavily / OpenAI Web Search / thêm URL thủ công, độc lập với model viết.
- `lib/ai.js`: prompt chung, JSON schema và kiểm tra đầu ra cho mọi model.
- `lib/lesson.js`: phân bổ lời giảng theo thời lượng, phát hiện bản quá ngắn, giao việc cho mentor hoặc lặp nội dung.
- `lib/source-policy.js`: ưu tiên học liệu gốc quốc tế cho chủ đề AI và bộ từ khóa song ngữ có giới hạn.
- `lib/web.js`: tải HTML thật, kiểm tra URL/DNS/robots, trích văn bản và metadata.
- `lib/core.js`: kiểm chứng trích đoạn, quy tắc kịch bản, trạng thái duyệt và tệp xuất.
- `lib/service.js`: vòng đời dự án, phụ thuộc nguồn–câu, lưu dữ liệu và audit.
- `server.js`, `app.js`, `styles.css`: HTTP API và giao diện.

URL từ công cụ tìm kiếm chỉ dùng để khám phá. Ứng dụng tải lại từng trang; không lấy câu trả lời sinh sẵn của tìm kiếm làm bằng chứng. Model viết chỉ nhận các đoạn từ nguồn đã duyệt. Trích dẫn sai mã hoặc không khớp bản tải về bị chặn. Diễn giải vẫn cần người duyệt kiểm tra mức hỗ trợ của bằng chứng.

## Kiểm tra

```powershell
npm test
npm run eval
npm run doctor
npm run check:api
npm run check:search
```

`test` kiểm tra cơ chế bảo vệ, giao thức nhà cung cấp bằng phản hồi giả lập, và luồng HTTP cục bộ. `eval` lưu báo cáo vào `test-output/`; đó không phải điểm chất lượng nội dung AI. `doctor` chỉ kiểm tra cấu hình, không gửi dữ liệu hay tốn phí. `check:api` thực hiện một lời gọi nhỏ tới model đã chọn; `check:search` thực hiện một truy vấn tìm kiếm nhỏ và chỉ xác nhận API trả URL HTTPS. Hai lệnh có thể phát sinh phí và chưa chứng minh chất lượng kịch bản hay độ tin cậy của kết quả. Lỗi cấu hình/401/402/403/429, từ chối, rỗng, bị cắt hoặc sai JSON đều được báo rõ.

## Chi phí, dữ liệu và giới hạn

Một lượt thông thường: một hoặc hai truy vấn Exa, tải tối đa tám trang, lập dàn bài theo lô tối đa tám slide, rồi gọi model riêng cho từng slide. Slide quá ngắn, lặp gần toàn bộ slide trước hoặc giao việc cho mentor được viết lại tối đa một lần; nếu vẫn lỗi sẽ hiện cảnh báo và chặn duyệt. Bài ba phút dự kiến bốn slide: một lời gọi lập dàn bài và bốn đến tám lời gọi viết. Bài dài có thể cần vài phút và nhiều token hơn. Tavily và OpenAI Web Search vẫn cấu hình độc lập với model viết. Mỗi lời gọi giới hạn năm nghìn token đầu ra. Chi phí thực tế phụ thuộc dịch vụ tìm kiếm và token; xem usage/billing tại nhà cung cấp. Audit ghi provider, model, token do API trả và thời gian; không ghi khóa. Nếu API thất bại, không thay thế bản kịch bản cũ bằng kết quả dở dang.

Chủ đề/mục tiêu gửi tới dịch vụ tìm kiếm đã chọn; đề bài và bằng chứng được duyệt gửi tới model viết. Mỗi dịch vụ áp dụng chính sách lưu dữ liệu riêng; `store:false` chỉ được gửi cho OpenAI Responses.

Dự án và bản văn bản nguồn lưu ở `codebase/data/projects.json`, đã loại khỏi Git. Chỉ phục vụ tại `127.0.0.1`, chưa có xác thực đa người dùng. Xác nhận giảng viên là tự khai tại máy. Cần bổ sung xác thực và quản trị dữ liệu trước khi triển khai công khai.

Kịch bản gồm tiêu đề, hai đến năm ý trên slide, lời giảng đọc nguyên văn và ý đồ hình. Dàn bài nêu kiến thức cần giải thích, ví dụ có phân tích, thực hành/câu hỏi có đáp án và căn cứ cho mỗi phần. Không giới hạn lời nói ở hai đến bốn câu. Thời lượng theo mẫu của ban tổ chức: khoảng **2,9 tiếng Việt/giây**, dùng đơn vị cách nhau bằng khoảng trắng để ước tính, không phải đo âm thanh. Mỗi slide khoảng năm mươi giây, từ ba đến ba mươi sáu slide cho bài một đến ba mươi phút. Thiếu học liệu thì đánh dấu phần thiếu, không tự bịa để đủ độ dài. JSON C3/C4 tách lời đọc thành từng câu có số thứ tự; các câu thuộc cùng slide dẫn nhóm bằng chứng đã được người dùng duyệt cho slide đó, không tuyên bố đã tự kiểm chứng ý nghĩa từng câu.

Với chủ đề AI, Exa/Tavily dùng từ khóa tiếng Anh và danh sách miền ưu tiên như Anthropic, OpenAI, Google, Hugging Face, NIST, trường đại học và kho nghiên cứu. Kết quả vẫn phải khớp chủ đề; loại trang trong nước, trang bán khóa học, bản sao không rõ tổ chức và trang tìm kiếm. Google Scholar dùng để khám phá công trình gốc, không phải nội dung bằng chứng; bản này **không tích hợp trực tiếp API Google Scholar hoặc nội dung khóa học Udemy**. Không vượt đăng nhập hay paywall. Người dùng vẫn có thể nhập URL thủ công, nhưng nguồn ngoài chính sách không được gửi cho model khi viết bài AI. Nguồn cũ trong dự án không bị xóa hoặc tự đổi quyết định duyệt. Nếu chỉ đọc được abstract thì không được suy diễn thành toàn văn.

Chỉ hỗ trợ HTML công khai; PDF và trang phụ thuộc JavaScript có thể không đọc được. Robots/noai được kiểm tra; quyền tái sử dụng và điều khoản vẫn cần người duyệt xác nhận. Bộ từ khóa, nhận diện uy tín, độ liên quan, độ sâu, lặp ý, lệnh ẩn và mâu thuẫn là heuristic, không bảo đảm phát hiện mọi trường hợp. Hai nhóm tên miền không tự chứng minh hai nghiên cứu độc lập. Độ dài không chứng minh độ đúng hay chất lượng sư phạm. Bộ kiểm thử dùng phản hồi model giả lập; chưa chứng nhận chất lượng bài học trên model thật.

Sau khi cập nhật mã: dừng máy chủ bằng Ctrl+C, chạy `npm start`, tải lại trang. Với dự án cũ, bỏ nguồn không phù hợp → tìm thêm nguồn chuyên sâu → đọc và duyệt nguồn mới → **Viết lại toàn bài** khi chưa có quyết định duyệt/bỏ cảnh. Nếu đã duyệt cảnh, tạo đề bài mới để thử toàn bộ luồng mới và giữ nguyên quyết định của bản cũ.

## Tài liệu API dùng để triển khai

- [DeepSeek: endpoint và model](https://api-docs.deepseek.com/), [JSON Output](https://api-docs.deepseek.com/guides/json_mode/), [thinking mode](https://api-docs.deepseek.com/guides/thinking_mode/).
- [Gemini: OpenAI compatibility](https://ai.google.dev/gemini-api/docs/openai).
- [OpenAI: Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [Web Search](https://developers.openai.com/api/docs/guides/tools-web-search).
- [Exa Search API](https://exa.ai/docs/reference/search).
- [Tavily Search API](https://docs.tavily.com/documentation/api-reference/endpoint/search) — phương án tương thích tùy chọn.
