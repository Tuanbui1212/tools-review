"""Lệnh quản trị cho Main.

python -m app.cli create-admin --username admin --email admin@example.com
python -m app.cli seed-dev        # tạo tài khoản mẫu, chỉ dùng khi phát triển
"""

import argparse
import getpass
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from pydantic import ValidationError

from app.core.config import get_settings
from app.core.dependencies import get_user_service
from app.core.errors import AppError
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserCreate

# Tài khoản mẫu để phát triển. Mật khẩu ghi công khai trong README, nên lệnh seed-dev
# từ chối chạy khi ENVIRONMENT=production.
DEV_ACCOUNTS = (
    ("admin", "password", "admin", "Quản trị"),
    ("root1", "password", "root", "Root Một"),
    ("sub1", "password", "sub", "Sub Một"),
    ("sub2", "password", "sub", "Sub Hai"),
)


def _create_admin(args: argparse.Namespace) -> int:
    password = getpass.getpass("Mật khẩu: ")
    if password != getpass.getpass("Nhập lại mật khẩu: "):
        print("Hai lần nhập mật khẩu không khớp.", file=sys.stderr)
        return 1
    try:
        data = UserCreate(
            username=args.username,
            email=args.email,
            password=password,
            display_name=args.display_name,
            system_role="admin",
        )
    except ValidationError as exc:
        print(f"Dữ liệu không hợp lệ:\n{exc}", file=sys.stderr)
        return 1

    with SessionLocal() as db:
        try:
            user = get_user_service(db).bootstrap_admin(data)
        except AppError as exc:
            print(exc.message, file=sys.stderr)
            return 1
    print(f"Đã tạo admin '{user.username}' (id={user.id}).")
    return 0


def _seed_dev(_: argparse.Namespace) -> int:
    if get_settings().environment == "production":
        print("Không được tạo tài khoản mẫu khi ENVIRONMENT=production.", file=sys.stderr)
        return 1

    with SessionLocal() as db:
        users = UserRepository(db)
        service = get_user_service(db)
        admin = None
        for username, password, role, display_name in DEV_ACCOUNTS:
            existing = users.get_by_username(username)
            if existing is not None:
                existing.password_hash = hash_password(password)
                existing.failed_login_count = 0
                existing.login_locked_until = None
                db.commit()
                print(f"- {username}: đã cập nhật mật khẩu '{password}'")
                admin = admin or (existing if existing.system_role == "admin" else None)
                continue
            data = UserCreate(
                username=username,
                email=f"{username}@example.com",
                password=password,
                display_name=display_name,
                system_role=role,
            )
            if role == "admin":
                admin = service.bootstrap_admin(data)
            elif admin is not None:
                service.create_user(admin, data)
            else:
                print(f"- {username}: bỏ qua vì chưa có admin để tạo", file=sys.stderr)
                continue
            print(f"- {username} ({role}): đã tạo, mật khẩu {password}")
    return 0


