import {
  CheckOutlined,
  DeleteOutlined,
  ExpandOutlined,
  PlusOutlined,
  ReloadOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from "@ant-design/icons";
import { Button, Card, Empty, message, Space, Tag, Tooltip } from "antd";
import React, { useEffect, useRef, useState } from "react";

import type { ChapterPage, ChapterPanel, PagePanelItem } from "../types";

interface Props {
  page: ChapterPage | null;
  panels: ChapterPanel[];
  onSave: (panels: PagePanelItem[]) => Promise<void>;
  isSaving?: boolean;
}

type DragMode =
  | "move"
  | "resize-nw"
  | "resize-ne"
  | "resize-sw"
  | "resize-se"
  | "resize-n"
  | "resize-s"
  | "resize-e"
  | "resize-w"
  | "draw"
  | null;

export const PanelCanvasEditor: React.FC<Props> = ({ page, panels, onSave, isSaving }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [isDrawMode, setIsDrawMode] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Danh sách boxes cục bộ trên canvas
  const [boxes, setBoxes] = useState<PagePanelItem[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync khi page hoặc panels từ server thay đổi
  useEffect(() => {
    if (panels && panels.length > 0) {
      setBoxes(
        panels.map((p) => ({
          id: p.id,
          panel_index_in_page: p.panel_index_in_page,
          bbox_x: p.bbox_x,
          bbox_y: p.bbox_y,
          bbox_width: p.bbox_width,
          bbox_height: p.bbox_height,
          is_full_page: p.is_full_page,
        }))
      );
    } else {
      setBoxes([]);
    }
    setSelectedIndex(null);
    setHasChanges(false);
  }, [panels, page?.id]);

  // Thao tác kéo rê chuột
  const [dragMode, setDragMode] = useState<DragMode>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [boxInit, setBoxInit] = useState<PagePanelItem | null>(null);

  if (!page) {
    return (
      <Card style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Empty description="Chọn một trang truyện bên trái để biên tập khung tranh" />
      </Card>
    );
  }

  // Tỷ lệ thực tế vs hiển thị
  const imgWidth = page.width || 800;
  const imgHeight = page.height || 1200;

  const handleMouseDownOnCanvas = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / scale;
    const mouseY = (e.clientY - rect.top) / scale;

    if (isDrawMode) {
      // Bắt đầu vẽ box mới
      const newIndex = boxes.length + 1;
      const newBox: PagePanelItem = {
        panel_index_in_page: newIndex,
        bbox_x: Math.round(mouseX),
        bbox_y: Math.round(mouseY),
        bbox_width: 10,
        bbox_height: 10,
        is_full_page: false,
      };
      setBoxes([...boxes, newBox]);
      setSelectedIndex(boxes.length);
      setDragMode("draw");
      setDragStart({ x: mouseX, y: mouseY });
      setBoxInit(newBox);
      setHasChanges(true);
    } else {
      // Click ra ngoài -> bỏ chọn
      setSelectedIndex(null);
    }
  };

  const handleMouseDownOnBox = (e: React.MouseEvent, index: number, mode: DragMode) => {
    e.stopPropagation();
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / scale;
    const mouseY = (e.clientY - rect.top) / scale;

    setSelectedIndex(index);
    setDragMode(mode);
    setDragStart({ x: mouseX, y: mouseY });
    setBoxInit({ ...boxes[index] });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragMode || !boxInit || selectedIndex === null || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const currentX = (e.clientX - rect.left) / scale;
    const currentY = (e.clientY - rect.top) / scale;
    const deltaX = currentX - dragStart.x;
    const deltaY = currentY - dragStart.y;

    setBoxes((prev) => {
      const next = [...prev];
      const target = { ...next[selectedIndex] };

      if (dragMode === "move") {
        target.bbox_x = Math.max(0, Math.min(imgWidth - target.bbox_width, Math.round(boxInit.bbox_x + deltaX)));
        target.bbox_y = Math.max(0, Math.min(imgHeight - target.bbox_height, Math.round(boxInit.bbox_y + deltaY)));
      } else if (dragMode === "draw" || dragMode === "resize-se") {
        target.bbox_width = Math.max(20, Math.round(boxInit.bbox_width + deltaX));
        target.bbox_height = Math.max(20, Math.round(boxInit.bbox_height + deltaY));
      } else if (dragMode === "resize-nw") {
        const newW = Math.max(20, Math.round(boxInit.bbox_width - deltaX));
        const newH = Math.max(20, Math.round(boxInit.bbox_height - deltaY));
        target.bbox_x = Math.round(boxInit.bbox_x + (boxInit.bbox_width - newW));
        target.bbox_y = Math.round(boxInit.bbox_y + (boxInit.bbox_height - newH));
        target.bbox_width = newW;
        target.bbox_height = newH;
      } else if (dragMode === "resize-ne") {
        target.bbox_width = Math.max(20, Math.round(boxInit.bbox_width + deltaX));
        const newH = Math.max(20, Math.round(boxInit.bbox_height - deltaY));
        target.bbox_y = Math.round(boxInit.bbox_y + (boxInit.bbox_height - newH));
        target.bbox_height = newH;
      } else if (dragMode === "resize-sw") {
        const newW = Math.max(20, Math.round(boxInit.bbox_width - deltaX));
        target.bbox_x = Math.round(boxInit.bbox_x + (boxInit.bbox_width - newW));
        target.bbox_width = newW;
        target.bbox_height = Math.max(20, Math.round(boxInit.bbox_height + deltaY));
      }

      next[selectedIndex] = target;
      return next;
    });
    setHasChanges(true);
  };

  const handleMouseUp = () => {
    if (dragMode) {
      setDragMode(null);
      setBoxInit(null);
      if (isDrawMode) {
        setIsDrawMode(false);
      }
    }
  };

  const handleDeleteBox = (index: number) => {
    setBoxes((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      // Đánh lại panel_index_in_page 1, 2, 3...
      return filtered.map((b, idx) => ({ ...b, panel_index_in_page: idx + 1 }));
    });
    setSelectedIndex(null);
    setHasChanges(true);
  };

  const handleReset = () => {
    if (panels && panels.length > 0) {
      setBoxes(
        panels.map((p) => ({
          id: p.id,
          panel_index_in_page: p.panel_index_in_page,
          bbox_x: p.bbox_x,
          bbox_y: p.bbox_y,
          bbox_width: p.bbox_width,
          bbox_height: p.bbox_height,
          is_full_page: p.is_full_page,
        }))
      );
    } else {
      setBoxes([]);
    }
    setSelectedIndex(null);
    setHasChanges(false);
  };

  const handleSave = async () => {
    try {
      await onSave(boxes);
      message.success("Đã lưu các khung tranh thành công");
      setHasChanges(false);
    } catch {
      message.error("Lỗi khi lưu khung tranh");
    }
  };

  return (
    <Card
      title={
        <Space>
          <span>Trang {page.page_number} ({page.width}x{page.height}px)</span>
          <Tag color="cyan">{boxes.length} khung tranh</Tag>
        </Space>
      }
      extra={
        <Space>
          <Tooltip title="Thu nhỏ">
            <Button icon={<ZoomOutOutlined />} onClick={() => setScale((s) => Math.max(0.3, s - 0.1))} />
          </Tooltip>
          <span style={{ minWidth: 45, textAlign: "center", display: "inline-block" }}>
            {Math.round(scale * 100)}%
          </span>
          <Tooltip title="Phóng to">
            <Button icon={<ZoomInOutlined />} onClick={() => setScale((s) => Math.min(2.0, s + 0.1))} />
          </Tooltip>
          <Tooltip title="Kích thước 100%">
            <Button icon={<ExpandOutlined />} onClick={() => setScale(0.7)} />
          </Tooltip>

          <Button
            type={isDrawMode ? "primary" : "default"}
            icon={<PlusOutlined />}
            onClick={() => setIsDrawMode(!isDrawMode)}
          >
            {isDrawMode ? "Đang vẽ box (quét chuột)" : "Vẽ thêm khung"}
          </Button>

          {hasChanges && (
            <Button icon={<ReloadOutlined />} onClick={handleReset}>
              Hủy sửa
            </Button>
          )}

          <Button
            type="primary"
            icon={<CheckOutlined />}
            disabled={!hasChanges}
            loading={isSaving}
            onClick={handleSave}
          >
            Lưu toạ độ
          </Button>
        </Space>
      }
      style={{ height: "100%", display: "flex", flexDirection: "column" }}
      bodyStyle={{
        flex: 1,
        overflow: "auto",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        padding: 16,
        background: "#141414",
      }}
    >
      <div
        ref={containerRef}
        onMouseDown={handleMouseDownOnCanvas}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{
          position: "relative",
          width: imgWidth * scale,
          height: imgHeight * scale,
          transformOrigin: "top left",
          userSelect: "none",
          boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
          cursor: isDrawMode ? "crosshair" : "default",
        }}
      >
        {/* Ảnh trang truyện nền */}
        <img
          src={`/api/v1/chapters/${page.chapter_id}/pages/${page.id}/file`}
          alt={`Page ${page.page_number}`}
          style={{
            width: "100%",
            height: "100%",
            display: "block",
            pointerEvents: "none",
          }}
        />

        {/* Các khung tranh (Bounding Box Overlays) */}
        {boxes.map((box, idx) => {
          const isSelected = selectedIndex === idx;
          return (
            <div
              key={idx}
              onMouseDown={(e) => handleMouseDownOnBox(e, idx, "move")}
              style={{
                position: "absolute",
                left: box.bbox_x * scale,
                top: box.bbox_y * scale,
                width: box.bbox_width * scale,
                height: box.bbox_height * scale,
                border: isSelected ? "2px solid #ff4d4f" : "2px solid #1890ff",
                backgroundColor: isSelected ? "rgba(255, 77, 79, 0.25)" : "rgba(24, 144, 255, 0.2)",
                cursor: "move",
                boxSizing: "border-box",
                zIndex: isSelected ? 10 : 1,
              }}
            >
              {/* Huy hiệu số thứ tự panel */}
              <div
                style={{
                  position: "absolute",
                  top: -12,
                  left: -2,
                  background: isSelected ? "#ff4d4f" : "#1890ff",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: "bold",
                  padding: "0 6px",
                  borderRadius: 3,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                #{box.panel_index_in_page}
                {isSelected && (
                  <DeleteOutlined
                    style={{ marginLeft: 4 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteBox(idx);
                    }}
                  />
                )}
              </div>

              {/* 4 điểm neo co giãn kích thước khi được chọn */}
              {isSelected && (
                <>
                  <div
                    onMouseDown={(e) => handleMouseDownOnBox(e, idx, "resize-nw")}
                    style={{
                      position: "absolute",
                      top: -4,
                      left: -4,
                      width: 8,
                      height: 8,
                      background: "#fff",
                      border: "1px solid #ff4d4f",
                      cursor: "nw-resize",
                    }}
                  />
                  <div
                    onMouseDown={(e) => handleMouseDownOnBox(e, idx, "resize-ne")}
                    style={{
                      position: "absolute",
                      top: -4,
                      right: -4,
                      width: 8,
                      height: 8,
                      background: "#fff",
                      border: "1px solid #ff4d4f",
                      cursor: "ne-resize",
                    }}
                  />
                  <div
                    onMouseDown={(e) => handleMouseDownOnBox(e, idx, "resize-sw")}
                    style={{
                      position: "absolute",
                      bottom: -4,
                      left: -4,
                      width: 8,
                      height: 8,
                      background: "#fff",
                      border: "1px solid #ff4d4f",
                      cursor: "sw-resize",
                    }}
                  />
                  <div
                    onMouseDown={(e) => handleMouseDownOnBox(e, idx, "resize-se")}
                    style={{
                      position: "absolute",
                      bottom: -4,
                      right: -4,
                      width: 8,
                      height: 8,
                      background: "#fff",
                      border: "1px solid #ff4d4f",
                      cursor: "se-resize",
                    }}
                  />
                </>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
};
