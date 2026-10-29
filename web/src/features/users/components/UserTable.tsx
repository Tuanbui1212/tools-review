import {
  EditIcon,
  KeyIcon,
  LockIcon,
  RoleTag,
  UnlockIcon,
  UserAvatar,
  type User,
} from "@crt/shared";
import { Button, Popconfirm, Space, Table, Tooltip } from "antd";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";

import { canManage } from "../lib/permissions";

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleString("vi-VN") : "—";
}

interface UserTableProps {
  actor: User;
  users: User[];
  loading: boolean;
  pagination: TablePaginationConfig;
  onEdit(user: User): void;
  onResetPassword(user: User): void;
  onSetLocked(user: User, locked: boolean): void;
}

export function UserTable({
  actor,
  users,
  loading,
  pagination,
  onEdit,
  onResetPassword,
  onSetLocked,
}: UserTableProps) {
  const columns: ColumnsType<User> = [
    {
      title: "Thành viên",
      key: "user",
      render: (_, user) => (
        <div className="crt-user-cell">
          <UserAvatar user={user} />
          <div>
            <div className="crt-user-cell__name">
              {user.display_name || user.username}
              {user.id === actor.id && <span className="crt-you">Bạn</span>}
            </div>
            <div className="crt-user-cell__meta">
              @{user.username} · {user.email}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Quyền",
      dataIndex: "system_role",
      render: (_, user) => <RoleTag role={user.system_role} />,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      render: (_, user) =>
        user.status === "active" ? (
          <span className="crt-status crt-status--ok">Hoạt động</span>
        ) : (
          <span className="crt-status crt-status--bad">Đã khoá</span>
        ),
    },
    {
      title: "Đăng nhập cuối",
      dataIndex: "last_login_at",
      render: (value: string | null) => <span className="crt-muted">{formatDate(value)}</span>,
    },
    {
      title: "Ngày tạo",
      dataIndex: "created_at",
      render: (value: string) => <span className="crt-muted">{formatDate(value)}</span>,
    },
    {
      title: "",
      key: "actions",
      align: "right",
      render: (_, user) =>
        canManage(actor, user) && (
          <Space size={4}>
            <Tooltip title="Sửa thông tin">
              <Button type="text" icon={<EditIcon size={16} />} onClick={() => onEdit(user)} />
            </Tooltip>
            <Tooltip title="Đặt lại mật khẩu">
              <Button
                type="text"
                icon={<KeyIcon size={16} />}
                onClick={() => onResetPassword(user)}
              />
            </Tooltip>
            {user.status === "active" ? (
              <Popconfirm
                title={`Khoá tài khoản ${user.username}?`}
                description="User sẽ bị đăng xuất ở mọi thiết bị."
                okText="Khoá"
                cancelText="Huỷ"
                okButtonProps={{ danger: true }}
                onConfirm={() => onSetLocked(user, true)}
              >
                <Tooltip title="Khoá">
                  <Button type="text" danger icon={<LockIcon size={16} />} />
                </Tooltip>
              </Popconfirm>
            ) : (
              <Popconfirm
                title={`Mở khoá tài khoản ${user.username}?`}
                okText="Mở khoá"
                cancelText="Huỷ"
                onConfirm={() => onSetLocked(user, false)}
              >
                <Tooltip title="Mở khoá">
                  <Button type="text" icon={<UnlockIcon size={16} />} />
                </Tooltip>
              </Popconfirm>
            )}
          </Space>
        ),
    },
  ];

  return (
    <Table<User>
      className="crt-table"
      rowKey="id"
      columns={columns}
      dataSource={users}
      loading={loading}
      pagination={pagination}
      scroll={{ x: 900 }}
    />
  );
}
