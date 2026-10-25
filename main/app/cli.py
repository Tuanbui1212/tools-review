"""Lệnh quản trị cho Main.

python -m app.cli create-admin --username admin --email admin@example.com
"""

import argparse
import getpass
import sys

from pydantic import ValidationError

from app.core.dependencies import get_user_service
from app.core.errors import AppError
from app.db.session import SessionLocal
from app.schemas.user import UserCreate


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


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m app.cli")
    commands = parser.add_subparsers(dest="command", required=True)

    create_admin = commands.add_parser("create-admin", help="Tạo tài khoản admin")
    create_admin.add_argument("--username", required=True)
    create_admin.add_argument("--email", required=True)
    create_admin.add_argument("--display-name")
    create_admin.set_defaults(handler=_create_admin)

    args = parser.parse_args(argv)
    return args.handler(args)


if __name__ == "__main__":
    sys.exit(main())
