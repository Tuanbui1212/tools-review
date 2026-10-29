# Hệ thống thiết kế — "Studio làm phim"

> Trạng thái: **REVIEW** (D054). Mọi màn hình Web và App dùng chung phong cách này.

## Ý tưởng

Giao diện như **phòng dựng phim**: nền tối để hình ảnh nổi bật, ánh đèn cam–hồng như đèn trường quay, hoạ tiết dải phim và hạt nhiễu phim, chuyển động mượt nhưng không phô.

## Màu

| Tên | Giá trị | Dùng cho |
|---|---|---|
| `bg` | `#07070b` | Nền trang |
| `sider` | `#0a0a11` | Menu trái |
| `surface` | `#11111a` | Thẻ, ô nhập |
| `elevated` | `#181824` | Modal, dropdown |
| `text` / `muted` | `#ececf1` / `#8b8b9a` | Chữ chính / phụ |
| `accent` → `accent2` | `#ff6a2b` → `#ff2e7e` | Dải màu nhấn: nút chính, logo, mục đang chọn |
| `success` / `error` / `warning` / `info` | `#22c55e` / `#ef4444` / `#f59e0b` / `#38bdf8` | Trạng thái |

Màu quyền: **admin** hồng, **root** vàng hổ phách, **sub** xanh da trời — dùng cho nhãn quyền và ảnh đại diện.

Định nghĩa ở `client/shared/src/theme/tokens.ts` (theme Ant Design) và biến CSS `--crt-*` trong `global.css`. Đổi màu thì sửa **cả hai** chỗ.

## Chữ

- Font **Be Vietnam Pro** (Google Fonts), hiển thị tiếng Việt chuẩn. Không tải được thì dùng font hệ thống.
- Tiêu đề trang 26px đậm; tiêu đề màn đăng nhập 34–54px co giãn theo màn hình.
- Nhãn nhỏ (eyebrow): chữ in hoa, giãn chữ, màu `muted`.

## Thành phần dùng chung (`client/shared`)

| Thành phần | Nơi | Mô tả |
|---|---|---|
| `StudioThemeProvider` | `theme/` | Bọc ngoài cùng app: theme tối + CSS chung |
| `AppShell` | `ui/` | Khung: menu trái có logo, thanh trên mờ kính, nội dung có hiệu ứng chuyển trang |
| `PageHeader` | `ui/` | Tiêu đề trang có ô icon dải màu |
| `StatCard` | `ui/` | Thẻ số liệu |
| `BrandLogo`, `FilmStrip` | `ui/` | Logo bảng clapper, dải phim chạy |
| Icon (`ActivityIcon`, `UsersIcon`…) | `ui/icons.tsx` | SVG tự vẽ, nét 1.8, không cần thư viện icon |
| `AuthScreen` | `features/auth/` | Màn đăng nhập: spotlight, dải phim, giới thiệu pipeline |
| `UserAvatar`, `RoleTag`, `UserMenu` | `features/auth/` | Ảnh đại diện chữ cái, nhãn quyền phát sáng, menu tài khoản |
| `HealthStatus` | `features/system/` | Banner tổng + thẻ từng dịch vụ có chấm nhấp nháy |

Lớp CSS hay dùng: `crt-card` (thẻ kính mờ), `crt-card--hover` (nổi lên + phát sáng khi rê chuột), `crt-grid` (lưới thẻ tự co giãn), `crt-stagger` (các con hiện lần lượt), `crt-status--ok/bad/idle`, `crt-gradient-text`, `crt-muted`, `crt-eyebrow`.

## Chuyển động

| Hiệu ứng | Ở đâu |
|---|---|
| Hiện dần + trượt lên (0.45s) | Mỗi lần chuyển trang, các thẻ hiện lần lượt |
| Thẻ nổi lên + viền phát sáng | Rê chuột vào thẻ |
| Vệt sáng lướt qua | Rê chuột vào nút chính |
| Chấm trạng thái nhấp nháy | Trạng thái dịch vụ, user |
| Dải phim chạy, spotlight trôi, hạt nhiễu phim | Màn đăng nhập |
| Cuộn phim xoay chậm | Banner trạng thái hệ thống |
| Ánh sáng chạy | Khung chờ khi đang tải |

- Đường cong chung: `cubic-bezier(0.2, 0.8, 0.2, 1)`.
- Máy bật **giảm chuyển động** (`prefers-reduced-motion`) thì mọi hiệu ứng tự tắt.

## Quy tắc khi làm màn hình mới

1. Trang mới mở đầu bằng `PageHeader`, nội dung đặt trong `crt-card`.
2. Dùng component và lớp CSS sẵn có trước; thiếu thì thêm vào `shared` để Web và App cùng dùng.
3. Không dùng màu cứng trong component; dùng biến `--crt-*` hoặc theme.
4. Chữ trên giao diện bằng tiếng Việt.
