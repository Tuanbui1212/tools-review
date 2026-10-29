export type SystemRole = "admin" | "root" | "sub";
export type UserStatus = "active" | "locked";
/** Mỗi loại client có 1 phiên riêng; Web và App không đá nhau (D053). */
export type Client = "web" | "app";

export interface User {
  id: number;
  email: string;
  username: string;
  display_name: string | null;
  system_role: SystemRole;
  status: UserStatus;
  created_by: number | null;
  last_login_at: string | null;
  created_at: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  expires_in: number;
}
