export type ChapterStatus = "draft" | "ready" | "processing" | "completed" | "error";

export interface Chapter {
  id: number;
  project_id: number;
  chapter_number: number;
  title: string | null;
  status: ChapterStatus;
  total_pages: number;
  created_by_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface ChapterPage {
  id: number;
  chapter_id: number;
  page_number: number;
  original_filename: string;
  file_size_bytes: number;
  width: number;
  height: number;
  mime_type: string;
  file_hash: string;
  is_duplicate_hash: boolean;
  file_url: string;
  created_at: string;
}

export interface ChapterCreatePayload {
  chapter_number: number;
  title?: string | null;
}

export interface ChapterUpdatePayload {
  chapter_number?: number;
  title?: string | null;
  status?: ChapterStatus;
}

export interface ChapterReorderPayload {
  page_ids: number[];
}

export interface ChapterListResponse {
  items: Chapter[];
  total: number;
}

export const CHAPTER_STATUS_CONFIG: Record<
  ChapterStatus,
  { label: string; color: string }
> = {
  draft: { label: "Bản nháp (chưa có ảnh)", color: "default" },
  ready: { label: "Sẵn sàng xử lý", color: "success" },
  processing: { label: "Đang chạy Pipeline", color: "processing" },
  completed: { label: "Đã hoàn thành", color: "purple" },
  error: { label: "Lỗi xử lý", color: "error" },
};

export interface ChapterPanel {
  id: number;
  chapter_id: number;
  chapter_page_id: number;
  panel_number: number;
  panel_index_in_page: number;
  bbox_x: number;
  bbox_y: number;
  bbox_width: number;
  bbox_height: number;
  is_full_page: boolean;
  image_path?: string | null;
  image_url?: string | null;
  google_drive_file_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PagePanelItem {
  id?: number;
  panel_index_in_page: number;
  bbox_x: number;
  bbox_y: number;
  bbox_width: number;
  bbox_height: number;
  is_full_page?: boolean;
}

export interface PipelineTask {
  id: number;
  task_id: string;
  project_id: number;
  chapter_id: number | null;
  task_type: string;
  queue_name: string;
  status: "pending" | "processing" | "completed" | "error";
  progress: number;
  stage_message?: string | null;
  result?: any;
  error_message?: string | null;
}

