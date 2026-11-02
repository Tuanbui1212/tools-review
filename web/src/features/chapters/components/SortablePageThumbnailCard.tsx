import { errorMessage, getAccessToken, GripVerticalIcon, TrashIcon } from "@crt/shared";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button, Card, Image, message, Popconfirm, Tag, Tooltip } from "antd";

import { useDeletePage } from "../hooks/useChapters";
import type { ChapterPage } from "../types";

interface SortablePageThumbnailCardProps {
  page: ChapterPage;
  chapterId: number;
  projectId: number;
  canEdit: boolean;
}

export function SortablePageThumbnailCard({
  page,
  chapterId,
  projectId,
  canEdit,
}: SortablePageThumbnailCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: page.id,
    disabled: !canEdit,
  });

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

  const token = getAccessToken();
  const imageUrl = token ? `${page.file_url}?token=${encodeURIComponent(token)}` : page.file_url;

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 99 : 1,
    position: "relative",
    touchAction: "none",
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card
        hoverable
        size="small"
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          borderRadius: 10,
          overflow: "hidden",
          border: isDragging
            ? "2px dashed #52c41a"
            : page.is_duplicate_hash
            ? "1px solid #faad14"
            : "1px solid var(--crt-border)",
          boxShadow: isDragging ? "0 10px 25px rgba(0,0,0,0.5)" : undefined,
          background: "var(--crt-surface)",
          transition: "border-color 0.2s, box-shadow 0.2s",
        }}
        bodyStyle={{ padding: 10, display: "flex", flexDirection: "column", flex: 1 }}
      >
        <div
          style={{
            position: "relative",
            textAlign: "center",
            background: "#000",
            borderRadius: 6,
            overflow: "hidden",
            height: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Image
            src={imageUrl}
            alt={page.original_filename}
            style={{ maxHeight: 200, objectFit: "contain", width: "100%" }}
            preview={{ mask: "Phóng to" }}
            fallback="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='%23222'/><text x='50%' y='50%' fill='%23888' dominant-baseline='middle' text-anchor='middle'>Ảnh lỗi</text></svg>"
          />

          {/* Huy hiệu Trang */}
          <div style={{ position: "absolute", top: 8, left: 8, zIndex: 2 }}>
            <span
              style={{
                background: "rgba(0, 0, 0, 0.75)",
                color: "#52c41a",
                padding: "2px 8px",
                borderRadius: 4,
                fontWeight: 700,
                fontSize: 12,
                backdropFilter: "blur(4px)",
                border: "1px solid rgba(82, 196, 26, 0.3)",
              }}
            >
              {page.page_number}
            </span>
          </div>

          {/* Cờ trùng lặp */}
          {page.is_duplicate_hash && (
            <div style={{ position: "absolute", bottom: 8, left: 8, zIndex: 2 }}>
              <Tooltip title="Ảnh này có nội dung trùng lặp (SHA-256) với trang khác">
                <Tag color="warning" style={{ margin: 0, cursor: "help", fontSize: 11 }}>
                  ⚠️ Trùng
                </Tag>
              </Tooltip>
            </div>
          )}

          {/* Nút nắm kéo thả */}
          {canEdit && (
            <div
              {...attributes}
              {...listeners}
              title="Nhấn giữ và kéo để sắp xếp thứ tự"
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                zIndex: 3,
                background: "rgba(0, 0, 0, 0.75)",
                borderRadius: 4,
                padding: "4px 6px",
                cursor: "grab",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#aaa",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                transition: "color 0.2s, background 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#52c41a";
                e.currentTarget.style.background = "rgba(0, 0, 0, 0.9)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#aaa";
                e.currentTarget.style.background = "rgba(0, 0, 0, 0.75)";
              }}
            >
              <GripVerticalIcon size={16} />
            </div>
          )}
        </div>

        {/* Thông tin trang & Nút xoá */}
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              color: "var(--crt-text)",
            }}
            title={page.original_filename}
          >
            {page.original_filename}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 11,
              color: "var(--crt-text-muted)",
            }}
          >
            <span>
              {page.width}×{page.height} • {formatSize(page.file_size_bytes)}
            </span>

            {canEdit && (
              <Popconfirm
                title={`Xoá Trang ${page.page_number}?`}
                description="Các trang sau sẽ tự động dồn số lại."
                okText="Xoá"
                cancelText="Huỷ"
                okButtonProps={{ danger: true }}
                onConfirm={handleDelete}
              >
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<TrashIcon size={13} />}
                  style={{ padding: "0 4px", height: 22 }}
                  title="Xoá trang này"
                />
              </Popconfirm>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
