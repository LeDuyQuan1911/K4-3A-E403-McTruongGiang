# Báo cáo CP4 — Golden set và regression

CP4 chỉ công bố kết quả của bộ [golden set 50 ca](golden-set.csv) và regression phần mềm liên quan. Không lưu hay dùng kết quả chạy model thật, token, response ID, URL source-pack hoặc tỷ lệ chất lượng model trong báo cáo này.

## Kết quả tái lập

Chạy `npm run eval` cho kết quả **81/81 kiểm thử qua** và **50/50 case fixture pass**. Output regression cục bộ sinh ra tại `test-output/regression.tap` và `test-output/regression.json`; không commit các tệp này. Bảng kết quả của từng golden case được lưu tại [golden-results.csv](golden-results.csv).

| Nhóm trong golden set | Số ca | Hệ thống cần thể hiện |
|---|---:|---|
| `CITED` | 20 | Chỉ liên kết evidence đã duyệt với quote/chunk chính xác. |
| `NEEDS_VERIFY` | 12 | Gắn cờ bằng chứng mơ hồ, cũ, thiếu độc lập hoặc là diễn giải. |
| `NO_SOURCE` | 10 | Không sinh claim khi không có evidence hợp lệ và không ghi đè bản nháp an toàn. |
| `OUT_OF_SCOPE` | 8 | Từ chối yêu cầu vượt rào truy cập, bịa nguồn, tự publish hoặc lộ dữ liệu cá nhân. |
| **Tổng** | **50** | Schema, mã case duy nhất, trường bắt buộc và phân bố lớp đều được kiểm tra tự động. |

`golden-results.csv` ghi từng case với trạng thái thực tế và `PASS`/`FAIL`: tất cả **50/50 PASS** trong lượt regression fixture. `CITED` chạy qua guard quote khớp; `NEEDS_VERIFY` kiểm tra cờ cần đối chiếu; `NO_SOURCE` đưa citation sai để xác nhận hệ thống chặn; `OUT_OF_SCOPE` chạy qua scope guard. Đây là kết quả hành vi mã nguồn có thể tái lập, không phải nội dung được DeepSeek sinh ra.

Phạm vi regression: citation quote/chunk, nguồn chưa duyệt, injection, URL nội bộ, robots/noai/paywall, nguồn cũ/metadata, số liệu độc lập và mâu thuẫn, sửa/duyệt lại cảnh, cấu trúc lời giảng, export, CSRF, adapter provider và JSON lỗi.

## Diễn giải đúng

`81/81` và `50/50` chứng minh các cơ chế phần mềm và tính toàn vẹn của bộ 50 ca đang không hồi quy. Nó **không** là tỷ lệ câu trả lời đúng, citation accuracy ngữ nghĩa, chi phí hay mức chấp nhận của người dùng. Các chỉ số chất lượng đó chỉ được công bố khi có nguồn chuẩn cho từng case và người chấm độc lập.
