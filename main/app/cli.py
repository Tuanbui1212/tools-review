"""Lệnh quản trị cho Main.

python -m app.cli create-admin --username admin --email admin@example.com
python -m app.cli seed-dev        # tạo tài khoản mẫu, chỉ dùng khi phát triển
"""

import argparse
import getpass
import sys

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

    args = parser.parse_args(argv)
    return args.handler(args)


if __name__ == "__main__":
    sys.exit(main())
