import {
  LoadingOutlined,
  ScissorOutlined,
  SortAscendingOutlined,
} from "@ant-design/icons";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  Alert,
  Button,
  Card,
  Col,
  Dropdown,
  Empty,
  type MenuProps,
  message,
  Popconfirm,
  Progress,
  Row,
  Space,
  Tag,
  Typography,
} from "antd";
import { getAccessToken } from "@crt/shared";
import { useQueryClient } from "@tanstack/react-query";
import React, { useCallback, useEffect, useMemo, useState } from "react";

import { CHAPTER_QUERY_KEYS, useReorderPages } from "../hooks/useChapters";
import {
  useChapterPanels,
  useExtractPagePanels,
  usePagePanels,
  useReorderPanels,
  useTaskProgress,
  useTriggerExtractPanels,
  useUpdatePagePanels,
} from "../hooks/usePanels";
import type { Chapter, ChapterPage, ChapterPanel, PagePanelItem } from "../types";
import { PanelCanvasEditor } from "./PanelCanvasEditor";
import { SortablePageFilmstripItem } from "./SortablePageFilmstripItem";
import { SortablePanelCard } from "./SortablePanelCard";

const { Text } = Typography;

interface Props {
  chapter: Chapter;
  pages: ChapterPage[];
  canEdit: boolean;
}

