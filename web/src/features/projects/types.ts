export type ComicType = "manga" | "manhwa" | "manhua" | "webtoon" | "comic" | "vn";
export type ReadingDirection = "rtl" | "ltr" | "ttb";
export type AutomationLevel = "full_auto" | "review_script" | "review_all";
export type ProjectRole = "owner" | "member";
export type InvitationStatus = "pending" | "accepted" | "declined" | "revoked";

export const COMIC_TYPE_LABELS: Record<ComicType, string> = {
  manga: "Manga (Nhật)",
  manhwa: "Manhwa (Hàn)",
  manhua: "Manhua (Trung)",
  webtoon: "Webtoon (Cuộn dọc)",
  comic: "Comic (Âu Mỹ)",
  vn: "Truyện Việt",
};

export const READING_DIRECTION_LABELS: Record<ReadingDirection, string> = {
  rtl: "Phải → Trái (Manga)",
  ltr: "Trái → Phải (Comic/Manhwa ngang)",
  ttb: "Trên → Dưới (Webtoon)",
};

export const AUTOMATION_LEVEL_LABELS: Record<AutomationLevel, { title: string; desc: string }> = {
  full_auto: { title: "Tự động tối đa", desc: "Tự chạy hết và xuất video (bỏ qua cổng duyệt)" },
  review_script: { title: "Duyệt kịch bản (Chuẩn)", desc: "Dừng lại ở Gate B để kiểm tra cốt truyện" },
  review_all: { title: "Duyệt từng bước", desc: "Dừng ở cả Gate A (nhân vật), B (kịch bản), C (video)" },
};

export const DEFAULT_DIRECTION_FOR_TYPE: Record<ComicType, ReadingDirection> = {
  manga: "rtl",
  manhwa: "ltr",
  manhua: "ltr",
  webtoon: "ttb",
  comic: "ltr",
  vn: "ltr",
};

export interface Project {
  id: number;
  name: string;
  description: string | null;
  owner_id: number;
  owner_username: string;
  comic_type: ComicType;
  reading_direction: ReadingDirection;
  source_lang: string;
  target_lang: string;
  genre: string[];
  automation_level: AutomationLevel;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  my_role?: ProjectRole;
  members_count: number;
}

export interface ProjectStats {
  total: number;
  active: number;
  archived: number;
}

export interface ProjectPageResponse {
  items: Project[];
  page: number;
  page_size: number;
  total: number;
  stats: ProjectStats;
}

export interface ProjectListParams {
  page: number;
  page_size: number;
  comic_type?: ComicType;
  q?: string;
  include_archived?: boolean;
}

export interface ProjectCreateInput {
  name: string;
  description?: string;
  comic_type: ComicType;
  reading_direction: ReadingDirection;
  source_lang?: string;
  target_lang?: string;
  genre?: string[];
  automation_level: AutomationLevel;
  settings?: Record<string, unknown>;
}

export interface ProjectUpdateInput {
  name?: string;
  description?: string;
  comic_type?: ComicType;
  reading_direction?: ReadingDirection;
  source_lang?: string;
  target_lang?: string;
  genre?: string[];
  automation_level?: AutomationLevel;
  settings?: Record<string, unknown>;
  owner_id?: number;
}

export interface ProjectMember {
  user_id: number;
  username: string;
  display_name: string | null;
  system_role: string;
  role: ProjectRole;
  joined_at: string;
}

export interface ProjectInvitation {
  id: number;
  project_id: number;
  project_name: string;
  invitee_user_id: number;
  invitee_username: string;
  invited_by: number;
  inviter_username: string;
  status: InvitationStatus;
  created_at: string;
  responded_at: string | null;
}

export interface UserCandidate {
  id: number;
  username: string;
  display_name: string | null;
  email: string;
  system_role: string;
}

export interface UserCandidatePage {
  items: UserCandidate[];
  page: number;
  page_size: number;
  total: number;
  has_more: boolean;
}
