import { errorMessage, getAccessToken } from "@crt/shared";
import { Button, Card, Image, message, Popconfirm, Space, Tag, Tooltip } from "antd";

import { useDeletePage } from "../hooks/useChapters";
import type { ChapterPage } from "../types";

interface PageThumbnailCardProps {
  page: ChapterPage;
  chapterId: number;
  projectId: number;
  canEdit: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}

export function PageThumbnailCard({
  page,
  chapterId,
  projectId,
  canEdit,
  onMoveUp,
  onMoveDown,
  isFirst = false,
  isLast = false,
}: PageThumbnailCardProps) {
  const deleteMutation = useDeletePage(chapterId, projectId);

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(page.id);
      message.success(`Đã xoá Trang ${page.page_number}`);
    } catch (err) {
      message.error(errorMessage(err));
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card
      hoverable
      size="small"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        border: page.is_duplicate_hash ? "1px solid #faad14" : undefined,
      }}
      bodyStyle={{ padding: 12, display: "flex", flexDirection: "column", flex: 1 }}
    >
      <div style={{ position: "relative", textAlign: "center", background: "#000", borderRadius: 4, overflow: "hidden" }}>
        {(() => {
          const token = getAccessToken();
          const imageUrl = token ? `${page.file_url}?token=${encodeURIComponent(token)}` : page.file_url;
          return (
            <Image
              src={imageUrl}
              alt={page.original_filename}
              style={{ maxHeight: 220, objectFit: "contain", width: "100%" }}
              fallback="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='%23222'/><text x='50%' y='50%' fill='%23888' dominant-baseline='middle' text-anchor='middle'>Ảnh lỗi</text></svg>"
            />
          );
        })()}
        <div style={{ position: "absolute", top: 8, left: 8, zIndex: 2 }}>
          <Tag color="volcano" style={{ fontWeight: 600, margin: 0 }}>
            Trang {page.page_number}
          </Tag>
        </div>

        {page.is_duplicate_hash && (
          <div style={{ position: "absolute", top: 8, right: 8, zIndex: 2 }}>
            <Tooltip title="Ảnh này có nội dung trùng lặp (SHA-256) với một trang khác trong chapter">
              <Tag color="warning" style={{ margin: 0, cursor: "help" }}>
                ⚠️ Trùng lặp
              </Tag>
            </Tooltip>
          </div>
        )}
      </div>

      <div style={{ marginTop: 10, flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 500,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={page.original_filename}
          >
            {page.original_filename}
          </div>
          <div style={{ fontSize: 12, color: "var(--crt-text-muted)", marginTop: 2 }}>
            <span>{page.width} × {page.height} px</span> • <span>{formatSize(page.file_size_bytes)}</span>
          </div>
        </div>

        {canEdit && (
          <div
            style={{
              marginTop: 12,
              paddingTop: 8,
              borderTop: "1px solid var(--crt-border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Space size={4}>
              <Button
                size="small"
                disabled={isFirst}
                onClick={onMoveUp}
                title="Di chuyển lên trước"
              >
                ←
              </Button>
              <Button
                size="small"
                disabled={isLast}
                onClick={onMoveDown}
                title="Di chuyển về sau"
              >
                →
              </Button>
            </Space>

            <Popconfirm
              title={`Xoá Trang ${page.page_number}?`}
              description="Ảnh này sẽ bị xoá khỏi chapter và các trang sau sẽ tự dồn số lại."
              okText="Xoá"
              cancelText="Huỷ"
              okButtonProps={{ danger: true }}
              onConfirm={handleDelete}
            >
              <Button size="small" danger>
                Xoá
              </Button>
            </Popconfirm>
          </div>
        )}
      </div>
    </Card>
  );
}
