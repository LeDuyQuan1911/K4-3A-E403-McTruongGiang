# Mini Hackathon AI — Batch 04 · Lớp 3A

**SPEC → Prototype → Demo.** Đây không phải cuộc thi code — đây là cuộc thi **tư duy sản phẩm AI**.

## 👥 Thành viên nhóm & Phân công vai trò

**Lớp:** 3A · **Phòng:** E403 · **Nhóm:** McTruongGiang · **Track:** C3 — Research-to-Script (Lesson Studio)

| Họ và Tên | Mã Học Viên | Vai trò chính | Phần việc đảm nhiệm trong dự án |
|---|---|---|---|
| **Lê Duy Quân** | _(điền MSSV)_ | Nhóm trưởng · Lead & Eval | Kiến trúc tổng thể, bộ kiểm thử Golden Set (24 cases), review logic UI/UX |
| **Bùi Trọng Trịnh** | _(điền MSSV)_ | Dev · Backend & RAG | RAG prompt engineering, tính toán thời lượng video ~130 wpm, API proxy |
| **Nguyễn Lê Phúc Thắng** | _(điền MSSV)_ | Dev & Evidence | Khảo sát người dùng (20 người), phân tích mining data, luồng duyệt kịch bản |
| **Vũ Minh Hoàng** | _(điền MSSV)_ | Validation & Presentation | Thu thập feedback người dùng thật (Bonus R6), chuẩn bị Slide PDF và Video demo |

## 📁 Cấu trúc repo

```
├── README.md              # Thông tin nhóm + phân công
├── spec.md                # AI Spec (deliverable trung tâm - đã chốt CP4)
├── eval/                  # Golden set + kết quả kiểm thử
│   ├── golden-set.csv     # 24 test cases chuẩn hóa
│   ├── results.md         # Bảng kết quả chạy tự động (Pass rate 83.3%)
│   └── trace-log.json     # Log chi tiết từng request qua 9Router API
├── codebase/              # Source code prototype
│   ├── server.js          # Backend proxy API + tính thời lượng & blueprint
│   ├── index.html         # Giao diện SPA 3 tầng, Slide Blueprint, Modal Alert
│   ├── run-eval.js        # Script chạy tự động bộ 24 cases Golden Set
│   └── README.md          # Hướng dẫn chạy codebase
├── validation/            # (Bonus R6: +8 điểm) Feedback log từ user thật
│   └── README.md          # Feedback 4 willing users + changelog cải tiến
├── evidence/              # Bằng chứng khảo sát / mining
│   └── README.md          # 20 khảo sát (Chuẩn A) + 5 mining data (Chuẩn B)
├── demo-slides.pdf        # Slide thuyết trình (CP5)
└── .gitignore
```

## 🚀 Hướng dẫn chạy

### 1. Khởi động ứng dụng Prototype
```bash
# Di chuyển vào thư mục codebase và khởi chạy server
cd codebase
node server.js
```
Truy cập giao diện tại: **`http://localhost:3000`**

### 2. Chạy kiểm thử tự động Golden Set (24 cases)
```bash
node codebase/run-eval.js
```
Kết quả kiểm thử sẽ tự động cập nhật vào [`eval/results.md`](file:///c:/Users/PC/Desktop/hackathonAI/eval/results.md) và trace log tại [`eval/trace-log.json`](file:///c:/Users/PC/Desktop/hackathonAI/eval/trace-log.json).

## 📅 Tiến độ checkpoint

- [x] **CP1** (19:30 16/9) — Canvas + repo + willing user
- [x] **CP2** (21:00 16/9) — Luồng hoạt động bấm được (Mock Prototype 5 bước)
- [x] **CP3** (16:00 17/9) — Tích hợp AI thật qua 9Router + Kết quả kiểm thử Golden Set (83.3%)
- [x] **CP4** (21:00 17/9) — Chốt toàn diện `spec.md`, Slide Blueprint, Evidence (Chuẩn A/B), Validation (Bonus +8đ)
- [ ] **CP5** (13:00 18/9) — Slide PDF + video demo dự phòng 30s
- [ ] **CP6** (17:30 18/9) — Thuyết trình trước Ban giám khảo
