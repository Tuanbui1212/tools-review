import { HealthStatus } from "@crt/shared";
import { Card } from "antd";

export function ConnectionPage() {
  return (
    <Card title="Kết nối tới Main" style={{ maxWidth: 480 }}>
      <HealthStatus />
    </Card>
  );
}
