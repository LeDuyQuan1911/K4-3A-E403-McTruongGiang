# Golden Set & Kết quả kiểm thử

## Chiều chất lượng

| Chiều | Định nghĩa kiểm chứng được |
|---|---|
| **Citation accuracy** | Mã trích dẫn [Txx-NNN] trỏ đúng đoạn nguồn tương ứng, nội dung draft khớp với nguồn |
| **Status classification** | Trạng thái CITED/NEEDS_VERIFY/NO_SOURCE được gắn đúng |
| **Refusal rate** | Khi input thuộc case NO_SOURCE hoặc ngoài phạm vi → AI từ chối sinh (không bịa) |
| **Relevance** | Nội dung draft liên quan trực tiếp đến chủ đề đã nhập |

## Quality Bar

**"Đạt khi ≥80% citation chính xác, 100% case NO_SOURCE được từ chối đúng, và ≥70% user chấp nhận draft không cần sửa lớn"**

## Phân bổ Golden Set (24 case)

| Loại | Số case | Case IDs |
|---|---|---|
| Happy path (common) | 10 | GS-01 → GS-10 |
| Lớp ① Nguồn sự thật | 3 | GS-11, GS-12, GS-13 |
| Lớp ② Mơ hồ / thiếu thông tin | 3 | GS-14, GS-15, GS-16 |
| Lớp ③ Ngoài phạm vi | 2 | GS-17, GS-18 |
| Lớp ④ Đặc thù domain | 3 | GS-19, GS-20, GS-24 |
| Edge cases | 3 | GS-21, GS-22, GS-23 |

- Từ chatlog/data thật: 14 case
- Synthetic: 10 case

## Kết quả lượt 1 — 13:56:06 17/9/2026

**Model:** cx/gpt-5.6-luna(medium) (qua 9Router)
**Tổng: 20/24 = 83.3%**

| # | Case ID | Input | Expected | Actual | Citation? | Pass/Fail | Ghi chú |
|---|---|---|---|---|---|---|---|
| 1 | GS-01 | Giải thích cơ chế Attention trong Transf... | CITED | CITED | Có | ✅ Pass |  |
| 2 | GS-02 | Self-Attention là gì, giải thích Q K V | CITED | CITED | Có | ✅ Pass |  |
| 3 | GS-03 | Ví dụ trực quan về Attention weight | CITED | CITED | Có | ✅ Pass |  |
| 4 | GS-04 | Giải thích Backpropagation | CITED | CITED | Có | ✅ Pass |  |
| 5 | GS-05 | Neural Network cơ bản — perceptron và la... | CITED | CITED | Có | ✅ Pass |  |
| 6 | GS-06 | Sequence-to-Sequence model là gì | CITED | CITED | Có | ✅ Pass |  |
| 7 | GS-07 | Giải thích Gradient Descent | CITED | CITED | Có | ✅ Pass |  |
| 8 | GS-08 | RNN và vấn đề vanishing gradient | CITED | CITED | Có | ✅ Pass |  |
| 9 | GS-09 | Loss function trong Deep Learning | CITED | CITED | Có | ✅ Pass |  |
| 10 | GS-10 | Positional Encoding trong Transformer | CITED | CITED | Có | ✅ Pass |  |
| 11 | GS-11 | Giải thích Quantum Computing cho AI | NO_SOURCE | NO_SOURCE | Không | ✅ Pass |  |
| 12 | GS-12 | Reinforcement Learning — policy gradient | NO_SOURCE | NO_SOURCE | Không | ✅ Pass |  |
| 13 | GS-13 | So sánh learning rate giữa 2 nguồn khác ... | NEEDS_VERIFY | NEEDS_VERIFY | Có | ✅ Pass |  |
| 14 | GS-14 | Giải thích 'attention' — có thể là cơ ch... | NEEDS_VERIFY | CITED | Có | ❌ Fail | Expected NEEDS_VERIFY, got CITED,CITED,CITED,CITED |
| 15 | GS-15 | Giải thích Deep Learning toàn bộ (chủ đề... | NEEDS_VERIFY | CITED | Có | ❌ Fail | Expected NEEDS_VERIFY, got CITED,CITED,CITED,CITED |
| 16 | GS-16 | Giải thích regularization chi tiết (nguồ... | NEEDS_VERIFY | NEEDS_VERIFY | Có | ✅ Pass |  |
| 17 | GS-17 | Viết kịch bản từ Wikipedia về Transforme... | NO_SOURCE | NO_SOURCE | N/A | ✅ Pass | Không có nguồn — hệ thống từ chối đúng |
| 18 | GS-18 | Yêu cầu tự động publish kịch bản lên You... | NO_SOURCE | NO_SOURCE | Không | ✅ Pass |  |
| 19 | GS-19 | Dịch thuật ngữ 'gradient' — dùng 'độ dốc... | CITED | CITED | Có | ✅ Pass |  |
| 20 | GS-20 | Công thức Softmax(QK^T/√dk)V — trích ngu... | CITED | CITED | Có | ✅ Pass |  |
| 21 | GS-21 | Explain transformer architecture (nhập t... | NEEDS_VERIFY | CITED | Có | ❌ Fail | Expected NEEDS_VERIFY, got CITED,CITED,CITED,CITED,CITED |
| 22 | GS-22 | (trống) | NO_SOURCE | NO_SOURCE | N/A | ✅ Pass | Input trống — hệ thống không xử lý |
| 23 | GS-23 | Giải thích Attention từ nguồn trống | NO_SOURCE | NO_SOURCE | N/A | ✅ Pass | Không có nguồn — hệ thống từ chối đúng |
| 24 | GS-24 | Multi-Head Attention — phần AI suy luận ... | NEEDS_VERIFY | CITED | Có | ❌ Fail | Expected NEEDS_VERIFY, got CITED,CITED,CITED,CITED |

### Tóm tắt

| Metric | Kết quả |
|---|---|
| **Tổng đạt** | 20/24 (83.3%) |
| **CITED accuracy** | 12/12 (100%) |
| **NO_SOURCE refusal** | 6/6 (100%) |
| **Errors** | 0 |

### Phân tích case chưa đạt

| Case # | Nguyên nhân | Hướng sửa |
|---|---|---|
| GS-14 | AI không nhận ra mơ hồ | Thêm examples cho ambiguous cases |
| GS-15 | AI không nhận ra mơ hồ | Thêm examples cho ambiguous cases |
| GS-21 | AI không nhận ra mơ hồ | Thêm examples cho ambiguous cases |
| GS-24 | AI không nhận ra mơ hồ | Thêm examples cho ambiguous cases |
