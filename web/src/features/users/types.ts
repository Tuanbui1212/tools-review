import type { SystemRole, User, UserStatus } from "@crt/shared";

export type UserStats = {
  total: number;
  active: number;
  locked: number;
};

export type UserPageResponse = {
  items: User[];
  page: number;
  page_size: number;
  total: number;
  stats: UserStats;
};

export type UserListParams = {
  page: number;
  page_size: number;
  system_role?: SystemRole;
  status?: UserStatus;
  q?: string;
};

export type UserCreateInput = {
  username: string;
  email: string;
  password: string;
  display_name?: string;
  system_role: SystemRole;
};

export type UserUpdateInput = {
  email?: string;
  display_name?: string;
};

