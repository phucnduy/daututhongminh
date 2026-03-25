# Đầu Tư Thông Minh Group – Website Báo Cáo

## Cấu trúc thư mục

```
dtdm-website/
├── index.html     ← File website chính
├── _headers       ← Cấu hình bảo mật Cloudflare
└── README.md      ← File này
```

---

## Cách thêm báo cáo mới

Mở file `index.html`, tìm đến mảng `const REPORTS = [...]`
(khoảng dòng 280), thêm một object theo mẫu:

```js
{
  title: "Báo cáo Thị trường – Phiên DD/MM/YYYY",
  type: "market",         // "market" hoặc "stock"
  date: "YYYY-MM-DD",
  desc: "Mô tả ngắn về nội dung báo cáo.",
  driveId: "ID_FILE_GOOGLE_DRIVE"
}
```

Với báo cáo cổ phiếu, thêm trường `ticker`:
```js
{
  title: "Phân tích Cổ phiếu VCB – Khuyến nghị MUA",
  type: "stock",
  date: "2025-03-25",
  desc: "...",
  ticker: "VCB",
  driveId: "ID_FILE_GOOGLE_DRIVE"
}
```

---

## Cách lấy Drive ID từ Google Drive

1. Upload file PDF lên Google Drive
2. Chuột phải → **Share** → đổi quyền thành **"Anyone with the link"** → **Viewer**
3. Copy link, ví dụ:
   ```
   https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/view
   ```
4. Lấy phần ID (giữa `/d/` và `/view`):
   ```
   1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms
   ```
5. Dán vào `driveId` trong REPORTS

---

## Deploy lên Cloudflare Pages

Xem hướng dẫn đầy đủ trong phần **Bước 2** (Claude đã cung cấp riêng).

---

## Lưu ý kỹ thuật

- Cơ chế "chỉ xem, không tải": Google Drive Preview URL ẩn nút download
  với người không phải chủ file. Đây là giới hạn tốt nhất có thể làm được
  với giải pháp miễn phí.
- Chuột phải, Ctrl+S, Ctrl+U, F12 đều bị chặn bằng JavaScript.
- File `_headers` thêm các HTTP security header chuẩn của Cloudflare.
