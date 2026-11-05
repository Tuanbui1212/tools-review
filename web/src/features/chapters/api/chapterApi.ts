import { http } from "@crt/shared";
import { getAccessToken } from "../../../shared/features/auth";

import type {
  Chapter,
  ChapterCreatePayload,
  ChapterListResponse,
  ChapterPage,
  ChapterPanel,
  ChapterUpdatePayload,
  PagePanelItem,
  PipelineTask,
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

  uploadImagesWithProgress: (
    chapterId: number,
    files: File[],
    onProgress?: (loaded: number, total: number, percent: number) => void,
    signal?: AbortSignal,
  ): Promise<ChapterPage[]> => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      for (const file of files) {
        formData.append("files", file);
      }

      const xhr = new XMLHttpRequest();
      xhr.open("POST", `/api/v1/chapters/${chapterId}/upload-images`);

      const token = getAccessToken();
      if (token) {
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      }

      if (onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.min(99, Math.round((event.loaded / event.total) * 100));
            onProgress(event.loaded, event.total, percent);
          }
        };
      }

      if (signal) {
        signal.addEventListener("abort", () => {
          xhr.abort();
          reject(new DOMException("Upload bị hủy bởi người dùng", "AbortError"));
        });
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText) as ChapterPage[];
            if (onProgress) onProgress(1, 1, 100);
            resolve(data);
          } catch {
            reject(new Error("Lỗi đọc dữ liệu phản hồi từ máy chủ"));
          }
        } else {
          try {
            const errJson = JSON.parse(xhr.responseText);
            reject(new Error(errJson.detail || errJson.error?.message || `Lỗi tải ảnh: ${xhr.status}`));
          } catch {
            reject(new Error(`Lỗi tải ảnh lên máy chủ (${xhr.status})`));
          }
        }
      };

      xhr.onerror = () => {
        reject(new Error("Lỗi kết nối mạng khi tải ảnh"));
      };

      xhr.send(formData);
    });
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

  triggerExtractPanels: (chapterId: number) =>
    http.post<PipelineTask>(`/v1/chapters/${chapterId}/extract-panels`),

  extractPagePanels: (chapterId: number, pageId: number) =>
    http.post<ChapterPanel[]>(`/v1/chapters/${chapterId}/pages/${pageId}/extract-panels`),

  listPanels: (chapterId: number) =>
    http.get<ChapterPanel[]>(`/v1/chapters/${chapterId}/panels`),

  listPagePanels: (pageId: number) =>
    http.get<ChapterPanel[]>(`/v1/chapter-pages/${pageId}/panels`),

  updatePagePanels: (pageId: number, panels: PagePanelItem[]) =>
    http.put<ChapterPanel[]>(`/v1/chapter-pages/${pageId}/panels`, { panels }),

  reorderPanels: (chapterId: number, panelIds: number[]) =>
    http.put<ChapterPanel[]>(`/v1/chapters/${chapterId}/panels/reorder`, { panel_ids: panelIds }),

  getTask: (taskId: string) =>
    http.get<PipelineTask>(`/v1/tasks/${taskId}`),
};
