import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  HolderOutlined,
} from "@ant-design/icons";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button, Card, Image, Tag } from "antd";
import React from "react";

import type { ChapterPanel } from "../types";

interface SortablePanelCardProps {
  panel: ChapterPanel;
  index: number;
  total: number;
  token?: string | null;
  chapterId: number;
  canEdit?: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export const SortablePanelCard: React.FC<SortablePanelCardProps> = ({
  panel,
  index,
  total,
  token,
  chapterId,
  canEdit = true,
  onMoveUp,
  onMoveDown,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: panel.id,
    disabled: !canEdit,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 99 : 1,
    position: "relative",
    marginBottom: 8,
    background: isDragging ? "#2a2a2a" : "#1f1f1f",
    borderColor: isDragging ? "#1890ff" : "#303030",
  };

  const panelImgUrl = panel.image_url
    ? token
      ? `${panel.image_url}?token=${encodeURIComponent(token)}`
      : panel.image_url
    : token
      ? `/api/v1/chapters/${chapterId}/panels/${panel.id}/file?token=${encodeURIComponent(token)}`
      : `/api/v1/chapters/${chapterId}/panels/${panel.id}/file`;

  return (
    <div ref={setNodeRef} style={style}>
      <Card size="small" bodyStyle={{ padding: "8px 10px" }} style={{ background: "transparent" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {canEdit && (
            <div
              {...attributes}
              {...listeners}
              style={{
                cursor: "grab",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#8c8c8c",
                padding: "8px 2px",
                userSelect: "none",
              }}
              title="Kéo thả để đổi thứ tự"
            >
              <HolderOutlined style={{ fontSize: 16 }} />
            </div>
          )}

          <Image
            src={panelImgUrl}
            width={60}
            height={60}
            style={{ objectFit: "contain", background: "#000", borderRadius: 4 }}
            fallback="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60'><rect width='100%' height='100%' fill='%23262626'/><text x='50%' y='50%' fill='%23888' font-size='10' text-anchor='middle' alignment-baseline='middle'>No Image</text></svg>"
          />

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ marginBottom: 4 }}>
              <Tag color="blue" style={{ fontWeight: 600, fontSize: 12 }}>
                Khung #{panel.panel_index_in_page}
              </Tag>
            </div>
            <div style={{ fontSize: 11, color: "#8c8c8c" }}>
              Box: ({panel.bbox_x}, {panel.bbox_y})
            </div>
            <div style={{ fontSize: 11, color: "#8c8c8c" }}>
              Size: {panel.bbox_width}x{panel.bbox_height}px
            </div>
          </div>

          {canEdit && (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Button
                type="text"
                size="small"
                icon={<ArrowUpOutlined style={{ fontSize: 12 }} />}
                disabled={index === 0}
                onClick={onMoveUp}
                title="Đổi thứ tự lên trên"
                style={{ padding: "0 4px", height: 22 }}
              />
              <Button
                type="text"
                size="small"
                icon={<ArrowDownOutlined style={{ fontSize: 12 }} />}
                disabled={index === total - 1}
                onClick={onMoveDown}
                title="Đổi thứ tự xuống dưới"
                style={{ padding: "0 4px", height: 22 }}
              />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