def _auth_google_drive(args: argparse.Namespace) -> int:
    client_id = getattr(args, "client_id", None) or input("Nhập Google Drive Client ID: ").strip()
    client_secret = getattr(args, "client_secret", None) or input("Nhập Google Drive Client Secret: ").strip()

    if not client_id or not client_secret:
        print("Lỗi: Client ID và Client Secret không được để trống.", file=sys.stderr)
        return 1

    try:
        from pathlib import Path

        from google_auth_oauthlib.flow import InstalledAppFlow

        client_type = "web" if getattr(args, "is_web", False) else "installed"
        client_config = {
            client_type: {
                "client_id": client_id,
                "client_secret": client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": ["http://localhost:8080/", "http://127.0.0.1:8080/"],
            }
        }
        flow = InstalledAppFlow.from_client_config(
            client_config,
            scopes=["https://www.googleapis.com/auth/drive"],
        )

        port = getattr(args, "port", None) or 8080
        flow.redirect_uri = f"http://localhost:{port}/"
        auth_url, _ = flow.authorization_url(prompt="consent", access_type="offline")

        print("\n" + "=" * 70, flush=True)
        print("ĐANG MỞ TRÌNH DUYỆT ĐĂNG NHẬP GOOGLE DRIVE 5TB...", flush=True)
        print("NẾU TRÌNH DUYỆT CHƯA TỰ MỞ, BẠN HÃY CLICK VÀO ĐƯỜNG LINK NÀY:", flush=True)
        print(auth_url, flush=True)
        print("=" * 70 + "\n", flush=True)

        import subprocess
        try:
            subprocess.Popen(f'cmd /c start "" "{auth_url}"', shell=True)
        except Exception:
            pass

        try:
            creds = flow.run_local_server(port=port, open_browser=False)
        except OSError:
            print("Port 8080 đang bận, thử với port ngẫu nhiên...", flush=True)
            flow.redirect_uri = None
            creds = flow.run_local_server(port=0, prompt="consent", access_type="offline")

        if not creds.refresh_token:
            print("Cảnh báo: Không nhận được refresh_token. Hãy chắc chắn bạn đã chọn 'Cho phép'.", file=sys.stderr, flush=True)
            return 1

        print("\n" + "=" * 60)
        print(" XÁC THỰC GOOGLE DRIVE THÀNH CÔNG!")
        print("=" * 60)
        print(f"GOOGLE_DRIVE_CLIENT_ID={client_id}")
        print(f"GOOGLE_DRIVE_CLIENT_SECRET={client_secret}")
        print(f"GOOGLE_DRIVE_REFRESH_TOKEN={creds.refresh_token}")
        print("STORAGE_BACKEND=google_drive")

        # Tự động tạo thư mục gốc ComicReviewTool_5TB
        from app.integrations.google_drive import GoogleDriveClient
        drive = GoogleDriveClient(client_id, client_secret, creds.refresh_token)
        root_id = drive.find_or_create_folder("ComicReviewTool_5TB")
        print(f"GOOGLE_DRIVE_ROOT_FOLDER_ID={root_id}")
        print("=" * 60)

        env_path = Path(".env")
        if env_path.exists():
            lines = env_path.read_text(encoding="utf-8").splitlines()
            config_map = {
                "STORAGE_BACKEND": "google_drive",
                "GOOGLE_DRIVE_CLIENT_ID": client_id,
                "GOOGLE_DRIVE_CLIENT_SECRET": client_secret,
                "GOOGLE_DRIVE_REFRESH_TOKEN": creds.refresh_token,
                "GOOGLE_DRIVE_ROOT_FOLDER_ID": root_id,
            }
            new_lines = []
            handled_keys = set()
            for line in lines:
                matched = False
                for k, v in config_map.items():
                    if line.startswith(f"{k}=") or line.startswith(f"#{k}="):
                        new_lines.append(f"{k}={v}")
                        handled_keys.add(k)
                        matched = True
                        break
                if not matched:
                    new_lines.append(line)
            for k, v in config_map.items():
                if k not in handled_keys:
                    new_lines.append(f"{k}={v}")

            env_path.write_text("\n".join(new_lines) + "\n", encoding="utf-8")
            print("ĐÃ TỰ ĐỘNG CẬP NHẬT FILE .ENV THÀNH CÔNG!")
        return 0
    except Exception as e:
        print(f"Lỗi trong quá trình xác thực: {e}", file=sys.stderr)
        return 1


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m app.cli")
    commands = parser.add_subparsers(dest="command", required=True)

    create_admin = commands.add_parser("create-admin", help="Tạo tài khoản admin")
    create_admin.add_argument("--username", required=True)
    create_admin.add_argument("--email", required=True)
    create_admin.add_argument("--display-name")
    create_admin.set_defaults(handler=_create_admin)

    seed_dev = commands.add_parser("seed-dev", help="Tạo tài khoản mẫu (chỉ khi phát triển)")
    seed_dev.set_defaults(handler=_seed_dev)

    auth_gdrive = commands.add_parser("auth-google-drive", help="Xác thực OAuth2 kết nối 5TB Google Drive")
    auth_gdrive.add_argument("--client-id", help="Google Cloud OAuth Client ID")
    auth_gdrive.add_argument("--client-secret", help="Google Cloud OAuth Client Secret")
    auth_gdrive.add_argument("--is-web", action="store_true", help="Nếu OAuth client tạo dưới dạng Web Application")
    auth_gdrive.set_defaults(handler=_auth_google_drive)

    args = parser.parse_args(argv)
    return args.handler(args)


if __name__ == "__main__":
    sys.exit(main())
