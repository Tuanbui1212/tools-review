import type { ReactNode } from "react";

export function PageHeader({
  icon,
  title,
  subtitle,
  extra,
}: {
  icon: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  extra?: ReactNode;
}) {
  return (
    <header className="crt-page-header">
      <div className="crt-page-header__main">
        <span className="crt-page-header__icon">{icon}</span>
        <div>
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      {extra}
    </header>
  );
}
