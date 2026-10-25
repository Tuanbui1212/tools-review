# Công nghệ giao diện (App + Web)

> Trạng thái: **APPROVED** — React + TypeScript + Electron (D018), làm dạng web local trước (D022).

## Công nghệ

| Phần | Công nghệ |
|---|---|
| Ngôn ngữ | TypeScript |
| Framework | React + Vite |
| Thư viện UI | Ant Design (mạnh về bảng, form, phù hợp quản lý) |
| Gọi API | TanStack Query |
| App desktop | Electron |
| Vẽ trên ảnh (panel, khung mặt) | Konva |
| Xem trước video / timeline | Tự dựng trên video HTML5 |

## Ý của bạn: App chạy như một web local

Đúng là hai cách gần như giống nhau, vì Electron bản chất là một trình duyệt đóng gói sẵn:

```
Cách 1 — Web local:   Trình duyệt ──► localhost:xxxx ──► Engine Python (máy người dùng)
Cách 2 — Electron:    Cửa sổ Electron ──► Engine Python (máy người dùng)
```

Cả hai cách đều dùng **cùng một code React** và **cùng một engine Python**. Khác nhau ở:

| | Web local | Electron |
|---|---|---|
| Độ phức tạp khi làm | Thấp hơn | Thêm phần đóng gói Electron |
| Cài đặt cho người dùng | Chạy engine rồi mở trình duyệt | Một file `.exe`, bấm là chạy |
| Chọn thư mục / file trên máy | Hạn chế (trình duyệt chặn) | Đầy đủ |
| Tự cập nhật, icon, cửa sổ riêng | Không có | Có |

## Đề xuất: làm theo 2 giai đoạn

1. **Giai đoạn đầu:** App chạy dạng **web local**. Engine Python vừa chạy pipeline vừa phục vụ giao diện React tại `localhost`. Làm nhanh, dễ debug, tập trung vào chất lượng pipeline.
2. **Khi pipeline ổn:** bọc giao diện đó bằng **Electron** để có file cài đặt `.exe`, chọn thư mục, tự cập nhật. Không phải viết lại giao diện.

Cách này giữ đúng D018, chỉ thay đổi thứ tự làm.

## Phân biệt 2 loại "server"

| | Engine local (máy người dùng) | Backend trung tâm (server) |
|---|---|---|
| Chạy ở | Mỗi máy cài App | Một server chung |
| Làm gì | Pipeline AI, render | DB, đăng nhập, phân quyền, file dùng chung, tiến độ |
| Ai dùng | Chỉ người dùng máy đó | App của mọi người + Web |
