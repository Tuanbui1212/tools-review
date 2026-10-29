import type { SystemRole, User } from "@crt/shared";

// Bản sao quy tắc M01 spec 5.1 (main/app/services/user_policy.py) chỉ để ẩn / hiện nút.
// Quyền thật luôn do Main kiểm tra.

export function creatableRoles(actor: User): SystemRole[] {
  if (actor.system_role === "admin") return ["admin", "root", "sub"];
  if (actor.system_role === "root") return ["sub"];
  return [];
}

export function canManage(actor: User, target: User): boolean {
  if (actor.id === target.id) return false;
  if (actor.system_role === "admin") return true;
  return actor.system_role === "root" && target.system_role === "sub";
}
