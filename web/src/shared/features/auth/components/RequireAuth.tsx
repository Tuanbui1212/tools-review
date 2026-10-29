import { Spin } from "antd";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import type { SystemRole } from "../types";

/** Chặn trang cần đăng nhập; truyền `roles` để chỉ cho một số quyền vào. */
export function RequireAuth({ roles, children }: { roles?: SystemRole[]; children: ReactNode }) {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }
  if (status !== "authenticated" || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (roles && !roles.includes(user.system_role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
