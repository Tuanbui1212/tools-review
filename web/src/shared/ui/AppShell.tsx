import { Button, Layout, Menu, Tooltip } from "antd";
import type { ItemType } from "antd/es/menu/interface";
import { type ReactNode, useState } from "react";

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
  /** Góc phải thanh trên, ví dụ menu tài khoản. */
  headerExtra?: ReactNode;
  footer?: ReactNode;
  /** Đổi giá trị này để chạy lại hiệu ứng chuyển trang. */
  pageKey: string;
  children: ReactNode;
}

/** Khung chung của Web: menu trái hỗ trợ đóng/mở (collapsible), thanh trên, nội dung. */
export function AppShell({
  tagline,
  menu,
  selectedKey,
  onNavigate,
  headerExtra,
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

  const current = menu.find((item) => item.key === selectedKey);
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
        <div
          className="crt-sider__brand"
          style={{
            padding: collapsed ? "16px 8px" : undefined,
            textAlign: collapsed ? "center" : undefined,
            transition: "all 0.2s ease",
          }}
        >
          {collapsed ? (
            <Tooltip title="Comic Review Tool" placement="right">
              <span style={{ fontSize: 24, cursor: "pointer" }} onClick={toggleCollapsed}>
                🎬
              </span>
            </Tooltip>
          ) : (
            <BrandLogo tagline={tagline} />
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
        />
        {footer && !collapsed && <div className="crt-sider__footer">{footer}</div>}
      </Layout.Sider>

      <Layout>
        <header className="crt-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Tooltip title={collapsed ? "Mở rộng thanh menu (Ctrl+B)" : "Thu gọn thanh menu (Ctrl+B)"}>
              <Button
                type="text"
                onClick={toggleCollapsed}
                style={{
                  fontSize: 16,
                  width: 36,
                  height: 36,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 6,
                }}
              >
                {collapsed ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <line x1="9" y1="3" x2="9" y2="21" />
                    <path d="m14 9-3 3 3 3" />
                  </svg>
                )}
              </Button>
            </Tooltip>

            <div className="crt-header__crumb">
              Studio <span aria-hidden="true">/</span> <b>{current?.label}</b>
            </div>
          </div>
          {headerExtra}
        </header>

        <Layout.Content className="crt-content">
          <div key={pageKey} className="crt-page">
            {children}
          </div>
        </Layout.Content>
      </Layout>
    </Layout>
  );
}
