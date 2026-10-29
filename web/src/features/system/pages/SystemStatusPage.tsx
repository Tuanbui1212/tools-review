import { ActivityIcon, HealthStatus, PageHeader } from "@crt/shared";

export function SystemStatusPage() {
  return (
    <>
      <PageHeader
        icon={<ActivityIcon size={24} />}
        title="Trạng thái hệ thống"
        subtitle="Tình trạng Main và các dịch vụ phía sau"
      />
      <HealthStatus />
    </>
  );
}