export const ChapterPanelsTab: React.FC<Props> = ({ chapter, pages, canEdit }) => {
  const token = getAccessToken();
  const [selectedPageId, setSelectedPageId] = useState<number | null>(
    pages.length > 0 ? pages[0].id : null
  );

  // Task đang chạy
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  // Queries
  const { data: chapterPanels = [], refetch: refetchChapterPanels } = useChapterPanels(chapter.id);
  const { data: pagePanels = [], refetch: refetchPagePanels } = usePagePanels(selectedPageId);

  // Mutations
  const queryClient = useQueryClient();
  const extractMutation = useTriggerExtractPanels(chapter.id);
  const extractSinglePageMutation = useExtractPagePanels(chapter.id, selectedPageId);
  const updatePageMutation = useUpdatePagePanels(selectedPageId || 0, chapter.id);
  const reorderMutation = useReorderPanels(chapter.id);
  const reorderPagesMutation = useReorderPages(chapter.id);

  // Danh sách trang cục bộ (local state phục vụ kéo thả & sắp xếp)
  const [localPages, setLocalPages] = useState<ChapterPage[]>([]);
  const [hasPageOrderChanged, setHasPageOrderChanged] = useState(false);

  useEffect(() => {
    setLocalPages(pages);
    setHasPageOrderChanged(false);
  }, [pages]);

  // Cấu hình Sensor kéo thả cho pages
  const pageSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const handleSavePageOrder = async () => {
    const pageIds = localPages.map((p) => p.id);
    try {
      await reorderPagesMutation.mutateAsync(pageIds);
      message.success("Đã lưu thứ tự các trang thành công!");
      setHasPageOrderChanged(false);
      queryClient.invalidateQueries({ queryKey: CHAPTER_QUERY_KEYS.pages(chapter.id) });
      queryClient.invalidateQueries({ queryKey: ["chapters", chapter.id, "panels"] });
      refetchChapterPanels();
    } catch {
      message.error("Lỗi khi lưu thứ tự trang");
    }
  };

  const handleResetPageOrder = () => {
    setLocalPages(pages);
    setHasPageOrderChanged(false);
  };

  const handleMovePage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= localPages.length) return;
    const updated = arrayMove(localPages, fromIndex, toIndex).map((p, idx) => ({
      ...p,
      page_number: idx + 1,
    }));
    setLocalPages(updated);
    setHasPageOrderChanged(true);
  };

  const handleDragEndPages = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = localPages.findIndex((p) => p.id === active.id);
      const newIndex = localPages.findIndex((p) => p.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const updated = arrayMove(localPages, oldIndex, newIndex).map((p, idx) => ({
          ...p,
          page_number: idx + 1,
        }));
        setLocalPages(updated);
        setHasPageOrderChanged(true);
      }
    }
  };

  // Menu sắp xếp nhanh danh sách trang
  const pageSortMenuItems: MenuProps["items"] = [
    {
      key: "natural",
      label: "Tự nhiên theo tên file gốc (1, 2, 10...)",
      onClick: () => {
        const sorted = [...localPages]
          .sort((a, b) =>
            (a.original_filename || "").localeCompare(b.original_filename || "", undefined, {
              numeric: true,
              sensitivity: "base",
            })
          )
          .map((p, idx) => ({ ...p, page_number: idx + 1 }));
        setLocalPages(sorted);
        setHasPageOrderChanged(true);
      },
    },
    {
      key: "reverse",
      label: "Đảo ngược thứ tự (Trang cuối lên đầu)",
      onClick: () => {
        const reversed = [...localPages].reverse().map((p, idx) => ({ ...p, page_number: idx + 1 }));
        setLocalPages(reversed);
        setHasPageOrderChanged(true);
      },
    },
  ];

  // Danh sách panel trang đang chọn (local state phục vụ kéo thả)
  const [localPanels, setLocalPanels] = useState<ChapterPanel[]>([]);
  const [hasPanelOrderChanged, setHasPanelOrderChanged] = useState(false);

  useEffect(() => {
    setLocalPanels(pagePanels);
    setHasPanelOrderChanged(false);
  }, [pagePanels]);

  // Cấu hình Sensor kéo thả mượt mà
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const handleSavePanelOrder = async () => {
    if (!selectedPageId) return;
    const newPageIds = localPanels.map((p) => p.id);
    const newFullIds: number[] = [];
    let pageInserted = false;

    for (const cp of chapterPanels) {
      if (cp.chapter_page_id === selectedPageId) {
        if (!pageInserted) {
          newFullIds.push(...newPageIds);
          pageInserted = true;
        }
      } else {
        newFullIds.push(cp.id);
      }
    }

    try {
      await reorderMutation.mutateAsync(newFullIds);
      message.success("Đã lưu thứ tự các panel thành công!");
      setHasPanelOrderChanged(false);
      refetchChapterPanels();
      refetchPagePanels();
    } catch {
      message.error("Lỗi khi lưu thứ tự panel");
    }
  };

  const handleResetPanelOrder = () => {
    setLocalPanels(pagePanels);
    setHasPanelOrderChanged(false);
  };

  const handleMove = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= localPanels.length) return;
    const updated = arrayMove(localPanels, fromIndex, toIndex).map((p, idx) => ({
      ...p,
      panel_index_in_page: idx + 1,
    }));
    setLocalPanels(updated);
    setHasPanelOrderChanged(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = localPanels.findIndex((p) => p.id === active.id);
      const newIndex = localPanels.findIndex((p) => p.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const updated = arrayMove(localPanels, oldIndex, newIndex).map((p, idx) => ({
          ...p,
          panel_index_in_page: idx + 1,
        }));
        setLocalPanels(updated);
        setHasPanelOrderChanged(true);
      }
    }
  };

  // WebSocket / Polling progress
  const handleCompleted = useCallback(() => {
    message.success("Quá trình cắt khung tranh đã hoàn thành!");
    queryClient.invalidateQueries({ queryKey: ["chapters", chapter.id, "panels"] });
    queryClient.invalidateQueries({ queryKey: ["chapter-pages"] });
    refetchChapterPanels();
    refetchPagePanels();
  }, [chapter.id, queryClient, refetchChapterPanels, refetchPagePanels]);

  const taskProgress = useTaskProgress(activeTaskId, handleCompleted);

  const isProcessing =
    taskProgress?.status === "processing" ||
    taskProgress?.status === "pending" ||
    extractMutation.isPending;

  // Bản đồ đếm số panel theo page_id
  const panelCountByPage = useMemo(() => {
    const map = new Map<number, number>();
    for (const p of chapterPanels) {
      map.set(p.chapter_page_id, (map.get(p.chapter_page_id) || 0) + 1);
    }
    return map;
  }, [chapterPanels]);

  // Trang đang chọn
  const selectedPage = useMemo(() => {
    return pages.find((p) => p.id === selectedPageId) || null;
  }, [pages, selectedPageId]);

  const handleStartExtraction = async () => {
    try {
      const task = await extractMutation.mutateAsync();
      setActiveTaskId(task.task_id);
      message.info("Đã gửi yêu cầu cắt khung tranh sang Worker AI...");
    } catch {
      message.error("Không thể khởi động tác vụ cắt khung");
    }
  };

  const handleExtractSinglePage = async () => {
    if (!selectedPageId) return;
    try {
      await extractSinglePageMutation.mutateAsync();
      message.success(`Đã tự động cắt lại trang ${selectedPage?.page_number || ""} thành công!`);
      refetchChapterPanels();
      refetchPagePanels();
    } catch {
      message.error("Lỗi khi tự động cắt trang này");
    }
  };

  const handleSavePagePanels = async (newPanels: PagePanelItem[]) => {
    if (!selectedPageId) return;
    await updatePageMutation.mutateAsync(newPanels);
    refetchChapterPanels();
    refetchPagePanels();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* 1. Header Toolbar & Progress Bar */}
      <Card bodyStyle={{ padding: "12px 20px" }}>
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col>
            <Space size="middle" wrap>
              <span style={{ fontWeight: 600, fontSize: 16 }}>
                Cắt khung tranh (Module 05)
              </span>
              <Tag color="blue">{pages.length} trang ảnh</Tag>
              <Tag color="purple">{chapterPanels.length} khung đã nhận diện</Tag>
              {selectedPage && (
                <Tag color="default">
                  Trang {selectedPage.page_number} ({selectedPage.width}x{selectedPage.height}px)
                </Tag>
              )}
            </Space>
          </Col>
          <Col>
            <Space>
              <Popconfirm
                title={
                  chapterPanels.length > 0
                    ? "Cắt lại toàn bộ Chapter?"
                    : "Cắt khung tranh tự động toàn bộ chapter?"
                }
                description={
                  chapterPanels.length > 0
                    ? `Hệ thống sẽ chạy lại thuật toán OpenCV và ghi đè lại toàn bộ khung tranh của ${pages.length} trang.`
                    : `Hệ thống sẽ chạy thuật toán OpenCV nhận diện và crop từng khung tranh của ${pages.length} trang.`
                }
                onConfirm={handleStartExtraction}
                okText={chapterPanels.length > 0 ? "Cắt lại" : "Bắt đầu"}
                cancelText="Huỷ"
                disabled={!canEdit || isProcessing || pages.length === 0}
              >
                <Button
                  type="primary"
                  icon={isProcessing ? <LoadingOutlined /> : <ScissorOutlined />}
                  loading={isProcessing}
                  disabled={!canEdit || pages.length === 0}
                  style={{
                    background: "linear-gradient(135deg, #ff7a18 0%, #af002d 100%)",
                    border: "none",
                  }}
                >
                  {isProcessing
                    ? "Đang xử lý cắt khung..."
                    : chapterPanels.length > 0
                      ? "Cắt lại toàn bộ Chapter"
                      : "Tự động cắt toàn bộ Chapter"}
                </Button>
              </Popconfirm>
            </Space>
          </Col>
        </Row>

        {/* Thông báo hoàn thành 100% */}
        {taskProgress?.status === "completed" && (
          <div style={{ marginTop: 14 }}>
            <Alert
              type="success"
              showIcon
              closable
              message={`✅ Hoàn tất bóc tách tự động: Đã nhận diện thành công ${chapterPanels.length} khung tranh trên toàn bộ chapter.`}
            />
          </div>
        )}

        {/* Thanh Progress Bar thời gian thực khi đang chạy */}
        {isProcessing && (
          <div style={{ marginTop: 14 }}>
            <Alert
              type="info"
              showIcon
              message={
                <div>
                  <Space style={{ marginBottom: 4 }}>
                    <Text strong>Tiến độ xử lý:</Text>
                    <Text>{taskProgress?.stage_message || "Đang xếp hàng chờ worker-ai..."}</Text>
                  </Space>
                  <Progress
                    percent={taskProgress?.progress || 0}
                    status="active"
                    strokeColor={{ "0%": "#108ee9", "100%": "#87d068" }}
                  />
                </div>
              }
            />
          </div>
        )}
      </Card>

      {/* 2. Khu vực làm việc chính (3 Cột) */}
      <Row gutter={16} style={{ minHeight: "72vh" }}>
        {/* Cột trái: Cuộn danh sách trang truyện (Filmstrip - Hỗ trợ kéo thả & đổi thứ tự trang) */}
        <Col span={5}>
          <Card
            title="Danh sách trang"
            extra={
              <Space size={4}>
                {hasPageOrderChanged && (
                  <>
                    <Button size="small" onClick={handleResetPageOrder}>
                      Huỷ
                    </Button>
                    <Button
                      size="small"
                      type="primary"
                      loading={reorderPagesMutation.isPending}
                      onClick={handleSavePageOrder}
                    >
                      Lưu trang
                    </Button>
                  </>
                )}
                {canEdit && (
                  <Dropdown menu={{ items: pageSortMenuItems }} trigger={["click"]}>
                    <Button size="small" icon={<SortAscendingOutlined />} title="Sắp xếp nhanh">
                      Xếp
                    </Button>
                  </Dropdown>
                )}
              </Space>
            }
            bodyStyle={{ padding: 8, maxHeight: "72vh", overflowY: "auto" }}
          >
            <div>
              {localPages.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có trang ảnh nào" />
              ) : (
                <DndContext
                  id="pages-dnd-context"
                  sensors={pageSensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEndPages}
                >
                  <SortableContext
                    items={localPages.map((p) => p.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {localPages.map((p, idx) => {
                      const isSelected = p.id === selectedPageId;
                      const panelCount = panelCountByPage.get(p.id) || 0;
                      return (
                        <SortablePageFilmstripItem
                          key={p.id}
                          page={p}
                          isSelected={isSelected}
                          panelCount={panelCount}
                          index={idx}
                          total={localPages.length}
                          token={token}
                          chapterId={chapter.id}
                          canEdit={canEdit}
                          onSelect={() => setSelectedPageId(p.id)}
                          onMoveUp={() => handleMovePage(idx, idx - 1)}
                          onMoveDown={() => handleMovePage(idx, idx + 1)}
                        />
                      );
                    })}
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </Card>
        </Col>

        {/* Cột giữa: Interactive Canvas Editor */}
        <Col span={14}>
          <PanelCanvasEditor
            page={selectedPage}
            panels={localPanels}
            onSave={handleSavePagePanels}
            isSaving={updatePageMutation.isPending}
            onExtractSinglePage={handleExtractSinglePage}
            isExtractingSinglePage={extractSinglePageMutation.isPending}
          />
        </Col>

        {/* Cột phải: Preview các mảnh panel đã cắt (Kéo thả hoặc bấm nút để đổi thứ tự tuỳ ý) */}
        <Col span={5}>
          <Card
            title={`Panel trang ${selectedPage?.page_number || ""}`}
            extra={
              hasPanelOrderChanged ? (
                <Space size={4}>
                  <Button size="small" onClick={handleResetPanelOrder}>
                    Huỷ
                  </Button>
                  <Button
                    size="small"
                    type="primary"
                    loading={reorderMutation.isPending}
                    onClick={handleSavePanelOrder}
                  >
                    Lưu panel
                  </Button>
                </Space>
              ) : null
            }
            bodyStyle={{ padding: 10, maxHeight: "72vh", overflowY: "auto" }}
          >
            <div>
              {localPanels.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="Chưa có khung tranh nào"
                />
              ) : (
                <DndContext
                  id="panels-dnd-context"
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={localPanels.map((p) => p.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {localPanels.map((panel, idx) => (
                      <SortablePanelCard
                        key={panel.id}
                        panel={panel}
                        index={idx}
                        total={localPanels.length}
                        token={token}
                        chapterId={chapter.id}
                        canEdit={canEdit}
                        onMoveUp={() => handleMove(idx, idx - 1)}
                        onMoveDown={() => handleMove(idx, idx + 1)}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};
