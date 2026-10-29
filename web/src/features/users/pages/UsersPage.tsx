import {
  LockIcon,
  PageHeader,
  PlusIcon,
  ROLE_LABELS,
  SearchIcon,
  StatCard,
  UserCheckIcon,
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

const DEFAULT_PAGE_SIZE = 20;

export function UsersPage() {
  const { user: actor } = useAuth();
  const { message } = App.useApp();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
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
    page_size: pageSize,
    system_role: role,
    status,
    q: debouncedQuery || undefined,
  });
  const stats = list.data?.stats;
  const setLocked = useSetUserLocked();

  if (!actor) return null;
  const roles = creatableRoles(actor);
  // Root chỉ thấy sub và chính mình (root), nên chỉ lọc được 2 quyền này.
  const filterRoles: SystemRole[] =
    actor.system_role === "admin" ? ["admin", "root", "sub"] : ["root", "sub"];
  const roleOptions = filterRoles.map((r) => ({ value: r, label: ROLE_LABELS[r] }));

  const changeFilter =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value);
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

      <div className="crt-grid crt-stagger" style={{ marginBottom: 20 }}>
        <StatCard icon={<UsersIcon size={20} />} label="Tổng user" value={stats?.total ?? "—"} />
        <StatCard
          icon={<UserCheckIcon size={20} />}
          label="Đang hoạt động"
          value={stats?.active ?? "—"}
          tone="success"
        />
        <StatCard
          icon={<LockIcon size={20} />}
          label="Đã khoá"
          value={stats?.locked ?? "—"}
          tone="danger"
        />
      </div>

      <section className="crt-card">
        <div className="crt-toolbar">
          <Input
            allowClear
            value={searchInput}
            prefix={<SearchIcon size={16} className="crt-muted" />}
            placeholder="Tìm username, tên, email…"
            style={{ width: 300 }}
            onChange={(event) => setSearchInput(event.target.value)}
          />
          <Select<SystemRole>
            allowClear
            placeholder="Tất cả quyền"
            style={{ width: 160 }}
            options={roleOptions}
            value={role}
            onChange={changeFilter(setRole)}
          />
          <Select<UserStatus>
            allowClear
            placeholder="Tất cả trạng thái"
            style={{ width: 180 }}
            options={[
              { value: "active", label: "Hoạt động" },
              { value: "locked", label: "Đã khoá" },
            ]}
            value={status}
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
          pagination={{
            current: page,
            pageSize,
            total: list.data?.total ?? 0,
            showSizeChanger: true,
            showTotal: (total) => `${total} user`,
            onChange: (nextPage, nextSize) => {
              setPage(nextSize === pageSize ? nextPage : 1);
              setPageSize(nextSize);
            },
          }}
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
