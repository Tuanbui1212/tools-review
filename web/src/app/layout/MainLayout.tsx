import {
  ActivityIcon,
  AppShell,
  FolderIcon,
  UserMenu,
  UsersIcon,
  useAuth,
  type ShellMenuItem,
} from "@crt/shared";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

export function MainLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const menu: ShellMenuItem[] = [
    { key: "/", label: "Trạng thái hệ thống", icon: <ActivityIcon /> },
    { key: "/projects", label: "Dự án", icon: <FolderIcon /> },
  ];
  if (user && (user.system_role === "admin" || user.system_role === "root")) {
    menu.push({ key: "/users", label: "Quản lý user", icon: <UsersIcon /> });
  }

  let selected = "/";
  if (pathname.startsWith("/projects")) {
    selected = "/projects";
  } else if (pathname.startsWith("/users")) {
    selected = "/users";
  }

  return (
    <AppShell
      tagline="WEB QUẢN LÝ"
      menu={menu}
      selectedKey={selected}
      onNavigate={(key) => navigate(key)}
      headerExtra={<UserMenu />}
      footer="M01 · M02 · Nền tảng & Dự án"
      pageKey={pathname}
    >
      <Outlet />
    </AppShell>
  );
}
