import { http, type User } from "@crt/shared";

import type { UserCreateInput, UserListParams, UserPageResponse, UserUpdateInput } from "../types";

export const usersApi = {
  list: (params: UserListParams) => http.get<UserPageResponse>("/v1/users", params),
  create: (input: UserCreateInput) => http.post<User>("/v1/users", input),
  update: (id: number, input: UserUpdateInput) => http.patch<User>(`/v1/users/${id}`, input),
  lock: (id: number) => http.post<User>(`/v1/users/${id}/lock`),
  unlock: (id: number) => http.post<User>(`/v1/users/${id}/unlock`),
  resetPassword: (id: number, newPassword: string) =>
    http.post<void>(`/v1/users/${id}/reset-password`, { new_password: newPassword }),
};
