import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { usersApi } from "../api/usersApi";
import type { UserCreateInput, UserListParams, UserUpdateInput } from "../types";

const USERS_KEY = ["users"] as const;

export function useUserList(params: UserListParams) {
  return useQuery({
    queryKey: [...USERS_KEY, params],
    queryFn: () => usersApi.list(params),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });
}

function useInvalidateUsers() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: USERS_KEY });
}

export function useCreateUser() {
  const onSuccess = useInvalidateUsers();
  return useMutation({ mutationFn: (input: UserCreateInput) => usersApi.create(input), onSuccess });
}

export function useUpdateUser() {
  const onSuccess = useInvalidateUsers();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UserUpdateInput }) =>
      usersApi.update(id, input),
    onSuccess,
  });
}

export function useSetUserLocked() {
  const onSuccess = useInvalidateUsers();
  return useMutation({
    mutationFn: ({ id, locked }: { id: number; locked: boolean }) =>
      locked ? usersApi.lock(id) : usersApi.unlock(id),
    onSuccess,
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: ({ id, newPassword }: { id: number; newPassword: string }) =>
      usersApi.resetPassword(id, newPassword),
  });
}
