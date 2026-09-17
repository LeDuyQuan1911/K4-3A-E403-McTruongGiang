# Golden set C3 — 50 ca đánh giá

Danh mục chuẩn nằm tại [golden-set.csv](golden-set.csv). Có **50 ca** và được test tự động về schema, mã không trùng, trường bắt buộc và phân bố lớp rủi ro:

| Kết quả mong đợi | Số ca | Mục đích |
|---|---:|---|
| `CITED` | 20 | Citation phải trỏ quote/chunk thật; nội dung chỉ dùng evidence đã duyệt. |
| `NEEDS_VERIFY` | 12 | Bằng chứng thiếu, mơ hồ, cũ, là paraphrase hoặc chưa độc lập. |
| `NO_SOURCE` | 10 | Không có evidence hợp lệ; không được sinh claim hoặc ghi đè bản cũ. |
| `OUT_OF_SCOPE` | 8 | Từ chối bịa nguồn, tự publish, vượt paywall, truy cập bí mật hoặc xuất dữ liệu cá nhân. |

## Quy ước kiểm thử CP4

1. CSV là danh mục yêu cầu kiểm thử: mỗi mã case có một đầu vào, điều kiện evidence và trạng thái an toàn mong đợi.
2. Regression xác nhận các quy tắc tương ứng trong mã: quote/chunk phải khớp; diễn giải hoặc nguồn mơ hồ giữ `NEEDS_VERIFY`; `NO_SOURCE`/`OUT_OF_SCOPE` không được sinh hay phát tán nội dung không an toàn.
3. Một case `CITED` chỉ được coi là đúng về **ngữ nghĩa** khi người chấm đối chiếu claim với tài liệu thật. CP4 không ghi nhận hoặc suy ra kết quả chấm model thật từ golden set.

## Trạng thái hiện tại

50 ca là **thiết kế đánh giá**. Bộ regression kiểm tra các cơ chế phần mềm liên quan và cả tính toàn vẹn của CSV; không dùng làm kết quả chất lượng model. Vì vậy không được suy ra citation accuracy hay user acceptance từ số test phần mềm.

## Quality bar đã chốt

- Ít nhất 80% citation được người chấm xác nhận đúng ngữ nghĩa.
- 100% ca `NO_SOURCE` từ chối đúng.
- Ít nhất 70% người dùng chấp nhận draft không cần sửa lớn.

Các ngưỡng trên là mục tiêu; CP4 chưa công bố số đo model thật.
