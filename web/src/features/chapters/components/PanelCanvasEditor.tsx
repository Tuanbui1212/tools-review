import {
  BorderOuterOutlined,
  CheckOutlined,
  DeleteOutlined,
  ExpandOutlined,
  OrderedListOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  RedoOutlined,
  ReloadOutlined,
  ScissorOutlined,
  UndoOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from "@ant-design/icons";
import { getAccessToken } from "@crt/shared";
import { Button, Card, Empty, message, Modal, Space, Tag, Tooltip } from "antd";
import React, { useEffect, useRef, useState } from "react";

import type { ChapterPage, ChapterPanel, PagePanelItem } from "../types";

interface Props {
  page: ChapterPage | null;
  panels: ChapterPanel[];
  onSave: (panels: PagePanelItem[]) => Promise<void>;
  isSaving?: boolean;
  onExtractSinglePage?: () => Promise<void>;
  isExtractingSinglePage?: boolean;
  readingDirection?: "rtl" | "ltr" | "ttb";
}

interface EditorBox extends PagePanelItem {
  _uid: string;
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
  | "polygon-vertex"
  | "polygon-move"
  | null;

export const PanelCanvasEditor: React.FC<Props> = ({
  page,
  panels,
  onSave,
  isSaving,
  onExtractSinglePage,
  isExtractingSinglePage,
  readingDirection = "rtl",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Tỷ lệ thực tế vs hiển thị
  const imgWidth = page?.width || 800;
  const imgHeight = page?.height || 1200;

  // Chế độ vẽ: 'none' | 'rect' | 'polygon'
  const [drawModeType, setDrawModeType] = useState<"none" | "rect" | "polygon">("none");
  const [activePolygonPoints, setActivePolygonPoints] = useState<[number, number][]>([]);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // Danh sách boxes cục bộ trên canvas
  const [boxes, setBoxes] = useState<EditorBox[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Lịch sử thao tác Undo / Redo & Clipboard
  const [history, setHistory] = useState<EditorBox[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [clipboardBox, setClipboardBox] = useState<EditorBox | null>(null);
  const [showShortcutModal, setShowShortcutModal] = useState<boolean>(false);

  const boxesRef = useRef<EditorBox[]>([]);
  boxesRef.current = boxes;

  // Thao tác kéo rê chuột
  const [dragMode, setDragMode] = useState<DragMode>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [boxInit, setBoxInit] = useState<EditorBox | null>(null);
  const [activeVertexIdx, setActiveVertexIdx] = useState<number | null>(null);
  const [origPolygonPoints, setOrigPolygonPoints] = useState<[number, number][] | null>(null);

  // Sync khi page hoặc panels từ server thay đổi
  useEffect(() => {
    let initialBoxes: EditorBox[] = [];
    if (panels && panels.length > 0) {
      initialBoxes = panels.map((p, i) => ({
        id: p.id,
        _uid: p.id ? `panel-${p.id}` : `p-${i}-${Date.now()}`,
        panel_index_in_page: p.panel_index_in_page,
        bbox_x: p.bbox_x,
        bbox_y: p.bbox_y,
        bbox_width: p.bbox_width,
        bbox_height: p.bbox_height,
        polygon_points: p.polygon_points || null,
        is_full_page: p.is_full_page,
        source: p.source || "ai",
      }));
    }
    setBoxes(initialBoxes);
    setHistory([initialBoxes]);
    setHistoryIndex(0);
    setSelectedIndex(null);
    setHasChanges(false);
    setDrawModeType("none");
    setActivePolygonPoints([]);
  }, [panels, page?.id]);

  // Ghi nhận một bước thao tác vào lịch sử Undo/Redo
  const pushHistory = (newBoxes: EditorBox[]) => {
    setHistory((prev) => {
      const sliced = prev.slice(0, historyIndex + 1);
      const next = [...sliced, newBoxes];
      return next.length > 50 ? next.slice(next.length - 50) : next;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 49));
    setBoxes(newBoxes);
    setHasChanges(true);
  };

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const handleUndo = () => {
    if (historyIndex <= 0) {
      message.info("Không còn thao tác nào để hoàn tác");
      return;
    }
    const targetIdx = historyIndex - 1;
    const targetBoxes = history[targetIdx];
    setHistoryIndex(targetIdx);
    setBoxes(targetBoxes);
    setSelectedIndex(null);
    setHasChanges(targetIdx > 0);
    message.info("Đã hoàn tác (Ctrl+Z)");
  };

  const handleRedo = () => {
    if (historyIndex >= history.length - 1) {
      message.info("Không còn thao tác nào để làm lại");
      return;
    }
    const targetIdx = historyIndex + 1;
    const targetBoxes = history[targetIdx];
    setHistoryIndex(targetIdx);
    setBoxes(targetBoxes);
    setSelectedIndex(null);
    setHasChanges(true);
    message.info("Đã làm lại (Ctrl+Y)");
  };

  const handleDeleteBox = (index: number) => {
    const filtered = boxes.filter((_, i) => i !== index);
    const reindexed = filtered.map((b, idx) => ({ ...b, panel_index_in_page: idx + 1 }));
    pushHistory(reindexed);
    setSelectedIndex(null);
    setDragMode(null);
    setBoxInit(null);
    setActiveVertexIdx(null);
    setOrigPolygonPoints(null);
    message.info("Đã xoá khung. Bấm Ctrl+Z để hoàn tác.");
  };

  const handleCopy = () => {
    if (selectedIndex === null || !boxes[selectedIndex]) {
      message.warning("Vui lòng click chọn 1 khung trước khi sao chép");
      return;
    }
    const target = boxes[selectedIndex];
    setClipboardBox({ ...target });
    message.success(`Đã sao chép khung #${target.panel_index_in_page} (Ctrl+C)`);
  };

  const handleCut = () => {
    if (selectedIndex === null || !boxes[selectedIndex]) {
      message.warning("Vui lòng click chọn 1 khung trước khi cắt");
      return;
    }
    const target = boxes[selectedIndex];
    setClipboardBox({ ...target });
    handleDeleteBox(selectedIndex);
    message.success(`Đã cắt khung #${target.panel_index_in_page} (Ctrl+X)`);
  };

  const handlePaste = () => {
    if (!clipboardBox) {
      message.warning("Chưa có khung nào trong clipboard (dùng Ctrl+C để sao chép)");
      return;
    }
    const offsetX = 25;
    const offsetY = 25;
    const newX = Math.min(imgWidth - clipboardBox.bbox_width, Math.max(0, clipboardBox.bbox_x + offsetX));
    const newY = Math.min(imgHeight - clipboardBox.bbox_height, Math.max(0, clipboardBox.bbox_y + offsetY));

    let newPoly: [number, number][] | null = null;
    if (clipboardBox.polygon_points && clipboardBox.polygon_points.length >= 3) {
      const dx = newX - clipboardBox.bbox_x;
      const dy = newY - clipboardBox.bbox_y;
      newPoly = clipboardBox.polygon_points.map(([px, py]) => [
        Math.max(0, Math.min(imgWidth, px + dx)),
        Math.max(0, Math.min(imgHeight, py + dy)),
      ]);
    }

    const newBox: EditorBox = {
      _uid: `clone-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      panel_index_in_page: boxes.length + 1,
      bbox_x: newX,
      bbox_y: newY,
      bbox_width: clipboardBox.bbox_width,
      bbox_height: clipboardBox.bbox_height,
      polygon_points: newPoly,
      is_full_page: false,
      source: "manual",
    };

    const nextBoxes = [...boxes, newBox].map((b, idx) => ({ ...b, panel_index_in_page: idx + 1 }));
    pushHistory(nextBoxes);
    setSelectedIndex(nextBoxes.length - 1);
    message.success(`Đã dán khung #${nextBoxes.length} (Ctrl+V)`);
  };

  const handleDuplicate = () => {
    if (selectedIndex === null || !boxes[selectedIndex]) {
      message.warning("Vui lòng click chọn 1 khung để nhân bản");
      return;
    }
    const target = boxes[selectedIndex];
    const offsetX = 25;
    const offsetY = 25;
    const newX = Math.min(imgWidth - target.bbox_width, Math.max(0, target.bbox_x + offsetX));
    const newY = Math.min(imgHeight - target.bbox_height, Math.max(0, target.bbox_y + offsetY));

    let newPoly: [number, number][] | null = null;
    if (target.polygon_points && target.polygon_points.length >= 3) {
      const dx = newX - target.bbox_x;
      const dy = newY - target.bbox_y;
      newPoly = target.polygon_points.map(([px, py]) => [
        Math.max(0, Math.min(imgWidth, px + dx)),
        Math.max(0, Math.min(imgHeight, py + dy)),
      ]);
    }

    const newBox: EditorBox = {
      _uid: `dup-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      panel_index_in_page: boxes.length + 1,
      bbox_x: newX,
      bbox_y: newY,
      bbox_width: target.bbox_width,
      bbox_height: target.bbox_height,
      polygon_points: newPoly,
      is_full_page: false,
      source: "manual",
    };

    const nextBoxes = [...boxes, newBox].map((b, idx) => ({ ...b, panel_index_in_page: idx + 1 }));
    pushHistory(nextBoxes);
    setSelectedIndex(nextBoxes.length - 1);
    message.success(`Đã nhân bản khung #${nextBoxes.length} (Ctrl+D)`);
  };

  const handleNudge = (deltaX: number, deltaY: number) => {
    if (selectedIndex === null || !boxes[selectedIndex]) return;
    const next = [...boxes];
    const target = { ...next[selectedIndex] };
    const curX = target.bbox_x;
    const curY = target.bbox_y;
    const clampedX = Math.max(0, Math.min(imgWidth - target.bbox_width, curX + deltaX));
    const clampedY = Math.max(0, Math.min(imgHeight - target.bbox_height, curY + deltaY));
    const actualDx = clampedX - curX;
    const actualDy = clampedY - curY;

    target.bbox_x = clampedX;
    target.bbox_y = clampedY;

    if (target.polygon_points && target.polygon_points.length >= 3) {
      target.polygon_points = target.polygon_points.map(([px, py]) => [
        Math.max(0, Math.min(imgWidth, px + actualDx)),
        Math.max(0, Math.min(imgHeight, py + actualDy)),
      ]);
    }
    next[selectedIndex] = target;
    pushHistory(next);
  };

  // Hệ thống phím tắt bàn phím toàn diện (Undo, Redo, Copy, Cut, Paste, Duplicate, Nudge, Delete, Esc, R, P)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // 1. Hoàn tác (Undo): Ctrl+Z (không giữ Shift)
      if (isCtrlOrCmd && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // 2. Làm lại (Redo): Ctrl+Y hoặc Ctrl+Shift+Z
      if (
        (isCtrlOrCmd && e.key.toLowerCase() === "y") ||
        (isCtrlOrCmd && e.shiftKey && e.key.toLowerCase() === "z")
      ) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // 3. Sao chép (Copy): Ctrl+C
      if (isCtrlOrCmd && e.key.toLowerCase() === "c") {
        e.preventDefault();
        handleCopy();
        return;
      }

      // 4. Cắt (Cut): Ctrl+X
      if (isCtrlOrCmd && e.key.toLowerCase() === "x") {
        e.preventDefault();
        handleCut();
        return;
      }

      // 5. Dán (Paste): Ctrl+V
      if (isCtrlOrCmd && e.key.toLowerCase() === "v") {
        e.preventDefault();
        handlePaste();
        return;
      }

      // 6. Nhân bản nhanh (Duplicate): Ctrl+D
      if (isCtrlOrCmd && e.key.toLowerCase() === "d") {
        e.preventDefault();
        handleDuplicate();
        return;
      }

      // 7. Xoá khung: Delete hoặc Backspace
      if ((e.key === "Delete" || e.key === "Backspace") && selectedIndex !== null) {
        e.preventDefault();
        handleDeleteBox(selectedIndex);
        return;
      }

      // 8. Thoát / Huỷ chế độ: Escape
      if (e.key === "Escape") {
        e.preventDefault();
        if (drawModeType === "polygon") {
          setDrawModeType("none");
          setActivePolygonPoints([]);
          setMousePos(null);
          message.info("Đã huỷ vẽ đa giác");
        } else if (drawModeType === "rect") {
          setDrawModeType("none");
        } else {
          setSelectedIndex(null);
        }
        return;
      }

      // 9. Phím tắt công cụ: R (Chữ nhật), P (Đa giác)
      if (!isCtrlOrCmd) {
        if (e.key.toLowerCase() === "r") {
          e.preventDefault();
          setDrawModeType("rect");
          setActivePolygonPoints([]);
          message.info("Chế độ: Vẽ chữ nhật (R)");
          return;
        }
        if (e.key.toLowerCase() === "p") {
          e.preventDefault();
          setDrawModeType("polygon");
          setActivePolygonPoints([]);
          message.info("Chế độ: Vẽ đa giác (P)");
          return;
        }
      }

      // 10. Phím mũi tên căn chỉnh toạ độ (Nudge)
      if (selectedIndex !== null) {
        const step = e.shiftKey ? 10 : 1;
        if (e.key === "ArrowUp") {
          e.preventDefault();
          handleNudge(0, -step);
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          handleNudge(0, step);
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          handleNudge(-step, 0);
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          handleNudge(step, 0);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedIndex,
    historyIndex,
    history,
    boxes,
    clipboardBox,
    drawModeType,
    imgWidth,
    imgHeight,
  ]);

  if (!page) {
    return (
      <Card style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Empty description="Chọn một trang truyện bên trái để biên tập khung tranh" />
      </Card>
    );
  }

  const token = getAccessToken();
  const pageImageUrl = token
    ? `/api/v1/chapters/${page.chapter_id}/pages/${page.id}/file?token=${encodeURIComponent(token)}`
    : `/api/v1/chapters/${page.chapter_id}/pages/${page.id}/file`;

  // Thuật toán sắp xếp các khung theo vị trí toạ độ và hướng đọc
  const sortBoxesByReadingOrder = (list: EditorBox[]): EditorBox[] => {
    if (list.length <= 1) return list;
    const h = imgHeight || 1200;
    const rowBandThreshold = Math.max(30, h * 0.06);

    const sortedByY = [...list].sort((a, b) => a.bbox_y - b.bbox_y);
    const rows: EditorBox[][] = [];

    for (const b of sortedByY) {
      let placed = false;
      const bCenterY = b.bbox_y + b.bbox_height / 2;
      for (const r of rows) {
        const rowCenterY =
          r.reduce((sum, item) => sum + (item.bbox_y + item.bbox_height / 2), 0) / r.length;
        if (Math.abs(rowCenterY - bCenterY) <= rowBandThreshold) {
          r.push(b);
          placed = true;
          break;
        }
      }
      if (!placed) {
        rows.push([b]);
      }
    }

    const result: EditorBox[] = [];
    for (const r of rows) {
      if (readingDirection === "ltr") {
        r.sort((a, b) => a.bbox_x - b.bbox_x);
      } else {
        r.sort((a, b) => b.bbox_x - a.bbox_x);
      }
      for (const b of r) {
        result.push(b);
      }
    }

    return result.map((b, idx) => ({
      ...b,
      panel_index_in_page: idx + 1,
    }));
  };

  const finishPolygon = (pts: [number, number][]) => {
    if (pts.length < 3) {
      message.warning("Khung đa giác cần ít nhất 3 điểm!");
      return;
    }
    const minX = Math.max(0, Math.min(...pts.map((p) => p[0])));
    const minY = Math.max(0, Math.min(...pts.map((p) => p[1])));
    const maxX = Math.min(imgWidth, Math.max(...pts.map((p) => p[0])));
    const maxY = Math.min(imgHeight, Math.max(...pts.map((p) => p[1])));

    const newIndex = boxes.length + 1;
    const newBox: EditorBox = {
      _uid: `poly-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      panel_index_in_page: newIndex,
      bbox_x: minX,
      bbox_y: minY,
      bbox_width: Math.max(20, maxX - minX),
      bbox_height: Math.max(20, maxY - minY),
      polygon_points: pts,
      is_full_page: false,
      source: "manual",
    };

    const updated = sortBoxesByReadingOrder([...boxes, newBox]);
    pushHistory(updated);
    const newBoxIdx = updated.findIndex((b) => b._uid === newBox._uid);
    setSelectedIndex(newBoxIdx !== -1 ? newBoxIdx : null);

    setActivePolygonPoints([]);
    setMousePos(null);
    setDrawModeType("none");
    message.success("Đã tạo khung đa giác thành công!");
  };

  const handleMouseDownOnCanvas = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = Math.round((e.clientX - rect.left) / scale);
    const mouseY = Math.round((e.clientY - rect.top) / scale);

    if (drawModeType === "polygon") {
      // Nếu click gần điểm bắt đầu (trong 18px) và đã có ít nhất 3 điểm -> Khép góc
      if (activePolygonPoints.length >= 3) {
        const first = activePolygonPoints[0];
        const dist = Math.hypot(first[0] - mouseX, first[1] - mouseY);
        if (dist <= 18) {
          finishPolygon(activePolygonPoints);
          return;
        }
      }
      setActivePolygonPoints((prev) => [...prev, [mouseX, mouseY]]);
      return;
    }

    if (drawModeType === "rect") {
      // Bắt đầu vẽ box chữ nhật mới
      const newIndex = boxes.length + 1;
      const newBox: EditorBox = {
        _uid: `rect-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        panel_index_in_page: newIndex,
        bbox_x: mouseX,
        bbox_y: mouseY,
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

  const handleDoubleClickOnCanvas = (e: React.MouseEvent) => {
    if (drawModeType === "polygon" && activePolygonPoints.length >= 3) {
      e.stopPropagation();
      finishPolygon(activePolygonPoints);
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
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const currentX = (e.clientX - rect.left) / scale;
    const currentY = (e.clientY - rect.top) / scale;

    if (drawModeType === "polygon") {
      setMousePos({ x: currentX, y: currentY });
    }

    if (!dragMode) return;

    const deltaX = currentX - dragStart.x;
    const deltaY = currentY - dragStart.y;

    if (dragMode === "polygon-vertex" && selectedIndex !== null && activeVertexIdx !== null && origPolygonPoints) {
      setBoxes((prev) => {
        const next = [...prev];
        const target = { ...next[selectedIndex] };
        const newPts = origPolygonPoints.map((p, i) => {
          if (i === activeVertexIdx) {
            return [
              Math.max(0, Math.min(imgWidth, Math.round(p[0] + deltaX))),
              Math.max(0, Math.min(imgHeight, Math.round(p[1] + deltaY))),
            ] as [number, number];
          }
          return p;
        });
        target.polygon_points = newPts;
        const minX = Math.min(...newPts.map((p) => p[0]));
        const minY = Math.min(...newPts.map((p) => p[1]));
        const maxX = Math.max(...newPts.map((p) => p[0]));
        const maxY = Math.max(...newPts.map((p) => p[1]));
        target.bbox_x = minX;
        target.bbox_y = minY;
        target.bbox_width = Math.max(20, maxX - minX);
        target.bbox_height = Math.max(20, maxY - minY);
        next[selectedIndex] = target;
        return next;
      });
      setHasChanges(true);
      return;
    }

    if (dragMode === "polygon-move" && selectedIndex !== null && origPolygonPoints) {
      setBoxes((prev) => {
        const next = [...prev];
        const target = { ...next[selectedIndex] };
        const newPts = origPolygonPoints.map((p) => [
          Math.max(0, Math.min(imgWidth, Math.round(p[0] + deltaX))),
          Math.max(0, Math.min(imgHeight, Math.round(p[1] + deltaY))),
        ] as [number, number]);
        target.polygon_points = newPts;
        const minX = Math.min(...newPts.map((p) => p[0]));
        const minY = Math.min(...newPts.map((p) => p[1]));
        const maxX = Math.max(...newPts.map((p) => p[0]));
        const maxY = Math.max(...newPts.map((p) => p[1]));
        target.bbox_x = minX;
        target.bbox_y = minY;
        target.bbox_width = Math.max(20, maxX - minX);
        target.bbox_height = Math.max(20, maxY - minY);
        next[selectedIndex] = target;
        return next;
      });
      setHasChanges(true);
      return;
    }

    if (!boxInit || selectedIndex === null) return;

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
      if (dragMode === "draw") {
        const valid = boxesRef.current.filter((b) => b.bbox_width >= 20 && b.bbox_height >= 20);
        const sorted = sortBoxesByReadingOrder(valid);
        pushHistory(sorted);
        setSelectedIndex(null);
        setDrawModeType("none");
      } else {
        pushHistory(boxesRef.current);
      }
      setDragMode(null);
      setBoxInit(null);
      setActiveVertexIdx(null);
      setOrigPolygonPoints(null);
    }
  };

  const handleReset = () => {
    let initialBoxes: EditorBox[] = [];
    if (panels && panels.length > 0) {
      initialBoxes = panels.map((p, i) => ({
        id: p.id,
        _uid: p.id ? `panel-${p.id}` : `p-${i}-${Date.now()}`,
        panel_index_in_page: p.panel_index_in_page,
        bbox_x: p.bbox_x,
        bbox_y: p.bbox_y,
        bbox_width: p.bbox_width,
        bbox_height: p.bbox_height,
        polygon_points: p.polygon_points || null,
        is_full_page: p.is_full_page,
        source: p.source || "ai",
      }));
    }
    setBoxes(initialBoxes);
    setHistory([initialBoxes]);
    setHistoryIndex(0);
    setSelectedIndex(null);
    setHasChanges(false);
    setDrawModeType("none");
    setActivePolygonPoints([]);
  };

  const handleSave = async () => {
    try {
      const manualBoxes: PagePanelItem[] = boxes.map(({ _uid, ...b }) => ({
        ...b,
        source: "manual" as const,
      }));
      await onSave(manualBoxes);
      message.success("Đã lưu các khung tranh thành công!");
      setHasChanges(false);
    } catch {
      message.error("Lỗi khi lưu khung tranh");
    }
  };

  return (
    <Card
      title={<span style={{ fontWeight: 600, fontSize: 14 }}>Trang {page.page_number}</span>}
      headStyle={{
        padding: "0 12px",
        minHeight: 46,
      }}
      extra={
        <div style={{ display: "flex", alignItems: "center", overflowX: "auto", maxWidth: "100%" }}>
          <Space size={4} wrap={false} style={{ flexShrink: 0 }}>
            {/* Nhóm Thu phóng */}
            <Tooltip title="Thu nhỏ">
              <Button size="small" icon={<ZoomOutOutlined />} onClick={() => setScale((s) => Math.max(0.3, s - 0.1))} />
            </Tooltip>
            <span style={{ minWidth: 36, textAlign: "center", fontSize: 12, display: "inline-block" }}>
              {Math.round(scale * 100)}%
            </span>
            <Tooltip title="Phóng to">
              <Button size="small" icon={<ZoomInOutlined />} onClick={() => setScale((s) => Math.min(2.0, s + 0.1))} />
            </Tooltip>
            <Tooltip title="Khôi phục kích thước 70%">
              <Button size="small" icon={<ExpandOutlined />} onClick={() => setScale(0.7)} />
            </Tooltip>

            {/* Vạch ngăn cách */}
            <span style={{ width: 1, height: 16, background: "#383838", margin: "0 2px" }} />

            {/* Nhóm Hoàn tác / Làm lại */}
            <Tooltip title="Hoàn tác (Ctrl+Z)">
              <Button
                size="small"
                icon={<UndoOutlined />}
                disabled={!canUndo}
                onClick={handleUndo}
              />
            </Tooltip>
            <Tooltip title="Làm lại (Ctrl+Y hoặc Ctrl+Shift+Z)">
              <Button
                size="small"
                icon={<RedoOutlined />}
                disabled={!canRedo}
                onClick={handleRedo}
              />
            </Tooltip>

            {/* Vạch ngăn cách */}
            <span style={{ width: 1, height: 16, background: "#383838", margin: "0 2px" }} />

            {/* Nút Cắt lại AI */}
            {onExtractSinglePage && (
              <Tooltip title="AI sẽ quét lại và cắt lại riêng trang này (~0.5 giây)">
                <Button
                  size="small"
                  icon={<ScissorOutlined />}
                  loading={isExtractingSinglePage}
                  onClick={onExtractSinglePage}
                  style={{ borderColor: "#fa8c16", color: "#fa8c16" }}
                >
                  Cắt lại
                </Button>
              </Tooltip>
            )}

            {/* Nút vẽ hình chữ nhật */}
            <Button
              size="small"
              type={drawModeType === "rect" ? "primary" : "default"}
              icon={<PlusOutlined />}
              onClick={() => {
                if (drawModeType === "rect") {
                  setDrawModeType("none");
                } else {
                  setDrawModeType("rect");
                  setActivePolygonPoints([]);
                }
              }}
            >
              {drawModeType === "rect" ? "Đang vẽ chữ nhật" : "Chữ nhật"}
            </Button>

            {/* Nút vẽ đa giác */}
            <Button
              size="small"
              type={drawModeType === "polygon" ? "primary" : "default"}
              icon={<BorderOuterOutlined />}
              onClick={() => {
                if (drawModeType === "polygon") {
                  setDrawModeType("none");
                  setActivePolygonPoints([]);
                } else {
                  setDrawModeType("polygon");
                  setActivePolygonPoints([]);
                  message.info("Click các góc trên ảnh để vẽ đa giác. Nhấp đúp hoặc click điểm đầu để khép kín.");
                }
              }}
              style={drawModeType === "polygon" ? { borderColor: "#fa8c16", backgroundColor: "#fa8c16", color: "#fff" } : {}}
            >
              {drawModeType === "polygon" ? "Đang vẽ đa giác" : "Đa giác"}
            </Button>

            {/* Thao tác khi đang vẽ đa giác */}
            {drawModeType === "polygon" && (
              <Space size={4}>
                <Button
                  size="small"
                  type="primary"
                  disabled={activePolygonPoints.length < 3}
                  onClick={() => finishPolygon(activePolygonPoints)}
                  style={{ backgroundColor: "#52c41a" }}
                >
                  Xong ({activePolygonPoints.length}p)
                </Button>
                <Button
                  size="small"
                  onClick={() => {
                    setDrawModeType("none");
                    setActivePolygonPoints([]);
                    setMousePos(null);
                  }}
                >
                  Huỷ
                </Button>
              </Space>
            )}

            {/* Sắp xếp đánh số theo vị trí */}
            {boxes.length > 1 && (
              <Tooltip title="Tự động sắp xếp lại số thứ tự khung theo vị trí toạ độ (Trên xuống dưới, Phải sang trái)">
                <Button
                  size="small"
                  icon={<OrderedListOutlined />}
                  onClick={() => {
                    setBoxes((prev) => sortBoxesByReadingOrder(prev));
                    setHasChanges(true);
                    message.info("Đã đánh số lại các khung theo vị trí toạ độ");
                  }}
                >
                  Đánh số
                </Button>
              </Tooltip>
            )}

            {/* Nút xoá khung khi đang chọn */}
            {selectedIndex !== null && boxes[selectedIndex] && (
              <Tooltip title="Xoá khung tranh đang chọn (hoặc bấm phím Delete)">
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleDeleteBox(selectedIndex)}
                >
                  Xoá #{boxes[selectedIndex].panel_index_in_page}
                </Button>
              </Tooltip>
            )}

            {/* Vạch ngăn cách trước nhóm hành động Lưu / Huỷ */}
            {(hasChanges || isSaving) && (
              <span style={{ width: 1, height: 16, background: "#383838", margin: "0 2px" }} />
            )}

            {hasChanges && (
              <Button size="small" icon={<ReloadOutlined />} onClick={handleReset}>
                Hủy
              </Button>
            )}

            <Button
              size="small"
              type="primary"
              icon={<CheckOutlined />}
              disabled={!hasChanges}
              loading={isSaving}
              onClick={handleSave}
            >
              Lưu toạ độ
            </Button>

            {/* Vạch ngăn cách */}
            <span style={{ width: 1, height: 16, background: "#383838", margin: "0 2px" }} />

            {/* Nút xem Bảng phím tắt */}
            <Tooltip title="Xem bảng phím tắt Canvas (Ctrl+Z, Ctrl+C, Ctrl+V...)">
              <Button
                size="small"
                icon={<QuestionCircleOutlined />}
                onClick={() => setShowShortcutModal(true)}
              />
            </Tooltip>
          </Space>
        </div>
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
        onDoubleClick={handleDoubleClickOnCanvas}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{
          position: "relative",
          width: imgWidth * scale,
          height: imgHeight * scale,
          transformOrigin: "top left",
          userSelect: "none",
          boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
          cursor:
            drawModeType === "rect" || drawModeType === "polygon"
              ? "crosshair"
              : "default",
        }}
      >
        {/* Ảnh trang truyện nền */}
        <img
          src={pageImageUrl}
          alt={`Page ${page.page_number}`}
          style={{
            width: "100%",
            height: "100%",
            display: "block",
            pointerEvents: "none",
          }}
        />

        {/* Lớp SVG cho Khung Đa Giác & Đường vẽ đang dở */}
        <svg
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: 3,
          }}
        >
          {/* 1. Các khung đa giác đã hoàn tất */}
          {boxes.map((box, idx) => {
            if (!box.polygon_points || box.polygon_points.length < 3) return null;
            const isSelected = selectedIndex === idx;
            const borderColor = isSelected ? "#ff4d4f" : "#1890ff";
            const bgColor = isSelected ? "rgba(255, 77, 79, 0.28)" : "rgba(24, 144, 255, 0.22)";
            const ptsStr = box.polygon_points.map((p) => `${p[0] * scale},${p[1] * scale}`).join(" ");

            return (
              <g key={`svg-${box._uid}`}>
                <polygon
                  points={ptsStr}
                  fill={bgColor}
                  stroke={borderColor}
                  strokeWidth={2}
                  style={{ pointerEvents: "all", cursor: "move" }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setSelectedIndex(idx);
                    setDragMode("polygon-move");
                    setOrigPolygonPoints([...box.polygon_points!]);
                    if (!containerRef.current) return;
                    const rect = containerRef.current.getBoundingClientRect();
                    setDragStart({ x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale });
                  }}
                />

                {/* Các điểm neo đỉnh đa giác khi được chọn */}
                {isSelected &&
                  box.polygon_points.map((p, vIdx) => (
                    <circle
                      key={`v-${vIdx}`}
                      cx={p[0] * scale}
                      cy={p[1] * scale}
                      r={6}
                      fill="#fff"
                      stroke="#ff4d4f"
                      strokeWidth={2}
                      style={{ pointerEvents: "all", cursor: "crosshair" }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setSelectedIndex(idx);
                        setDragMode("polygon-vertex");
                        setActiveVertexIdx(vIdx);
                        setOrigPolygonPoints([...box.polygon_points!]);
                        if (!containerRef.current) return;
                        const rect = containerRef.current.getBoundingClientRect();
                        setDragStart({ x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale });
                      }}
                    />
                  ))}
              </g>
            );
          })}

          {/* 2. Hiển thị đường vẽ đa giác đang thao tác */}
          {drawModeType === "polygon" && activePolygonPoints.length > 0 && (
            <g>
              <polyline
                points={activePolygonPoints.map((p) => `${p[0] * scale},${p[1] * scale}`).join(" ")}
                fill="none"
                stroke="#fa8c16"
                strokeWidth={2}
                strokeDasharray="4 2"
              />
              {mousePos && (
                <line
                  x1={activePolygonPoints[activePolygonPoints.length - 1][0] * scale}
                  y1={activePolygonPoints[activePolygonPoints.length - 1][1] * scale}
                  x2={mousePos.x * scale}
                  y2={mousePos.y * scale}
                  stroke="#fa8c16"
                  strokeWidth={2}
                  strokeDasharray="2 2"
                />
              )}
              {activePolygonPoints.map((p, i) => (
                <circle
                  key={`pt-${i}`}
                  cx={p[0] * scale}
                  cy={p[1] * scale}
                  r={i === 0 ? 7 : 4}
                  fill={i === 0 ? "#52c41a" : "#fa8c16"}
                  stroke="#fff"
                  strokeWidth={1.5}
                />
              ))}
            </g>
          )}
        </svg>

        {/* Các khung tranh hình chữ nhật thông thường */}
        {boxes.map((box, idx) => {
          if (box.polygon_points && box.polygon_points.length >= 3) {
            // Huy hiệu cho khung đa giác
            const isSelected = selectedIndex === idx;
            const borderColor = isSelected ? "#ff4d4f" : "#1890ff";
            return (
              <div
                key={`badge-${box._uid}`}
                style={{
                  position: "absolute",
                  left: Math.max(0, box.bbox_x * scale - 2),
                  top: Math.max(0, box.bbox_y * scale - 18),
                  background: borderColor,
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: "bold",
                  padding: "1px 6px",
                  borderRadius: 3,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  zIndex: isSelected ? 12 : 4,
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setSelectedIndex(idx);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedIndex(idx);
                }}
              >
                <span>#{box.panel_index_in_page} ⬡</span>
                {isSelected && (
                  <Tooltip title="Xoá khung này (hoặc phím Delete)">
                    <DeleteOutlined
                      style={{ marginLeft: 4, cursor: "pointer", color: "#fff", fontSize: 12 }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteBox(idx);
                      }}
                    />
                  </Tooltip>
                )}
              </div>
            );
          }

          const isSelected = selectedIndex === idx;
          const borderColor = isSelected ? "#ff4d4f" : "#1890ff";
          const bgColor = isSelected ? "rgba(255, 77, 79, 0.25)" : "rgba(24, 144, 255, 0.2)";

          return (
            <div
              key={`box-${box._uid}`}
              onMouseDown={(e) => handleMouseDownOnBox(e, idx, "move")}
              style={{
                position: "absolute",
                left: box.bbox_x * scale,
                top: box.bbox_y * scale,
                width: box.bbox_width * scale,
                height: box.bbox_height * scale,
                border: `2px solid ${borderColor}`,
                backgroundColor: bgColor,
                cursor: "move",
                boxSizing: "border-box",
                zIndex: isSelected ? 10 : 2,
              }}
            >
              {/* Huy hiệu số thứ tự panel */}
              <div
                style={{
                  position: "absolute",
                  top: -14,
                  left: -2,
                  background: borderColor,
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: "bold",
                  padding: "1px 6px",
                  borderRadius: 3,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setSelectedIndex(idx);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedIndex(idx);
                }}
              >
                <span>#{box.panel_index_in_page}</span>
                {isSelected && (
                  <Tooltip title="Xoá khung này (hoặc phím Delete)">
                    <DeleteOutlined
                      style={{ marginLeft: 4, cursor: "pointer", color: "#fff", fontSize: 12 }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteBox(idx);
                      }}
                    />
                  </Tooltip>
                )}
              </div>

              {/* 4 điểm neo co giãn kích thước hình chữ nhật khi được chọn */}
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

      {/* Modal Bảng phím tắt toàn diện */}
      <Modal
        title={
          <Space>
            <QuestionCircleOutlined style={{ color: "#1890ff" }} />
            <span>Bảng phím tắt Canvas Editor</span>
          </Space>
        }
        open={showShortcutModal}
        onCancel={() => setShowShortcutModal(false)}
        footer={null}
        width={480}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "8px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #303030", paddingBottom: 6 }}>
            <span>Hoàn tác bước trước (Undo)</span>
            <Tag color="blue">Ctrl + Z</Tag>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #303030", paddingBottom: 6 }}>
            <span>Làm lại bước vừa hoàn tác (Redo)</span>
            <Tag color="blue">Ctrl + Y hoặc Ctrl + Shift + Z</Tag>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #303030", paddingBottom: 6 }}>
            <span>Sao chép khung đang chọn (Copy)</span>
            <Tag color="blue">Ctrl + C</Tag>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #303030", paddingBottom: 6 }}>
            <span>Cắt khung đang chọn (Cut)</span>
            <Tag color="blue">Ctrl + X</Tag>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #303030", paddingBottom: 6 }}>
            <span>Dán khung đã chép (Paste)</span>
            <Tag color="blue">Ctrl + V</Tag>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #303030", paddingBottom: 6 }}>
            <span>Nhân bản nhanh khung đang chọn (Duplicate)</span>
            <Tag color="blue">Ctrl + D</Tag>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #303030", paddingBottom: 6 }}>
            <span>Xoá khung đang chọn</span>
            <Tag color="red">Delete hoặc Backspace</Tag>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #303030", paddingBottom: 6 }}>
            <span>Dịch chuyển toạ độ 1px (Nudge)</span>
            <Tag>Phím mũi tên ↑ ↓ ← →</Tag>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #303030", paddingBottom: 6 }}>
            <span>Dịch chuyển nhanh toạ độ 10px</span>
            <Tag>Shift + Phím mũi tên</Tag>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #303030", paddingBottom: 6 }}>
            <span>Bật chế độ vẽ Chữ nhật</span>
            <Tag>R</Tag>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #303030", paddingBottom: 6 }}>
            <span>Bật chế độ vẽ Đa giác</span>
            <Tag>P</Tag>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Bỏ chọn hoặc Huỷ chế độ vẽ</span>
            <Tag>Esc</Tag>
          </div>
        </div>
      </Modal>
    </Card>
  );
};
