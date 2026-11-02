import { Button, Layout, Menu, Tooltip } from "antd";
import type { ItemType } from "antd/es/menu/interface";
import { type ReactNode, useEffect, useState } from "react";

import { BrandLogo } from "./BrandLogo";

export interface ShellMenuItem {
  key: string;
  label: string;
  icon: ReactNode;
}

interface AppShellProps {
  tagline: string;
  menu: ShellMenuItem[];
  selectedKey: string;
  onNavigate(key: string): void;
  /** Vùng thông tin người dùng ở đáy sidebar */
  sidebarUser?: (collapsed: boolean) => ReactNode;
  footer?: ReactNode;
  /** Đổi giá trị này để chạy lại hiệu ứng chuyển trang. */
  pageKey: string;
  children: ReactNode;
}

/** Khung chung của Web: menu trái hỗ trợ đóng/mở (collapsible), nội dung. */
export function AppShell({
  tagline,
  menu,
  selectedKey,
  onNavigate,
  sidebarUser,
  footer,
  pageKey,
  children,
}: AppShellProps) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("crt.sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("crt.sidebar_collapsed", String(next));
      } catch {
        // Bỏ qua nếu localStorage bị chặn
      }
      return next;
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleCollapsed();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const items: ItemType[] = menu.map(({ key, label, icon }) => ({ key, label, icon }));

  return (
    <Layout className="crt-shell">
      <Layout.Sider
        className="crt-sider"
        width={252}
        collapsedWidth={72}
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
      >
        {/* Phần đầu Sider: Brand Logo & Nút thu gọn / mở rộng menu đặt ngay trong Sider */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "space-between",
            padding: collapsed ? "16px 8px 14px" : "18px 16px 18px 20px",
            borderBottom: "1px solid var(--crt-border-soft)",
            marginBottom: 8,
            transition: "all 0.2s ease",
          }}
        >
          {collapsed ? (
            <Tooltip title="Mở rộng menu (Ctrl+B)" placement="right">
              <Button
                type="text"
                onClick={toggleCollapsed}
                style={{
                  width: 38,
                  height: 38,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 8,
                  color: "var(--crt-text)",
                  padding: 0,
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect width="18" height="18" x="3" y="3" rx="2" />
                  <path d="M9 3v18" />
                  <path d="m12 9 3 3-3 3" />
                </svg>
              </Button>
            </Tooltip>
          ) : (
            <>
              <BrandLogo tagline={tagline} />
              <Tooltip title="Thu gọn menu (Ctrl+B)" placement="bottom">
                <Button
                  type="text"
                  onClick={toggleCollapsed}
                  style={{
                    width: 32,
                    height: 32,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 6,
                    color: "var(--crt-text-muted)",
                    padding: 0,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--crt-text)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--crt-text-muted)")}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect width="18" height="18" x="3" y="3" rx="2" />
                    <path d="M9 3v18" />
                    <path d="m14 9-3 3 3 3" />
                  </svg>
                </Button>
              </Tooltip>
            </>
          )}
        </div>

        {!collapsed && <div className="crt-sider__label crt-eyebrow">Điều hướng</div>}

        <Menu
          className="crt-menu"
          theme="dark"
          mode="inline"
          inlineCollapsed={collapsed}
          items={items}
          selectedKeys={[selectedKey]}
          onClick={({ key }) => onNavigate(key)}
          style={{ flex: 1, borderRight: 0 }}
        />

        {/* Thông tin người dùng đăng nhập đặt ở đáy Sidebar */}
        {sidebarUser && (
          <div
            className="crt-sider__user"
            style={{
              padding: collapsed ? "12px 6px" : "12px 14px",
              borderTop: "1px solid var(--crt-border-soft)",
              marginTop: "auto",
              transition: "all 0.2s ease",
            }}
          >
            {sidebarUser(collapsed)}
          </div>
        )}

        {footer && !collapsed && <div className="crt-sider__footer">{footer}</div>}
      </Layout.Sider>

      <Layout>
        <Layout.Content className="crt-content">
          <div key={pageKey} className="crt-page">
            {children}
          </div>
        </Layout.Content>
      </Layout>
    </Layout>
  );
}
