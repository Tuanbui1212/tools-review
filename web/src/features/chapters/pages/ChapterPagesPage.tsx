import {
  errorMessage,
  UploadCloudIcon,
  useAuth,
} from "@crt/shared";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import {
  Alert,
  Breadcrumb,
  Button,
  Card,
  Col,
  Input,
  message,
  Popconfirm,
  Progress,
  Row,
  Spin,
  Tabs,
  Tag,
  Upload,
} from "antd";
import type { UploadFile } from "antd/es/upload/interface";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";

import { useProject } from "../../projects/hooks/useProjects";
import { ChapterPanelsTab } from "../components/ChapterPanelsTab";
import { SortablePageThumbnailCard } from "../components/SortablePageThumbnailCard";
import {
  useChapter,
  useChapterPages,
  useClearAllPages,
  useReorderPages,
  useUpdateChapter,
  useUploadImages,
} from "../hooks/useChapters";
import { CHAPTER_STATUS_CONFIG, type ChapterPage } from "../types";

const { Dragger } = Upload;

export function ChapterPagesPage() {
  const { projectId: pIdStr, chapterId: cIdStr } = useParams<{
    projectId: string;
    chapterId: string;
  }>();
  const navigate = useNavigate();
  const { user: actor } = useAuth();

  const projectId = Number(pIdStr);
  const chapterId = Number(cIdStr);

  const projectQuery = useProject(projectId);
  const chapterQuery = useChapter(chapterId);
  const pagesQuery = useChapterPages(chapterId);

  const project = projectQuery.data;
  const chapter = chapterQuery.data;
  const originalPages = pagesQuery.data ?? [];

  // Quản lý Tab qua URL query param (?tab=panels)
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || "pages";

  const handleTabChange = (key: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (key === "pages") {
          next.delete("tab");
        } else {
          next.set("tab", key);
        }
        return next;
      },
      { replace: true }
    );
  };

  // State lưu thứ tự trang đang thao tác
  const [localPages, setLocalPages] = useState<ChapterPage[]>([]);
  const [hasOrderChanged, setHasOrderChanged] = useState(false);

  // State sửa nhanh tiêu đề
  const [editingTitle, setEditingTitle] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  useEffect(() => {
    setLocalPages(originalPages);
    setHasOrderChanged(false);
  }, [originalPages]);

  useEffect(() => {
    if (chapter) {
      setEditingTitle(chapter.title || "");
    }
  }, [chapter]);

  const reorderMutation = useReorderPages(chapterId);
  const updateChapterMutation = useUpdateChapter(chapterId, projectId);
  const clearAllMutation = useClearAllPages(chapterId, projectId);
  const uploadImagesMutation = useUploadImages(chapterId, projectId);

  const [uploading, setUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);

  const canEdit = useMemo(() => {
    if (!actor || !project) return false;
    return (
      actor.system_role === "admin" ||
      actor.system_role === "root" ||
      project.my_role === "owner" ||
      project.my_role === "member"
    );
  }, [actor, project]);

  // Cấu hình cảm biến DND
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setLocalPages((prev) => {
      const oldIndex = prev.findIndex((p) => p.id === active.id);
      const newIndex = prev.findIndex((p) => p.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;

      const reordered = arrayMove(prev, oldIndex, newIndex);
      return reordered.map((p, idx) => ({ ...p, page_number: idx + 1 }));
    });
    setHasOrderChanged(true);
  };

  const handleSaveOrder = async () => {
    try {
      const pageIds = localPages.map((p) => p.id);
      await reorderMutation.mutateAsync(pageIds);
      message.success("Đã lưu thứ tự trang mới thành công");
      setHasOrderChanged(false);
    } catch (err) {
      message.error(errorMessage(err));
    }
  };

  const handleUpdateTitle = async () => {
    try {
      await updateChapterMutation.mutateAsync({ title: editingTitle.trim() || null });
      message.success("Đã cập nhật tiêu đề chapter");
      setIsEditingTitle(false);
    } catch (err) {
      message.error(errorMessage(err));
    }
  };

  const handleMarkReady = async () => {
    try {
      await updateChapterMutation.mutateAsync({ status: "ready" });
      message.success("Đã cập nhật trạng thái: Sẵn sàng chạy Pipeline");
    } catch (err) {
      message.error(errorMessage(err));
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAllMutation.mutateAsync();
      message.success("Đã xoá toàn bộ trang ảnh của tập truyện");
    } catch (err) {
      message.error(errorMessage(err));
    }
  };

  const batchFilesRef = useRef<File[]>([]);
  const batchTimerRef = useRef<NodeJS.Timeout | null>(null);

  const processBatchUpload = async () => {
    const filesToUpload = [...batchFilesRef.current];
    batchFilesRef.current = [];
    if (!filesToUpload.length) return;

    setUploading(true);
    setUploadPercent(30);

    try {
      setUploadPercent(60);
      await uploadImagesMutation.mutateAsync(filesToUpload);
      setUploadPercent(100);
      message.success(`Đã tải lên thành công ${filesToUpload.length} trang ảnh`);
      pagesQuery.refetch();
    } catch (err) {
      message.error(errorMessage(err));
    } finally {
      setUploading(false);
      setUploadPercent(0);
    }
  };

  const handleFileIncoming = (file: UploadFile) => {
    const raw: unknown = (file as unknown as { originFileObj?: File })?.originFileObj ?? file;
    if (raw && (raw instanceof File || raw instanceof Blob)) {
      batchFilesRef.current.push(raw as File);
    }

    if (batchTimerRef.current) {
      clearTimeout(batchTimerRef.current);
    }
    batchTimerRef.current = setTimeout(() => {
      processBatchUpload();
    }, 100);

    return false;
  };

  if (projectQuery.isLoading || chapterQuery.isLoading) {
    return (
      <div style={{ textAlign: "center", padding: "80px 0" }}>
        <Spin size="large" tip="Đang tải dữ liệu chapter..." />
      </div>
    );
  }

  if (projectQuery.isError || chapterQuery.isError || !project || !chapter) {
    return (
      <div style={{ padding: 24 }}>
        <Alert
          type="error"
          message="Không tìm thấy tập truyện"
          description="Tập truyện không tồn tại hoặc bạn không có quyền truy cập."
          action={
            <Button type="primary" onClick={() => navigate(`/projects/${projectId}`)}>
              Quay lại dự án
            </Button>
          }
        />
      </div>
    );
  }

  const statusConf = CHAPTER_STATUS_CONFIG[chapter.status] || {
    label: chapter.status,
    color: "default",
  };

  return (
    <div style={{ paddingBottom: 40 }}>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: <Link to="/projects">Dự án</Link> },
          { title: <Link to={`/projects/${projectId}`}>{project.name}</Link> },
          { title: `Chapter ${chapter.chapter_number}` },
        ]}
      />

      {/* Header chính */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 24,
          paddingBottom: 16,
          borderBottom: "1px solid var(--crt-border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Button
            onClick={() => navigate(`/projects/${projectId}`)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid var(--crt-border)",
            }}
          >
            ← Quay lại
          </Button>

          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--crt-text)" }}>
            Chapter {chapter.chapter_number}
            {chapter.title ? `: ${chapter.title}` : ""}
          </h1>
          <Tag color={statusConf.color}>{statusConf.label}</Tag>
        </div>

        {canEdit && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {hasOrderChanged && (
              <Button
                type="primary"
                onClick={handleSaveOrder}
                loading={reorderMutation.isPending}
                style={{ background: "#52c41a", borderColor: "#52c41a", fontWeight: 600 }}
              >
                Lưu thứ tự mới
              </Button>
            )}

            {chapter.total_pages > 0 && chapter.status === "draft" && (
              <Button type="primary" onClick={handleMarkReady}>
                Xác nhận Sẵn sàng xử lý
              </Button>
            )}

            {chapter.total_pages > 0 && (
              <Popconfirm
                title="Xoá tất cả ảnh của chapter này?"
                description="Toàn bộ file ảnh sẽ bị xoá khỏi máy chủ."
                okText="Xoá tất cả"
                cancelText="Huỷ"
                okButtonProps={{ danger: true }}
                onConfirm={handleClearAll}
              >
                <Button danger loading={clearAllMutation.isPending}>
                  Xoá tất cả ảnh
                </Button>
              </Popconfirm>
            )}
          </div>
        )}
      </div>

      {uploading && (
        <div style={{ marginBottom: 20 }}>
          <Alert
            type="info"
            message={
              <div>
                <span style={{ fontWeight: 600 }}>Đang tải lên và kiểm tra tính toàn vẹn ảnh...</span>
                <Progress percent={uploadPercent} status="active" strokeColor="#52c41a" style={{ marginTop: 8 }} />
              </div>
            }
          />
        </div>
      )}

      {/* Hệ thống Tabs: Quản lý trang & Cắt khung tranh (Module 05) */}
      <Tabs
        activeKey={currentTab}
        onChange={handleTabChange}
        type="card"
        items={[
          {
            key: "pages",
            label: `1. Quản lý trang (${localPages.length})`,
            children: (
              <Row gutter={[24, 24]}>
                {/* Cột trái: Thông tin & Upload thêm ảnh (gọn gàng) */}
                <Col xs={24} md={10} lg={8} xl={7} xxl={5}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <Card
                      bordered
                      style={{
                        background: "var(--crt-surface)",
                        borderColor: "var(--crt-border)",
                        borderRadius: 12,
                      }}
                      bodyStyle={{ padding: 20 }}
                    >
                      {/* Số chapter */}
                      <div style={{ marginBottom: 16 }}>
                        <label
                          style={{
                            display: "block",
                            fontSize: 13,
                            fontWeight: 600,
                            marginBottom: 6,
                            color: "var(--crt-text)",
                          }}
                        >
                          Số chapter
                        </label>
                        <Input
                          disabled
                          value={`Chapter ${chapter.chapter_number}`}
                          style={{
                            height: 40,
                            fontWeight: 700,
                            fontSize: 15,
                            borderRadius: 8,
                            background: "rgba(255, 255, 255, 0.04)",
                          }}
                        />
                      </div>

                      {/* Tiêu đề chapter */}
                      <div style={{ marginBottom: 16 }}>
                        <label
                          style={{
                            display: "block",
                            fontSize: 13,
                            fontWeight: 600,
                            marginBottom: 6,
                            color: "var(--crt-text)",
                          }}
                        >
                          Tiêu đề chapter
                        </label>
                        <div style={{ display: "flex", gap: 8 }}>
                          <Input
                            value={editingTitle}
                            onChange={(e) => {
                              setEditingTitle(e.target.value);
                              setIsEditingTitle(true);
                            }}
                            placeholder="Hãy nhập nội dung"
                            style={{ height: 40, borderRadius: 8 }}
                          />
                          {isEditingTitle && (
                            <Button
                              type="primary"
                              onClick={handleUpdateTitle}
                              loading={updateChapterMutation.isPending}
                            >
                              Lưu
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Vùng upload thêm ảnh */}
                      {canEdit && (
                        <div>
                          <label
                            style={{
                              display: "block",
                              fontSize: 13,
                              fontWeight: 600,
                              marginBottom: 6,
                              color: "var(--crt-text)",
                            }}
                          >
                            Thêm ảnh trang chapter
                          </label>
                          <Dragger
                            multiple
                            accept="image/png,image/jpeg,image/jpg,image/webp,.png,.jpg,.jpeg,.webp"
                            disabled={uploading}
                            beforeUpload={handleFileIncoming}
                            showUploadList={false}
                            style={{
                              padding: "20px 12px",
                              background: "rgba(255, 255, 255, 0.02)",
                              border: "1.5px dashed rgba(255, 255, 255, 0.2)",
                              borderRadius: 10,
                              cursor: "pointer",
                            }}
                          >
                            <p style={{ margin: "0 auto 8px", color: "var(--crt-text-muted)" }}>
                              <UploadCloudIcon size={34} />
                            </p>
                            <p style={{ fontSize: 13, fontWeight: 600, margin: "0 0 4px", color: "var(--crt-text)" }}>
                              Click hoặc kéo thả ảnh vào đây
                            </p>
                            <p style={{ fontSize: 12, color: "var(--crt-text-muted)", margin: 0 }}>
                              Hỗ trợ nhiều ảnh hoặc ZIP • Tải lên ngay
                            </p>
                          </Dragger>
                        </div>
                      )}
                    </Card>

                    {/* Thẻ thống kê: Tổng số trang */}
                    <Card
                      bordered
                      style={{
                        background: "rgba(16, 50, 26, 0.5)",
                        borderColor: "rgba(82, 196, 26, 0.3)",
                        borderRadius: 12,
                        textAlign: "center",
                      }}
                      bodyStyle={{ padding: "20px 16px" }}
                    >
                      <div style={{ fontSize: 14, color: "var(--crt-text-muted)", marginBottom: 4 }}>
                        Tổng số trang
                      </div>
                      <div
                        style={{
                          fontSize: 48,
                          fontWeight: 800,
                          color: "#52c41a",
                          lineHeight: 1.1,
                        }}
                      >
                        {localPages.length}
                      </div>
                    </Card>
                  </div>
                </Col>

                {/* Cột phải: Sắp xếp thứ tự trang (kéo thả) */}
                <Col xs={24} md={14} lg={16} xl={17} xxl={19}>
                  <Card
                    bordered
                    title={
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                        <span style={{ fontSize: 16, fontWeight: 600 }}>
                          Sắp xếp thứ tự trang (kéo thả)
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          {hasOrderChanged && (
                            <Tag color="warning" style={{ margin: 0 }}>
                              Chưa lưu thứ tự
                            </Tag>
                          )}
                          {canEdit && hasOrderChanged && (
                            <Button
                              size="small"
                              type="primary"
                              onClick={handleSaveOrder}
                              loading={reorderMutation.isPending}
                              style={{ background: "#52c41a", borderColor: "#52c41a" }}
                            >
                              Lưu thứ tự
                            </Button>
                          )}
                        </div>
                      </div>
                    }
                    style={{
                      background: "var(--crt-surface)",
                      borderColor: "var(--crt-border)",
                      borderRadius: 12,
                      minHeight: 520,
                    }}
                    bodyStyle={{ padding: 20 }}
                  >
                    {pagesQuery.isLoading ? (
                      <div style={{ textAlign: "center", padding: "60px 0" }}>
                        <Spin tip="Đang tải danh sách trang..." />
                      </div>
                    ) : localPages.length === 0 ? (
                      <div
                        style={{
                          textAlign: "center",
                          padding: "100px 20px",
                          color: "var(--crt-text-muted)",
                        }}
                      >
                        <div style={{ opacity: 0.3, marginBottom: 12 }}>
                          <UploadCloudIcon size={64} />
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 500 }}>
                          Chưa có ảnh nào được thêm
                        </div>
                        <div style={{ fontSize: 13, marginTop: 6, opacity: 0.7 }}>
                          Kéo thả ảnh vào vùng bên trái để bắt đầu
                        </div>
                      </div>
                    ) : (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext
                          items={localPages.map((p) => p.id)}
                          strategy={rectSortingStrategy}
                        >
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
                              gap: 16,
                            }}
                          >
                            {localPages.map((page) => (
                              <SortablePageThumbnailCard
                                key={page.id}
                                page={page}
                                chapterId={chapterId}
                                projectId={projectId}
                                canEdit={canEdit}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    )}
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: "panels",
            label: "2. Cắt khung tranh (Module 05)",
            children: (
              <ChapterPanelsTab
                chapter={chapter}
                pages={originalPages}
                canEdit={canEdit}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
