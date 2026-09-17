# ScriptForge — Prototype Codebase

## Hướng dẫn chạy

1. Mở file `index.html` trực tiếp trên trình duyệt (Chrome/Edge/Firefox)
2. Nhập **OpenAI API Key** ở Bước 1 và bấm "Kết nối"
3. Nhập chủ đề → Chọn nguồn → AI sẽ gọi GPT thật để sinh kịch bản

## Kiến trúc kỹ thuật

```
index.html (Single-page application)
│
├── UI Layer (HTML/CSS)
│   ├── 5 screens: Nhập đề → Chọn nguồn → AI Draft → Duyệt → Xuất
│   ├── 3 trạng thái: CITED (🟢) / NEEDS_VERIFY (🟡) / NO_SOURCE (🔴)
│   └── HAX/PAIR tags: G1, G2, G9, G10, G11
│
├── RAG Pipeline (JavaScript)
│   ├── Transcript fixtures (6 nguồn, ~40 đoạn có mã trích dẫn)
│   ├── Source selection & context building
│   └── Dynamic prompt construction
│
├── AI Decision Engine
│   ├── API: 9Router (9r.thaidangcap.io.vn) → cx/gpt-5.6-luna(medium)
│   ├── System prompt: Buộc chỉ dùng nguồn, gắn status, giữ thuật ngữ gốc
│   ├── Output: JSON array với status + citations + source_quotes
│   └── Fallback parsing cho markdown-wrapped JSON
│
└── Trace Logging
    ├── Ghi log prompt đầu vào
    ├── Ghi log response thô
    ├── Ghi log parsing result
    └── Xuất full log trong file .md khi download
```

## Quyết định trung tâm

- **Chỗ AI quyết định:** Cho mỗi đoạn kịch bản, AI quyết định:
  1. Nội dung draft (dựa trên nguồn)
  2. Trạng thái tin cậy (CITED / NEEDS_VERIFY / NO_SOURCE)
  3. Mã trích dẫn nguồn [Txx-NNN]
- **API/Model sử dụng:** 9Router (https://9r.thaidangcap.io.vn/v1) → cx/gpt-5.6-luna(medium)
- **Log/trace:** Hiển thị real-time trong UI + xuất kèm file .md khi download

## Phần mock vs phần thật

| Thành phần | Mock hay Thật | Ghi chú |
|---|---|---|
| UI / UX flow | Thật | 5 bước đầy đủ, responsive |
| Transcript data | Mock (fixture) | 6 nguồn × ~40 đoạn có mã trích dẫn, mô phỏng data thật |
| Lời gọi AI | **Thật** | Gọi cx/gpt-5.6-luna(medium) qua 9Router API |
| RAG retrieval | Mock | Context = toàn bộ transcript fixture, chưa có vector search |
| Citation generation | **Thật** | AI tự gắn mã trích dẫn dựa trên nguồn |
| Status classification | **Thật** | AI tự phân loại CITED/NEEDS_VERIFY/NO_SOURCE |
| Trace logging | **Thật** | Log đầy đủ prompt + response + timestamps |
| Export .md | Thật | Tải file markdown kèm log |

## Nguyên tắc HAX/PAIR trong prototype

| Nguyên tắc | Vị trí áp dụng |
|---|---|
| G1 — Làm rõ hệ thống làm được gì | Bước 1: subtitle + warning banner |
| G2 — Làm rõ nó làm tốt đến đâu | Bước 2: "AI chỉ trích dẫn từ nguồn bạn chọn" |
| G9 — Sửa dễ dàng | Bước 4: Nút ✓/✏/✗ mỗi đoạn, contentEditable |
| G10 — Thu hẹp khi nghi ngờ | NEEDS_VERIFY banner + NO_SOURCE từ chối sinh |
| G11 — Giải thích vì sao | Bước 5: Danh sách nguồn + trace log |
