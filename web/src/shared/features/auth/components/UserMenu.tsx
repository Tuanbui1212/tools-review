import { Dropdown } from "antd";
import { useState } from "react";

import { EditIcon, KeyIcon, LogoutIcon } from "../../../ui/icons";
import { useAuth } from "../hooks/useAuth";
import { ChangePasswordModal } from "./ChangePasswordModal";
import { EditProfileModal } from "./EditProfileModal";
import { RoleTag } from "./RoleTag";
import { UserAvatar } from "./UserAvatar";

export function UserMenu() {
  const { user, logout } = useAuth();
  const [modal, setModal] = useState<"password" | "profile" | null>(null);

  if (!user) return null;

  return (
    <>
      <Dropdown
        trigger={["click"]}
        placement="bottomRight"
        menu={{
          items: [
            {
              key: "who",
              disabled: true,
              label: (
                <div style={{ padding: "4px 0" }}>
                  <div style={{ fontWeight: 600, color: "var(--crt-text)" }}>{user.username}</div>
                  <div className="crt-muted" style={{ fontSize: 12 }}>
                    {user.email}
                  </div>
                </div>
              ),
            },
            { type: "divider" },
            { key: "profile", label: "Sửa tên hiển thị", icon: <EditIcon size={16} /> },
            { key: "password", label: "Đổi mật khẩu", icon: <KeyIcon size={16} /> },
            { type: "divider" },
            { key: "logout", label: "Đăng xuất", icon: <LogoutIcon size={16} />, danger: true },
          ],
          onClick: ({ key }) => {
            if (key === "logout") void logout();
            else if (key === "password" || key === "profile") setModal(key);
          },
        }}
      >
        <button type="button" className="crt-user-trigger" aria-label="Tài khoản">
          <UserAvatar user={user} size="sm" />
          <span className="crt-user-trigger__name">{user.display_name || user.username}</span>
          <RoleTag role={user.system_role} />
        </button>
      </Dropdown>
      <ChangePasswordModal open={modal === "password"} onClose={() => setModal(null)} />
      <EditProfileModal open={modal === "profile"} onClose={() => setModal(null)} />
    </>
  );
}
