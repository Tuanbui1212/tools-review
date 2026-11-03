import {
  AppstoreOutlined,
  LoadingOutlined,
  ScissorOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Empty,
  Image,
  List,
  message,
  Popconfirm,
  Progress,
  Row,
  Space,
  Tag,
  Typography,
} from "antd";
import React, { useMemo, useState } from "react";

import {
  useChapterPanels,
  usePagePanels,
  useTaskProgress,
  useTriggerExtractPanels,
  useUpdatePagePanels,
} from "../hooks/usePanels";
import type { Chapter, ChapterPage, PagePanelItem } from "../types";
import { PanelCanvasEditor } from "./PanelCanvasEditor";

const { Text } = Typography;

interface Props {
  chapter: Chapter;
  pages: ChapterPage[];
  canEdit: boolean;
}

export const ChapterPanelsTab: React.FC<Props> = ({ chapter, pages, canEdit }) => {
  const [selectedPageId, setSelectedPageId] = useState<number | null>(
    pages.length > 0 ? pages[0].id : null
  );

  // Task đang chạy
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  // Queries
  const { data: chapterPanels = [], refetch: refetchChapterPanels } = useChapterPanels(chapter.id);
  const { data: pagePanels = [], refetch: refetchPagePanels } = usePagePanels(selectedPageId);

  // Mutations
  const extractMutation = useTriggerExtractPanels(chapter.id);
  const updatePageMutation = useUpdatePagePanels(selectedPageId || 0, chapter.id);

  // WebSocket / Polling progress
  const taskProgress = useTaskProgress(activeTaskId, () => {
    message.success("Quá trình cắt khung tranh đã hoàn thành!");
    refetchChapterPanels();
    refetchPagePanels();
  });

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
            <Space size="middle">
              <span style={{ fontWeight: 600, fontSize: 16 }}>
                Cắt khung tranh (Module 05)
              </span>
              <Tag color="blue">{pages.length} trang ảnh</Tag>
              <Tag color="purple">{chapterPanels.length} khung đã nhận diện</Tag>
            </Space>
          </Col>
          <Col>
            <Space>
              <Popconfirm
                title="Cắt khung tranh tự động toàn bộ chapter?"
                description="Hệ thống sẽ chạy thuật toán OpenCV nhận diện và crop từng khung tranh của 50 trang."
                onConfirm={handleStartExtraction}
                okText="Bắt đầu"
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
                  {isProcessing ? "Đang xử lý cắt khung..." : "Tự động cắt toàn bộ Chapter"}
                </Button>
              </Popconfirm>
            </Space>
          </Col>
        </Row>

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
        {/* Cột trái: Cuộn danh sách trang truyện (Filmstrip) */}
        <Col span={5}>
          <Card
            title="Danh sách trang"
            bodyStyle={{ padding: 8, maxHeight: "72vh", overflowY: "auto" }}
          >
            <List
              dataSource={pages}
              renderItem={(p) => {
                const isSelected = p.id === selectedPageId;
                const panelCount = panelCountByPage.get(p.id) || 0;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPageId(p.id)}
                    style={{
                      padding: "8px 12px",
                      marginBottom: 8,
                      borderRadius: 6,
                      cursor: "pointer",
                      border: isSelected ? "2px solid #ff7a18" : "1px solid #303030",
                      backgroundColor: isSelected ? "rgba(255, 122, 24, 0.12)" : "#1f1f1f",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      transition: "all 0.2s",
                    }}
                  >
                    <Space>
                      <Image
                        src={`/api/v1/chapters/${chapter.id}/pages/${p.id}/file`}
                        width={36}
                        height={48}
                        style={{ objectFit: "cover", borderRadius: 4 }}
                        preview={false}
                      />
                      <div>
                        <Text strong style={{ display: "block" }}>
                          Trang {p.page_number}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {p.width}x{p.height}
                        </Text>
                      </div>
                    </Space>

                    <Badge
                      count={`${panelCount} box`}
                      style={{
                        backgroundColor: panelCount > 0 ? "#52c41a" : "#595959",
                      }}
                    />
                  </div>
                );
              }}
            />
          </Card>
        </Col>

        {/* Cột giữa: Interactive Canvas Editor */}
        <Col span={14}>
          <PanelCanvasEditor
            page={selectedPage}
            panels={pagePanels}
            onSave={handleSavePagePanels}
            isSaving={updatePageMutation.isPending}
          />
        </Col>

        {/* Cột phải: Preview các mảnh panel đã cắt */}
        <Col span={5}>
          <Card
            title={
              <Space>
                <AppstoreOutlined />
                <span>Panel trang {selectedPage?.page_number || ""}</span>
                <Tag color="cyan">{pagePanels.length}</Tag>
              </Space>
            }
            bodyStyle={{ padding: 12, maxHeight: "72vh", overflowY: "auto" }}
          >
            {pagePanels.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Chưa có khung tranh nào"
              />
            ) : (
              <List
                dataSource={pagePanels}
                renderItem={(panel) => (
                  <Card
                    key={panel.id}
                    size="small"
                    style={{ marginBottom: 10, background: "#1f1f1f", borderColor: "#303030" }}
                    bodyStyle={{ padding: 8 }}
                  >
                    <div style={{ display: "flex", gap: 10 }}>
                      <Image
                        src={panel.image_url || `/api/v1/chapters/${chapter.id}/panels/${panel.id}/file`}
                        width={70}
                        height={70}
                        style={{ objectFit: "contain", background: "#000", borderRadius: 4 }}
                        fallback="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='70' height='70'><rect width='100%' height='100%' fill='%23262626'/><text x='50%' y='50%' fill='%23888' font-size='12' text-anchor='middle' alignment-baseline='middle'>No Image</text></svg>"
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Space style={{ marginBottom: 4 }}>
                          <Tag color="orange" style={{ fontWeight: 600 }}>
                            #{panel.panel_number}
                          </Tag>
                          <Text style={{ fontSize: 11 }} type="secondary">
                            (Thứ tự {panel.panel_index_in_page})
                          </Text>
                        </Space>
                        <div style={{ fontSize: 11, color: "#8c8c8c" }}>
                          Box: ({panel.bbox_x}, {panel.bbox_y})
                        </div>
                        <div style={{ fontSize: 11, color: "#8c8c8c" }}>
                          Size: {panel.bbox_width}x{panel.bbox_height}px
                        </div>
                      </div>
                    </div>
                  </Card>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};
