import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { chapterApi } from "../api/chapterApi";
import type { ChapterCreatePayload, ChapterUpdatePayload } from "../types";

export const CHAPTER_QUERY_KEYS = {
  list: (projectId: number, params?: unknown) => ["projects", projectId, "chapters", params] as const,
  detail: (chapterId: number) => ["chapters", chapterId] as const,
  pages: (chapterId: number) => ["chapters", chapterId, "pages"] as const,
};

export function useChapters(
  projectId: number,
  params?: { status?: string; page?: number; page_size?: number },
) {
  return useQuery({
    queryKey: CHAPTER_QUERY_KEYS.list(projectId, params),
    queryFn: () => chapterApi.list(projectId, params),
    enabled: Boolean(projectId),
  });
}

export function useChapter(chapterId: number) {
  return useQuery({
    queryKey: CHAPTER_QUERY_KEYS.detail(chapterId),
    queryFn: () => chapterApi.get(chapterId),
    enabled: Boolean(chapterId),
  });
}

export function useChapterPages(chapterId: number) {
  return useQuery({
    queryKey: CHAPTER_QUERY_KEYS.pages(chapterId),
    queryFn: () => chapterApi.listPages(chapterId),
    enabled: Boolean(chapterId),
  });
}

export function useCreateChapter(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ChapterCreatePayload) => chapterApi.create(projectId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", projectId, "chapters"] });
    },
  });
}

export function useUpdateChapter(chapterId: number, projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ChapterUpdatePayload) => chapterApi.update(chapterId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHAPTER_QUERY_KEYS.detail(chapterId) });
      queryClient.invalidateQueries({ queryKey: ["projects", projectId, "chapters"] });
    },
  });
}

export function useDeleteChapter(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (chapterId: number) => chapterApi.delete(chapterId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", projectId, "chapters"] });
    },
  });
}

export function useUploadImages(chapterId: number, projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (files: File[]) => chapterApi.uploadImages(chapterId, files),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHAPTER_QUERY_KEYS.pages(chapterId) });
      queryClient.invalidateQueries({ queryKey: CHAPTER_QUERY_KEYS.detail(chapterId) });
      queryClient.invalidateQueries({ queryKey: ["projects", projectId, "chapters"] });
    },
  });
}

export function useUploadZip(chapterId: number, projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => chapterApi.uploadZip(chapterId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHAPTER_QUERY_KEYS.pages(chapterId) });
      queryClient.invalidateQueries({ queryKey: CHAPTER_QUERY_KEYS.detail(chapterId) });
      queryClient.invalidateQueries({ queryKey: ["projects", projectId, "chapters"] });
    },
  });
}

export function useReorderPages(chapterId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pageIds: number[]) => chapterApi.reorderPages(chapterId, pageIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHAPTER_QUERY_KEYS.pages(chapterId) });
    },
  });
}

export function useDeletePage(chapterId: number, projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pageId: number) => chapterApi.deletePage(chapterId, pageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHAPTER_QUERY_KEYS.pages(chapterId) });
      queryClient.invalidateQueries({ queryKey: CHAPTER_QUERY_KEYS.detail(chapterId) });
      queryClient.invalidateQueries({ queryKey: ["projects", projectId, "chapters"] });
    },
  });
}

export function useClearAllPages(chapterId: number, projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => chapterApi.clearAllPages(chapterId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHAPTER_QUERY_KEYS.pages(chapterId) });
      queryClient.invalidateQueries({ queryKey: CHAPTER_QUERY_KEYS.detail(chapterId) });
      queryClient.invalidateQueries({ queryKey: ["projects", projectId, "chapters"] });
    },
  });
}
