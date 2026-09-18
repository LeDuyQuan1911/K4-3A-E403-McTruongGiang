# Mini Hackathon AI — Batch 04 · Lớp 3A

**SPEC → Prototype → Demo.** Đây không phải cuộc thi code — đây là cuộc thi **tư duy sản phẩm AI**.

## 👥 Thành viên nhóm & Phân công vai trò

**Lớp:** 3A · **Phòng:** E403 · **Cụm:** ____ · **Track:** C3 — Research-to-Script (Lesson Studio)

| Họ và Tên | Mã Học Viên | Vai trò chính | Phần việc đảm nhiệm trong dự án |
|---|---|---|---|
| Lê Duy Quân | `2A202602731` | Nhóm trưởng | Form chương trình, prototype (RAG + UI), eval |
| Bùi Trọng Trịnh | `2A202602861` | Dev | Prototype (RAG pipeline + UI), prompt engineering |
| Nguyễn Lê Phúc Thắng | `2A202602638` | Dev + Evidence | Code, viết khảo sát, spec, golden set |
| Vũ Minh Hoàng | `2A202602371` | Khảo sát + Validation | Khảo sát Studio team, user test, demo |

## 📁 Cấu trúc repo

```
├── README.md              # Thông tin nhóm + phân công
├── spec.md                # AI Spec (deliverable trung tâm)
├── eval/                  # Golden set + kết quả kiểm thử
│   ├── golden-set.csv     # 50 test case đã chốt
│   ├── golden-results.csv # Bảng Pass/Fail tái lập cho từng case (fixture)
│   └── results.md         # Bảng kết quả các lượt chạy
├── codebase/              # Source code prototype
│   └── README.md          # Hướng dẫn chạy prototype
├── validation/            # (Bonus) Feedback log từ user thử
│   └── README.md          # Log feedback + changelog
├── evidence/              # Bằng chứng khảo sát / mining
│   └── README.md          # Log khảo sát, quote nguyên văn
├── demo-slides.pdf        # Slide thuyết trình (CP5)
└── .gitignore
```

## 🚀 Hướng dẫn chạy

Yêu cầu Node.js ≥22.13. Chạy tại thư mục gốc:

```powershell
npm install
npm start
```

Mở [http://127.0.0.1:3000](http://127.0.0.1:3000). Bộ thử minh họa không cần khóa.

Để dùng DeepSeek thật, sao chép `.env.example` thành `.env` nếu chưa có, đặt `AI_PROVIDER=deepseek` và điền `DEEPSEEK_API_KEY`. Tìm web tự động khuyến nghị `SEARCH_PROVIDER=exa` + `EXA_API_KEY`; nếu chưa có, chọn `SEARCH_PROVIDER=manual` rồi thêm URL nguồn. Có thể đổi riêng model viết và dịch vụ tìm nguồn qua cấu hình, không sửa mã nguồn. Sau khi đổi `.env`, khởi động lại máy chủ.

Xem [hướng dẫn chạy, đổi API và giới hạn](codebase/README.md). `npm run doctor` kiểm tra cấu hình; `npm test` kiểm tra tự động. Chưa có kết quả đánh giá AI thật khi chưa cấu hình khóa.

## 📅 Tiến độ checkpoint

- [ ] **CP1** (19:30 16/9) — Canvas + repo + willing user
- [ ] **CP2** (21:00 16/9) — Luồng hoạt động bấm được
- [ ] **CP3** (16:00 17/9) — Video 30s AI chạy thật + số đo
- [x] **CP4** (21:00 17/9) — Chốt spec, evidence ẩn danh, golden set 50 ca và kết quả regression
- [ ] **CP5** (13:00 18/9) — Slide PDF + video demo dự phòng
- [ ] **CP6** (17:30 18/9) — Thuyết trình
