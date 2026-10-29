import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { projectsApi } from "../api/projectsApi";
import type {
  ProjectCreateInput,
  ProjectListParams,
  ProjectUpdateInput,
} from "../types";

const PROJECTS_KEY = ["projects"] as const;
const INVITATIONS_KEY = ["invitations"] as const;

export function useProjectList(params: ProjectListParams) {
  return useQuery({
    queryKey: [...PROJECTS_KEY, params],
    queryFn: () => projectsApi.list(params),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });
}

export function useProject(id: number) {
  return useQuery({
    queryKey: [...PROJECTS_KEY, id],
    queryFn: () => projectsApi.get(id),
    staleTime: 10_000,
  });
}

function useInvalidateProjects() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: PROJECTS_KEY });
  };
}

export function useCreateProject() {
  const onSuccess = useInvalidateProjects();
  return useMutation({
    mutationFn: (input: ProjectCreateInput) => projectsApi.create(input),
    onSuccess,
  });
}

export function useUpdateProject() {
  const onSuccess = useInvalidateProjects();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: ProjectUpdateInput }) =>
      projectsApi.update(id, input),
    onSuccess,
  });
}

export function useDeleteProject() {
  const onSuccess = useInvalidateProjects();
  return useMutation({
    mutationFn: (id: number) => projectsApi.delete(id),
    onSuccess,
  });
}

export function useProjectMembers(projectId: number) {
  return useQuery({
    queryKey: [...PROJECTS_KEY, projectId, "members"],
    queryFn: () => projectsApi.listMembers(projectId),
    staleTime: 10_000,
  });
}

export function useInviteMember(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (identifier: string) => projectsApi.inviteMember(projectId, identifier),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...PROJECTS_KEY, projectId, "members"] });
      queryClient.invalidateQueries({ queryKey: [...PROJECTS_KEY, projectId, "candidates"] });
    },
  });
}

export function useRemoveMember(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => projectsApi.removeMember(projectId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...PROJECTS_KEY, projectId, "members"] });
    },
  });
}

export function useMyInvitations() {
  return useQuery({
    queryKey: INVITATIONS_KEY,
    queryFn: () => projectsApi.listMyInvitations(),
    staleTime: 15_000,
  });
}

export function useRespondInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, accept }: { id: number; accept: boolean }) =>
      projectsApi.respondInvitation(id, accept),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVITATIONS_KEY });
      queryClient.invalidateQueries({ queryKey: PROJECTS_KEY });
    },
  });
}

export function useCandidateUsers(projectId: number, query: string) {
  return useInfiniteQuery({
    queryKey: [...PROJECTS_KEY, projectId, "candidates", query],
    queryFn: ({ pageParam = 1 }) =>
      projectsApi.listCandidates(projectId, {
        page: pageParam,
        page_size: 20,
        q: query || undefined,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.page + 1 : undefined,
    staleTime: 5_000,
  });
}
