import { Layout, Typography } from "antd";
import { Outlet } from "react-router-dom";

export function MainLayout() {
  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Layout.Header>
        <Typography.Title level={4} style={{ color: "#fff", margin: "16px 0" }}>
          Comic Review — App
        </Typography.Title>
      </Layout.Header>
      <Layout.Content style={{ padding: 24 }}>
        <Outlet />
      </Layout.Content>
    </Layout>
  );
}
