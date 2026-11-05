import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { chapterApi } from "../api/chapterApi";
import type { PagePanelItem, PipelineTask } from "../types";

export function useChapterPanels(chapterId: number) {
  return useQuery({
    queryKey: ["chapters", chapterId, "panels"],
    queryFn: () => chapterApi.listPanels(chapterId),
    enabled: Boolean(chapterId),
  });
}

export function usePagePanels(pageId: number | null) {
  return useQuery({
    queryKey: ["chapter-pages", pageId, "panels"],
    queryFn: () => (pageId ? chapterApi.listPagePanels(pageId) : Promise.resolve([])),
    enabled: Boolean(pageId),
  });
}

export function useTriggerExtractPanels(chapterId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => chapterApi.triggerExtractPanels(chapterId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chapters", chapterId] });
      queryClient.invalidateQueries({ queryKey: ["chapters", chapterId, "panels"] });
    },
  });
}

export function useExtractPagePanels(chapterId: number, pageId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => chapterApi.extractPagePanels(chapterId, pageId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chapter-pages", pageId, "panels"] });
      queryClient.invalidateQueries({ queryKey: ["chapters", chapterId, "panels"] });
    },
  });
}

export function useUpdatePagePanels(pageId: number, chapterId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (panels: PagePanelItem[]) => chapterApi.updatePagePanels(pageId, panels),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chapter-pages", pageId, "panels"] });
      queryClient.invalidateQueries({ queryKey: ["chapters", chapterId, "panels"] });
    },
  });
}

export function useReorderPanels(chapterId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (panelIds: number[]) => chapterApi.reorderPanels(chapterId, panelIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chapters", chapterId, "panels"] });
    },
  });
}

export function useTaskProgress(taskId: string | null, onCompleted?: () => void) {
  const [task, setTask] = useState<PipelineTask | null>(null);
  const onCompletedRef = useRef(onCompleted);

  useEffect(() => {
    onCompletedRef.current = onCompleted;
  }, [onCompleted]);

  // 1. Polling fallback query
  const query = useQuery({
    queryKey: ["tasks", taskId],
    queryFn: () => (taskId ? chapterApi.getTask(taskId) : null),
    enabled: Boolean(taskId && task?.status !== "completed" && task?.status !== "error"),
    refetchInterval: 1200,
  });

  useEffect(() => {
    if (query.data) {
      setTask(query.data);
      if (query.data.status === "completed") {
        onCompletedRef.current?.();
      }
    }
  }, [query.data]);

  // 2. WebSocket thời gian thực
  useEffect(() => {
    if (!taskId) {
      setTask(null);
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/v1/ws/tasks/${taskId}`;

    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setTask((prev) => ({
            ...(prev || {
              id: 0,
              task_id: taskId,
              project_id: 0,
              chapter_id: null,
              task_type: "",
              queue_name: "",
              status: "processing",
              progress: 0,
            }),
            progress: data.progress ?? prev?.progress ?? 0,
            stage_message: data.stage_message ?? prev?.stage_message,
            status: data.status ?? prev?.status ?? "processing",
            error_message: data.error_message,
            result: data.result,
          }));

          if (data.status === "completed") {
            onCompletedRef.current?.();
          }
        } catch {
          // ignore parse errors
        }
      };
    } catch {
      // ws error -> query polling will handle
    }

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [taskId]);

  return task;
}
