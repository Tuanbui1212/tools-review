import { theme, type ThemeConfig } from "antd";

import { COLORS, FONT_FAMILY } from "./tokens";

export const studioTheme: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: COLORS.accent,
    colorInfo: COLORS.info,
    colorSuccess: COLORS.success,
    colorWarning: COLORS.warning,
    colorError: COLORS.error,
    colorBgBase: COLORS.bg,
    colorBgContainer: COLORS.surface,
    colorBgElevated: COLORS.elevated,
    colorBorder: COLORS.border,
    colorBorderSecondary: COLORS.borderSoft,
    colorText: COLORS.text,
    colorTextSecondary: COLORS.muted,
    fontFamily: FONT_FAMILY,
    borderRadius: 10,
    borderRadiusLG: 16,
    controlHeight: 38,
    controlHeightLG: 46,
    wireframe: false,
  },
  components: {
    Layout: { bodyBg: "transparent", headerBg: "transparent", siderBg: COLORS.sider },
    Menu: {
      darkItemBg: "transparent",
      darkSubMenuItemBg: "transparent",
      darkItemColor: COLORS.muted,
      darkItemHoverColor: COLORS.text,
      darkItemSelectedBg: "rgba(255, 106, 43, 0.14)",
      darkItemSelectedColor: "#ffffff",
      itemBorderRadius: 10,
      itemHeight: 44,
      itemMarginInline: 12,
    },
    Table: {
      headerBg: "rgba(255, 255, 255, 0.02)",
      headerColor: COLORS.muted,
      rowHoverBg: "rgba(255, 106, 43, 0.06)",
      borderColor: COLORS.borderSoft,
    },
    Modal: { contentBg: COLORS.elevated, headerBg: COLORS.elevated },
    Input: { activeShadow: "0 0 0 3px rgba(255, 106, 43, 0.18)" },
    Select: { optionSelectedBg: "rgba(255, 106, 43, 0.16)" },
    Button: { fontWeight: 600, primaryShadow: "0 8px 24px rgba(255, 46, 126, 0.28)" },
    Dropdown: { controlItemBgHover: "rgba(255, 255, 255, 0.05)" },
  },
};
