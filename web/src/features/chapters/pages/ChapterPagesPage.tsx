import {
  errorMessage,
  FilmIcon,
  PageHeader,
  useAuth,
} from "@crt/shared";
import {
  Alert,
  Breadcrumb,
  Button,
  Card,
  Col,
  Empty,
  message,
  Popconfirm,
  Row,
  Spin,
  Tag,
} from "antd";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { useProject } from "../../projects/hooks/useProjects";
import { ChapterDropzone } from "../components/ChapterDropzone";
import { PageThumbnailCard } from "../components/PageThumbnailCard";
import {
  useChapter,
  useChapterPages,
  useClearAllPages,
  useReorderPages,
  useUpdateChapter,
} from "../hooks/useChapters";
import { CHAPTER_STATUS_CONFIG, type ChapterPage } from "../types";

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

  // State lưu thứ tự trang đang thao tác
  const [localPages, setLocalPages] = useState<ChapterPage[]>([]);
  const [hasOrderChanged, setHasOrderChanged] = useState(false);

  useEffect(() => {
    setLocalPages(originalPages);
    setHasOrderChanged(false);
  }, [originalPages]);

  const reorderMutation = useReorderPages(chapterId);
  const updateChapterMutation = useUpdateChapter(chapterId, projectId);
  const clearAllMutation = useClearAllPages(chapterId, projectId);

  const canEdit = useMemo(() => {
    if (!actor || !project) return false;
    return (
      actor.system_role === "admin" ||
      actor.system_role === "root" ||
      project.my_role === "owner" ||
      project.my_role === "member"
    );
  }, [actor, project]);

  const handleMove = (index: number, direction: "up" | "down") => {
    const newPages = [...localPages];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newPages.length) return;

    const temp = newPages[index];
    newPages[index] = newPages[targetIndex];
    newPages[targetIndex] = temp;

    // Cập nhật lại số trang hiển thị tạm thời
    const reindexed = newPages.map((p, idx) => ({ ...p, page_number: idx + 1 }));
    setLocalPages(reindexed);
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
    <>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: <Link to="/projects">Dự án</Link> },
          { title: <Link to={`/projects/${projectId}`}>{project.name}</Link> },
          { title: `Chapter ${chapter.chapter_number}` },
        ]}
      />

      <PageHeader
        icon={<FilmIcon size={24} />}
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span>
              {chapter.title
                ? `Chapter ${chapter.chapter_number}: ${chapter.title}`
                : `Chapter ${chapter.chapter_number}`}
            </span>
            <Tag color={statusConf.color}>{statusConf.label}</Tag>
            {chapter.total_pages > 0 && <Tag color="cyan">{chapter.total_pages} trang ảnh</Tag>}
          </div>
        }
        subtitle="Quản lý và sắp xếp các trang ảnh truyện trước khi đưa vào pipeline AI xử lý"
        extra={
          canEdit && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {hasOrderChanged && (
                <Button
                  type="primary"
                  onClick={handleSaveOrder}
                  loading={reorderMutation.isPending}
                  style={{ background: "#52c41a", borderColor: "#52c41a" }}
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
                  description="Toàn bộ file ảnh sẽ bị xoá khỏi máy chủ và đưa số trang về 0."
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
          )
        }
      />

      {/* Vùng tải ảnh */}
      {canEdit && (
        <ChapterDropzone
          chapterId={chapterId}
          projectId={projectId}
          onSuccess={() => pagesQuery.refetch()}
        />
      )}

      {/* Lưới danh sách trang ảnh */}
      <Card
        title={
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Danh sách trang truyện ({localPages.length} trang)</span>
            {hasOrderChanged && (
              <Tag color="warning">Có thay đổi thứ tự chưa lưu</Tag>
            )}
          </div>
        }
      >
        {pagesQuery.isLoading ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <Spin tip="Đang nạp danh sách trang..." />
          </div>
        ) : localPages.length === 0 ? (
          <Empty
            description="Chưa có trang ảnh nào. Kéo thả file ảnh hoặc file ZIP vào vùng bên trên để bắt đầu."
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <Row gutter={[16, 16]}>
            {localPages.map((page, idx) => (
              <Col xs={12} sm={8} md={6} lg={4} key={page.id}>
                <PageThumbnailCard
                  page={page}
                  chapterId={chapterId}
                  projectId={projectId}
                  canEdit={canEdit}
                  isFirst={idx === 0}
                  isLast={idx === localPages.length - 1}
                  onMoveUp={() => handleMove(idx, "up")}
                  onMoveDown={() => handleMove(idx, "down")}
                />
              </Col>
            ))}
          </Row>
        )}
      </Card>
    </>
  );
}
