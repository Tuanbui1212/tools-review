import { http } from "@crt/shared";

import type {
  Chapter,
  ChapterCreatePayload,
  ChapterListResponse,
  ChapterPage,
  ChapterUpdatePayload,
} from "../types";

export const chapterApi = {
  list: (
    projectId: number,
    params?: { status?: string; page?: number; page_size?: number },
  ) =>
    http.get<ChapterListResponse>(`/v1/projects/${projectId}/chapters`, {
      status: params?.status,
      page: params?.page,
      page_size: params?.page_size,
    }),

  create: (projectId: number, payload: ChapterCreatePayload) =>
    http.post<Chapter>(`/v1/projects/${projectId}/chapters`, payload),

  get: (chapterId: number) => http.get<Chapter>(`/v1/chapters/${chapterId}`),

  update: (chapterId: number, payload: ChapterUpdatePayload) =>
    http.patch<Chapter>(`/v1/chapters/${chapterId}`, payload),

  delete: (chapterId: number) => http.delete<void>(`/v1/chapters/${chapterId}`),

  uploadImages: (chapterId: number, files: File[]) => {
    const formData = new FormData();
    for (const file of files) {
      formData.append("files", file);
    }
    return http.post<ChapterPage[]>(`/v1/chapters/${chapterId}/upload-images`, formData);
  },

  uploadZip: (chapterId: number, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return http.post<ChapterPage[]>(`/v1/chapters/${chapterId}/upload-zip`, formData);
  },

  listPages: (chapterId: number) => http.get<ChapterPage[]>(`/v1/chapters/${chapterId}/pages`),

  reorderPages: (chapterId: number, pageIds: number[]) =>
    http.put<ChapterPage[]>(`/v1/chapters/${chapterId}/pages/reorder`, { page_ids: pageIds }),

  deletePage: (chapterId: number, pageId: number) =>
    http.delete<void>(`/v1/chapters/${chapterId}/pages/${pageId}`),

  clearAllPages: (chapterId: number) => http.delete<void>(`/v1/chapters/${chapterId}/pages`),
};
