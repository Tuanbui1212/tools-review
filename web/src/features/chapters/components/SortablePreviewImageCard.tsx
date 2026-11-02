import { GripVerticalIcon, TrashIcon } from "@crt/shared";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button, Card, Image } from "antd";

export interface PreviewImageItem {
  id: string;
  file: File;
  previewUrl: string;
}

interface SortablePreviewImageCardProps {
  item: PreviewImageItem;
  index: number;
  onRemove: (id: string) => void;
}

export function SortablePreviewImageCard({
  item,
  index,
  onRemove,
}: SortablePreviewImageCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
  });

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

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
            src={item.previewUrl}
            alt={item.file.name}
            style={{ maxHeight: 200, objectFit: "contain", width: "100%" }}
            preview={{ mask: "Phóng to" }}
          />

          {/* Huy hiệu số thứ tự trang */}
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
              {index + 1}
            </span>
          </div>

          {/* Nút nắm kéo thả */}
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
        </div>

        {/* Tên file & nút xoá */}
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
            title={item.file.name}
          >
            {item.file.name}
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
            <span>{formatSize(item.file.size)}</span>

            <Button
              type="text"
              danger
              size="small"
              icon={<TrashIcon size={13} />}
              style={{ padding: "0 4px", height: 22 }}
              onClick={() => onRemove(item.id)}
              title="Xoá trang này"
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
