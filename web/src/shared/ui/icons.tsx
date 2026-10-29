import type { ReactNode, SVGProps } from "react";

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  size?: number;
}

function makeIcon(name: string, paths: ReactNode) {
  function Icon({ size = 18, strokeWidth = 1.8, ...props }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
        {...props}
      >
        {paths}
      </svg>
    );
  }
  Icon.displayName = name;
  return Icon;
}

export const ClapperIcon = makeIcon(
  "ClapperIcon",
  <>
    <path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z" />
    <path d="m6.2 5.3 3.1 3.9" />
    <path d="m12.4 3.4 3.1 4" />
    <path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
  </>,
);

export const FilmIcon = makeIcon(
  "FilmIcon",
  <>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M7 3v18M17 3v18M3 7.5h4M3 12h18M3 16.5h4M17 7.5h4M17 16.5h4" />
  </>,
);

export const ReelIcon = makeIcon(
  "ReelIcon",
  <>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="12" cy="6.5" r="1.6" />
    <circle cx="12" cy="17.5" r="1.6" />
    <circle cx="6.5" cy="12" r="1.6" />
    <circle cx="17.5" cy="12" r="1.6" />
  </>,
);

export const ActivityIcon = makeIcon("ActivityIcon", <path d="M22 12h-4l-3 9L9 3l-3 9H2" />);

export const UsersIcon = makeIcon(
  "UsersIcon",
  <>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </>,
);

export const UserCheckIcon = makeIcon(
  "UserCheckIcon",
  <>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="m16 11 2 2 4-4" />
  </>,
);

export const LogoutIcon = makeIcon(
  "LogoutIcon",
  <>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5M21 12H9" />
  </>,
);

export const KeyIcon = makeIcon(
  "KeyIcon",
  <>
    <circle cx="7.5" cy="15.5" r="5.5" />
    <path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3" />
  </>,
);

export const EditIcon = makeIcon(
  "EditIcon",
  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />,
);

export const LockIcon = makeIcon(
  "LockIcon",
  <>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </>,
);

export const UnlockIcon = makeIcon(
  "UnlockIcon",
  <>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 9.9-1" />
  </>,
);

export const DatabaseIcon = makeIcon(
  "DatabaseIcon",
  <>
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5v14a9 3 0 0 0 18 0V5M3 12a9 3 0 0 0 18 0" />
  </>,
);

export const ZapIcon = makeIcon("ZapIcon", <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />);

export const HardDriveIcon = makeIcon(
  "HardDriveIcon",
  <>
    <path d="M22 12H2" />
    <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    <path d="M6 16h.01M10 16h.01" />
  </>,
);

export const CpuIcon = makeIcon(
  "CpuIcon",
  <>
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <rect x="9" y="9" width="6" height="6" />
    <path d="M15 2v2M15 20v2M2 15h2M2 9h2M20 15h2M20 9h2M9 2v2M9 20v2" />
  </>,
);

export const ServerIcon = makeIcon(
  "ServerIcon",
  <>
    <rect x="2" y="2" width="20" height="8" rx="2" />
    <rect x="2" y="14" width="20" height="8" rx="2" />
    <path d="M6 6h.01M6 18h.01" />
  </>,
);

export const PlusIcon = makeIcon("PlusIcon", <path d="M5 12h14M12 5v14" />);

export const SearchIcon = makeIcon(
  "SearchIcon",
  <>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </>,
);

export const RefreshIcon = makeIcon(
  "RefreshIcon",
  <>
    <path d="M21 12a9 9 0 0 0-15-6.7L3 8" />
    <path d="M3 3v5h5" />
    <path d="M3 12a9 9 0 0 0 15 6.7l3-2.7" />
    <path d="M21 21v-5h-5" />
  </>,
);

export const ScanIcon = makeIcon(
  "ScanIcon",
  <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10" />,
);

export const ScriptIcon = makeIcon(
  "ScriptIcon",
  <>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6M16 13H8M16 17H8" />
  </>,
);

export const MicIcon = makeIcon(
  "MicIcon",
  <>
    <rect x="9" y="2" width="6" height="12" rx="3" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3" />
  </>,
);

export const ShieldIcon = makeIcon(
  "ShieldIcon",
  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
);

export const PlugIcon = makeIcon(
  "PlugIcon",
  <>
    <path d="M12 22v-5M9 8V2M15 8V2" />
    <path d="M18 8v5a6 6 0 0 1-12 0V8z" />
  </>,
);

export const BookOpenIcon = makeIcon(
  "BookOpenIcon",
  <>
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </>,
);

export const FolderIcon = makeIcon(
  "FolderIcon",
  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />,
);

export const ArchiveIcon = makeIcon(
  "ArchiveIcon",
  <>
    <rect x="2" y="3" width="20" height="5" rx="1" />
    <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8M10 12h4" />
  </>,
);

export const MailIcon = makeIcon(
  "MailIcon",
  <>
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </>,
);

