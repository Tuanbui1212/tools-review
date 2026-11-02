import {
  PageHeader,
  PlusIcon,
  ROLE_LABELS,
  SearchIcon,
  UsersIcon,
  errorMessage,
  useAuth,
  useDebounce,
  type SystemRole,
  type User,
  type UserStatus,
} from "@crt/shared";
import { Alert, App, Button, Input, Select } from "antd";
import { useEffect, useState } from "react";

import { ResetPasswordModal } from "../components/ResetPasswordModal";
import { UserFormModal } from "../components/UserFormModal";
import { UserTable } from "../components/UserTable";
import { useSetUserLocked, useUserList } from "../hooks/useUsers";
import { creatableRoles } from "../lib/permissions";

const PAGE_SIZE = 24;

export function UsersPage() {
  const { user: actor } = useAuth();
  const { message } = App.useApp();
  const [page, setPage] = useState(1);
  const [role, setRole] = useState<SystemRole>();
  const [status, setStatus] = useState<UserStatus>();
  const [searchInput, setSearchInput] = useState("");
  const debouncedQuery = useDebounce(searchInput.trim(), 350);
  const [formUser, setFormUser] = useState<User | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [resetUser, setResetUser] = useState<User | null>(null);

  // Khi thay đổi từ khoá tìm kiếm thì tự động chuyển về trang 1
  useEffect(() => {
    setPage(1);
  }, [debouncedQuery]);

  const list = useUserList({
    page,
    page_size: PAGE_SIZE,
    system_role: role,
    status,
    q: debouncedQuery || undefined,
  });

  // Tự động lùi trang nếu số trang tối đa giảm xuống (ví dụ xoá/khoá user ở trang cuối)
  useEffect(() => {
    const total = list.data?.total ?? 0;
    if (total > 0) {
      const maxPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
      if (page > maxPage) {
        setPage(maxPage);
      }
    } else if (page > 1) {
      setPage(1);
    }
  }, [list.data?.total, page]);

  const setLocked = useSetUserLocked();

  if (!actor) return null;
  const roles = creatableRoles(actor);
  const filterRoles: SystemRole[] =
    actor.system_role === "admin" ? ["admin", "root", "sub"] : ["root", "sub"];
  const roleOptions = [
    { value: "", label: "Tất cả vai trò" },
    ...filterRoles.map((r) => ({ value: r, label: ROLE_LABELS[r] })),
  ];

  const changeFilter =
    <T,>(setter: (value: T | undefined) => void) =>
    (value: T | null | "") => {
      setter(value ? (value as T) : undefined);
      setPage(1);
    };

  const handleSetLocked = async (user: User, locked: boolean) => {
    try {
      await setLocked.mutateAsync({ id: user.id, locked });
      message.success(locked ? `Đã khoá ${user.username}` : `Đã mở khoá ${user.username}`);
    } catch (caught) {
      message.error(errorMessage(caught));
    }
  };

  return (
    <>
      <PageHeader
        icon={<UsersIcon size={24} />}
        title="Quản lý user"
        subtitle={
          actor.system_role === "admin"
            ? "Toàn bộ tài khoản trong hệ thống"
            : "Các tài khoản sub và tài khoản của bạn"
        }
        extra={
          roles.length > 0 && (
            <Button
              type="primary"
              size="large"
              icon={<PlusIcon size={18} />}
              onClick={() => {
                setFormUser(null);
                setFormOpen(true);
              }}
            >
              Tạo user
            </Button>
          )
        }
      />

      <section className="crt-card" style={{ marginTop: 16 }}>
        <div className="crt-toolbar">
          <Input
            allowClear
            value={searchInput}
            prefix={<SearchIcon size={16} className="crt-muted" />}
            placeholder="Tìm username, tên, email…"
            style={{ width: 300 }}
            onChange={(event) => setSearchInput(event.target.value)}
          />
          <Select
            allowClear
            style={{ width: 160 }}
            options={roleOptions}
            value={role ?? ""}
            onChange={changeFilter(setRole)}
          />
          <Select
            allowClear
            style={{ width: 180 }}
            options={[
              { value: "", label: "Tất cả trạng thái" },
              { value: "active", label: "Hoạt động" },
              { value: "locked", label: "Đã khoá" },
            ]}
            value={status ?? ""}
            onChange={changeFilter(setStatus)}
          />
        </div>

        {list.isError && (
          <Alert
            type="error"
            showIcon
            message={errorMessage(list.error)}
            style={{ margin: 16 }}
          />
        )}

        <UserTable
          actor={actor}
          users={list.data?.items ?? []}
          loading={list.isFetching}
          pagination={
            (list.data?.total ?? 0) > PAGE_SIZE
              ? {
                  current: page,
                  pageSize: PAGE_SIZE,
                  total: list.data?.total ?? 0,
                  showSizeChanger: false,
                  hideOnSinglePage: true,
                  showTotal: (total) => `Tổng ${total} user`,
                  onChange: (nextPage) => {
                    setPage(nextPage);
                  },
                }
              : false
          }
          onEdit={(user) => {
            setFormUser(user);
            setFormOpen(true);
          }}
          onResetPassword={setResetUser}
          onSetLocked={handleSetLocked}
        />
      </section>

      <UserFormModal
        open={formOpen}
        user={formUser}
        creatableRoles={roles}
        onClose={() => setFormOpen(false)}
      />
      <ResetPasswordModal user={resetUser} onClose={() => setResetUser(null)} />
    </>
  );
}
