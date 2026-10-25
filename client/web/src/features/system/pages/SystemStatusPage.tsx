import { HealthStatus } from "@crt/shared";
import { Card } from "antd";

export function SystemStatusPage() {
  return (
    <Card title="Trạng thái hệ thống" style={{ maxWidth: 480 }}>
      <HealthStatus />
    </Card>
  );
}
