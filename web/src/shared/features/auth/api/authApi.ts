import { http } from "../../../lib/http";
import type { Client, TokenPair, User } from "../types";

export const authApi = {
  login: (identifier: string, password: string, client: Client) =>
    http.post<TokenPair>("/v1/auth/login", { identifier, password, client }, { auth: false }),
  refresh: (refreshToken: string) =>
    http.post<TokenPair>("/v1/auth/refresh", { refresh_token: refreshToken }, { auth: false }),
  logout: (refreshToken: string) =>
    http.post<void>("/v1/auth/logout", { refresh_token: refreshToken }),
  me: () => http.get<User>("/v1/auth/me"),
  changePassword: (currentPassword: string, newPassword: string, client: Client) =>
    http.post<TokenPair>("/v1/auth/change-password", {
      current_password: currentPassword,
      new_password: newPassword,
      client,
    }),
  updateDisplayName: (userId: number, displayName: string) =>
    http.patch<User>(`/v1/users/${userId}`, { display_name: displayName }),
};
