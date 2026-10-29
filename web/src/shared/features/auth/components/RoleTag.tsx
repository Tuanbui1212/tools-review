import { ROLE_LABELS } from "../lib/roles";
import type { SystemRole } from "../types";

export function RoleTag({ role }: { role: SystemRole }) {
  return <span className={`crt-role crt-role--${role}`}>{ROLE_LABELS[role]}</span>;
}
