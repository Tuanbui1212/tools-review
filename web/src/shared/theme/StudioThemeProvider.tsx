import "./global.css";

import { App as AntApp, ConfigProvider } from "antd";
import viVN from "antd/locale/vi_VN";
import type { ReactNode } from "react";

import { studioTheme } from "./antdTheme";

/** Theme "Studio làm phim" dùng chung cho Web và App. */
export function StudioThemeProvider({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider locale={viVN} theme={studioTheme}>
      <AntApp>{children}</AntApp>
    </ConfigProvider>
  );
}
