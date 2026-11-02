import { Dropdown } from "antd";
import { useState } from "react";

import { EditIcon, KeyIcon, LogoutIcon } from "../../../ui/icons";
import { useAuth } from "../hooks/useAuth";
import { ChangePasswordModal } from "./ChangePasswordModal";
import { EditProfileModal } from "./EditProfileModal";
import { RoleTag } from "./RoleTag";
import { UserAvatar } from "./UserAvatar";

interface UserMenuProps {
  collapsed?: boolean;
}

export function UserMenu({ collapsed = false }: UserMenuProps) {
  const { user, logout } = useAuth();
  const [modal, setModal] = useState<"password" | "profile" | null>(null);

  if (!user) return null;

  return (
    <>
      <Dropdown
        trigger={["click"]}
        placement={collapsed ? "bottomRight" : "topCenter"}
        menu={{
          items: [
            {
              key: "who",
              disabled: true,
              label: (
                <div style={{ padding: "6px 4px" }}>
                  <div style={{ fontWeight: 700, color: "var(--crt-text)", fontSize: 13 }}>
                    {user.display_name || user.username}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--crt-text-muted)", marginTop: 2 }}>
                    @{user.username} • {user.email}
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
        {collapsed ? (
          <button
            type="button"
            className="crt-user-trigger"
            aria-label="Tài khoản"
            style={{
              padding: 6,
              borderRadius: "50%",
              border: "1px solid var(--crt-border-soft)",
              background: "rgba(255, 255, 255, 0.03)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto",
              transition: "all 0.2s ease",
            }}
            title={`${user.display_name || user.username} (${user.email})`}
          >
            <UserAvatar user={user} size="sm" />
          </button>
        ) : (
          <button
            type="button"
            className="crt-user-trigger"
            aria-label="Tài khoản"
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid var(--crt-border-soft)",
              background: "rgba(255, 255, 255, 0.03)",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
              <UserAvatar user={user} size="sm" />
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  textAlign: "left",
                  minWidth: 0,
                  flex: 1,
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--crt-text)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {user.display_name || user.username}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--crt-text-muted)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {user.email}
                </span>
              </div>
            </div>

            <div style={{ marginLeft: 6, flexShrink: 0 }}>
              <RoleTag role={user.system_role} />
            </div>
          </button>
        )}
      </Dropdown>

      <ChangePasswordModal open={modal === "password"} onClose={() => setModal(null)} />
      <EditProfileModal open={modal === "profile"} onClose={() => setModal(null)} />
    </>
  );
}
