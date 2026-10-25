import { Alert, Descriptions, Spin, Tag } from "antd";

import { useHealth } from "../hooks/useHealth";

const SERVICE_LABELS: Record<string, string> = {
  database: "PostgreSQL",
  redis: "Redis",
  storage: "MinIO",
  worker: "Worker server",
};

export function HealthStatus() {
  const { data, isLoading, isError } = useHealth();

  if (isLoading) return <Spin />;
  if (isError || !data) {
    return <Alert type="error" message="Không kết nối được tới Main (localhost:8000)" />;
  }

  return (
    <Descriptions column={1} bordered size="small">
      <Descriptions.Item label="Main">
        <Tag color={data.status === "ok" ? "green" : "orange"}>{data.status}</Tag>v{data.version}
      </Descriptions.Item>
      {Object.entries(data.services).map(([name, ok]) => (
        <Descriptions.Item key={name} label={SERVICE_LABELS[name] ?? name}>
          <Tag color={ok ? "green" : "red"}>{ok ? "OK" : "Lỗi"}</Tag>
        </Descriptions.Item>
      ))}
    </Descriptions>
  );
}
