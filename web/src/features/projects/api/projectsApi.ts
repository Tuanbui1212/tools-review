import { http } from "@crt/shared";

import type {
  Project,
  ProjectCreateInput,
  ProjectInvitation,
  ProjectListParams,
  ProjectMember,
  ProjectPageResponse,
  ProjectUpdateInput,
  UserCandidatePage,
} from "../types";

export const projectsApi = {
  list: (params: ProjectListParams) =>
    http.get<ProjectPageResponse>("/v1/projects", {
      page: params.page,
      page_size: params.page_size,
      comic_type: params.comic_type,
      q: params.q,
      include_archived: params.include_archived,
    }),

  get: (id: number) => http.get<Project>(`/v1/projects/${id}`),

  create: (input: ProjectCreateInput) => http.post<Project>("/v1/projects", input),

  update: (id: number, input: ProjectUpdateInput) => http.patch<Project>(`/v1/projects/${id}`, input),

  delete: (id: number) => http.delete<void>(`/v1/projects/${id}`),

  listMembers: (projectId: number) =>
    http.get<ProjectMember[]>(`/v1/projects/${projectId}/members`),

  inviteMember: (projectId: number, identifier: string) =>
    http.post<ProjectInvitation>(`/v1/projects/${projectId}/invitations`, { identifier }),

  removeMember: (projectId: number, userId: number) =>
    http.delete<void>(`/v1/projects/${projectId}/members/${userId}`),

  listMyInvitations: () => http.get<ProjectInvitation[]>("/v1/invitations/me"),

  respondInvitation: (invitationId: number, accept: boolean) =>
    http.post<void>(`/v1/invitations/${invitationId}/respond`, { accept }),

  listCandidates: (
    projectId: number,
    params: { page: number; page_size: number; q?: string },
  ) =>
    http.get<UserCandidatePage>(`/v1/projects/${projectId}/candidates`, {
      page: params.page,
      page_size: params.page_size,
      q: params.q,
    }),
};
