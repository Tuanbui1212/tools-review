import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  HolderOutlined,
} from "@ant-design/icons";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge, Button, Image, Typography } from "antd";
import React from "react";

import type { ChapterPage } from "../types";

const { Text } = Typography;

interface SortablePageFilmstripItemProps {
  page: ChapterPage;
  isSelected: boolean;
  panelCount: number;
  index: number;
  total: number;
  token?: string | null;
  chapterId: number;
  canEdit?: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export const SortablePageFilmstripItem: React.FC<SortablePageFilmstripItemProps> = ({
  page,
  isSelected,
  panelCount,
  index,
  total,
  token,
  chapterId,
  canEdit = true,
  onSelect,
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
    id: page.id,
    disabled: !canEdit,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 99 : 1,
    position: "relative",
    padding: "6px 8px",
    marginBottom: 8,
    borderRadius: 6,
    cursor: "pointer",
    border: isSelected ? "2px solid #ff7a18" : "1px solid #303030",
    backgroundColor: isSelected ? "rgba(255, 122, 24, 0.12)" : isDragging ? "#2a2a2a" : "#1f1f1f",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    userSelect: "none",
  };

  const pageImgUrl = token
    ? `/api/v1/chapters/${chapterId}/pages/${page.id}/file?token=${encodeURIComponent(token)}`
    : `/api/v1/chapters/${chapterId}/pages/${page.id}/file`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flex: 1 }}>
        {canEdit && (
          <div
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            style={{
              cursor: "grab",
              color: "#8c8c8c",
              padding: "4px 2px",
              display: "flex",
              alignItems: "center",
            }}
            title="Kéo thả để đổi thứ tự trang"
          >
            <HolderOutlined style={{ fontSize: 14 }} />
          </div>
        )}

        <Image
          src={pageImgUrl}
          width={34}
          height={46}
          style={{ objectFit: "cover", borderRadius: 4 }}
          preview={false}
        />

        <div style={{ minWidth: 0, flex: 1 }}>
          <Text strong style={{ display: "block", fontSize: 13, lineHeight: "16px" }}>
            Trang {page.page_number}
          </Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {page.width}x{page.height}
          </Text>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6 }} onClick={(e) => e.stopPropagation()}>
        <Badge
          count={panelCount > 0 ? `${panelCount} box` : "0 box"}
          style={{
            backgroundColor: panelCount > 0 ? "#1890ff" : "#595959",
            fontSize: 11,
          }}
        />

        {canEdit && (
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <Button
              type="text"
              size="small"
              icon={<ArrowUpOutlined style={{ fontSize: 10 }} />}
              disabled={index === 0}
              onClick={onMoveUp}
              title="Đổi trang lên trước"
              style={{ padding: "0 2px", height: 18 }}
            />
            <Button
              type="text"
              size="small"
              icon={<ArrowDownOutlined style={{ fontSize: 10 }} />}
              disabled={index === total - 1}
              onClick={onMoveDown}
              title="Đổi trang xuống sau"
              style={{ padding: "0 2px", height: 18 }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
