import { Button, Tooltip } from "antd";
import type { ReactNode } from "react";

import { CpuIcon, DatabaseIcon, HardDriveIcon, RefreshIcon, ReelIcon, ZapIcon } from "../../../ui/icons";
import { useHealth } from "../hooks/useHealth";

const SERVICES: Record<string, { name: string; desc: string; icon: ReactNode }> = {
  database: { name: "PostgreSQL", desc: "Cơ sở dữ liệu chính", icon: <DatabaseIcon size={20} /> },
  redis: { name: "Redis", desc: "Hàng đợi task", icon: <ZapIcon size={20} /> },
  storage: { name: "Kho file", desc: "Ảnh, audio, video dùng chung", icon: <HardDriveIcon size={20} /> },
  worker: { name: "Worker server", desc: "Xử lý chạy nền", icon: <CpuIcon size={20} /> },
};

function formatTime(timestamp: number): string {
  return timestamp ? new Date(timestamp).toLocaleTimeString("vi-VN") : "—";
}

/** Tổng quan trạng thái Main và các dịch vụ; tự cập nhật mỗi 10 giây. */
export function HealthStatus() {
  const { data, isLoading, isError, isFetching, dataUpdatedAt, refetch } = useHealth();

  if (isLoading) {
    return (
      <div className="crt-grid">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="crt-skeleton" />
        ))}
      </div>
    );
  }

  const reachable = !isError && Boolean(data);
  const healthy = reachable && data?.status === "ok";
  const services = Object.entries(data?.services ?? {});
  const down = services.filter(([, ok]) => !ok).length;

  return (
    <>
      <section className={`crt-banner${healthy ? "" : " crt-banner--bad"}`}>
        <ReelIcon className="crt-banner__reel" size={220} strokeWidth={1} />
        <div>
          <div className="crt-eyebrow">Main · v{data?.version ?? "—"}</div>
          <h2>
            {!reachable
              ? "Không kết nối được tới Main"
              : healthy
                ? "Studio sẵn sàng hoạt động"
                : `${down} dịch vụ đang gặp sự cố`}
          </h2>
          <p>
            {!reachable
              ? "Kiểm tra Main đã chạy ở cổng 8000 chưa."
              : `Cập nhật lúc ${formatTime(dataUpdatedAt)} · tự làm mới mỗi 10 giây`}
          </p>
        </div>
        <Tooltip title="Kiểm tra lại ngay">
          <Button
            shape="circle"
            size="large"
            icon={<RefreshIcon size={18} />}
            loading={isFetching}
            onClick={() => void refetch()}
            aria-label="Kiểm tra lại"
          />
        </Tooltip>
      </section>

      {reachable && (
        <div className="crt-grid crt-stagger">
          {services.map(([key, ok]) => {
            const meta = SERVICES[key] ?? { name: key, desc: "", icon: <CpuIcon size={20} /> };
            return (
              <div key={key} className="crt-card crt-card--hover crt-service">
                <div className="crt-service__top">
                  <span className={`crt-stat__icon crt-tone--${ok ? "accent" : "danger"}`}>
                    {meta.icon}
                  </span>
                  <span className={`crt-status crt-status--${ok ? "ok" : "bad"}`}>
                    {ok ? "Hoạt động" : "Lỗi"}
                  </span>
                </div>
                <div>
                  <div className="crt-service__name">{meta.name}</div>
                  <div className="crt-service__desc">{meta.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
