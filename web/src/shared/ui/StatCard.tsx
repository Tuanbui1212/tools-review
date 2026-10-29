import type { ReactNode } from "react";

export type Tone = "accent" | "success" | "danger" | "info";

export function StatCard({
  icon,
  label,
  value,
  tone = "accent",
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  tone?: Tone;
}) {
  return (
    <div className="crt-card crt-card--hover crt-stat">
      <span className={`crt-stat__icon crt-tone--${tone}`}>{icon}</span>
      <div>
        <div className="crt-stat__value">{value}</div>
        <div className="crt-stat__label">{label}</div>
      </div>
    </div>
  );
}
