import { errorMessage, UploadCloudIcon } from "@crt/shared";
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
  Button,
  Card,
  Col,
  Input,
  InputNumber,
  message,
  Progress,
  Row,
  Spin,
  Upload,
} from "antd";
import type { UploadFile } from "antd/es/upload/interface";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useProject } from "../../projects/hooks/useProjects";
import {
  SortablePreviewImageCard,
  type PreviewImageItem,
} from "../components/SortablePreviewImageCard";
import {
  useChapters,
  useCreateChapter,
} from "../hooks/useChapters";
import { chapterApi } from "../api/chapterApi";

const { Dragger } = Upload;

export function CreateChapterPage() {
  const { projectId: pIdStr } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const projectId = Number(pIdStr);

  const projectQuery = useProject(projectId);
  const chaptersQuery = useChapters(projectId);

  const [chapterNumber, setChapterNumber] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [images, setImages] = useState<PreviewImageItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState<number>(0);
  const [saveStatusText, setSaveStatusText] = useState<string>("");
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cảnh báo người dùng nếu cố F5 hoặc đóng tab khi đang tải ảnh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isSaving) {
        e.preventDefault();
        e.returnValue = "Hệ thống đang tải ảnh lên Google Drive 5TB, bạn có chắc chắn muốn rời khỏi trang?";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isSaving]);

  const createChapterMutation = useCreateChapter(projectId);

  // Tính số chapter tiếp theo tự động tăng
  const nextChapterNumber = useMemo(() => {
    const list = chaptersQuery.data?.items ?? [];
    if (!list.length) return 1;
    const maxNum = Math.max(...list.map((c) => c.chapter_number));
    return maxNum + 1;
  }, [chaptersQuery.data]);

  useEffect(() => {
    if (chapterNumber === null && nextChapterNumber > 0) {
      setChapterNumber(nextChapterNumber);
    }
  }, [nextChapterNumber, chapterNumber]);

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

    setImages((prev) => {
      const oldIndex = prev.findIndex((item) => item.id === active.id);
      const newIndex = prev.findIndex((item) => item.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const batchFilesRef = useRef<File[]>([]);
  const batchTimerRef = useRef<NodeJS.Timeout | null>(null);

  const processBatchFiles = () => {
    const files = [...batchFilesRef.current];
    batchFilesRef.current = [];
    if (!files.length) return;

    // Sắp xếp tên file tự nhiên trước khi đưa vào preview
    const sorted = [...files].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
    );

    const newItems: PreviewImageItem[] = sorted.map((file) => ({
      id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setImages((prev) => [...prev, ...newItems]);
    message.success(`Đã thêm ${newItems.length} ảnh vào danh sách xem trước`);
  };

  const handleBeforeUpload = (file: UploadFile) => {
    const raw: unknown = (file as unknown as { originFileObj?: File })?.originFileObj ?? file;
    if (raw && (raw instanceof File || raw instanceof Blob)) {
      batchFilesRef.current.push(raw as File);
    }

    if (batchTimerRef.current) {
      clearTimeout(batchTimerRef.current);
    }
    batchTimerRef.current = setTimeout(() => {
      processBatchFiles();
    }, 100);

    return false;
  };

  const handleRemoveImage = (id: string) => {
    setImages((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((item) => item.id !== id);
    });
  };

  const handleCancelSave = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      message.info("Đã gửi yêu cầu hủy tải lên");
    }
  };

  const handleSave = async () => {
    if (!chapterNumber || chapterNumber < 1) {
      message.error("Vui lòng nhập số thứ tự chapter (>= 1)");
      return;
    }

    setIsSaving(true);
    setSaveProgress(0);
    setSaveStatusText("Đang khởi tạo chapter và thư mục lưu trữ trên hệ thống...");

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    let createdChapterId: number | null = null;

    try {
      // 1. Tạo Chapter trước (Backend tự động khởi tạo sẵn thư mục trên Google Drive hoặc Local)
      const newChap = await createChapterMutation.mutateAsync({
        chapter_number: chapterNumber,
        title: title.trim() || null,
      });
      createdChapterId = newChap.id;

      // Nếu không đính kèm ảnh: hoàn tất ngay sau khi đã tạo sẵn thư mục
      if (images.length === 0) {
        setSaveProgress(100);
        message.success(`Đã tạo Chapter ${chapterNumber} và khởi tạo sẵn thư mục lưu trữ trên Google Drive!`);
        navigate(`/projects/${projectId}`);
        return;
      }

      // 2. Upload các file ảnh theo đúng thứ tự đã kéo thả sắp xếp (Đo tiến trình thật 100%)
      const orderedFiles = images.map((img) => img.file);
      const totalBytes = orderedFiles.reduce((acc, f) => acc + f.size, 0);
      const totalMbStr = (totalBytes / (1024 * 1024)).toFixed(1);

      setSaveStatusText(`Bắt đầu tải lên ${orderedFiles.length} trang ảnh (${totalMbStr} MB)...`);

      try {
        await chapterApi.uploadImagesWithProgress(
          newChap.id,
          orderedFiles,
          (loaded, total, percent) => {
            const loadedMb = (loaded / (1024 * 1024)).toFixed(1);
            const totalMb = (total / (1024 * 1024)).toFixed(1);
            setSaveProgress(percent);

            if (percent < 99) {
              setSaveStatusText(`Đang tải ảnh lên máy chủ: ${loadedMb} MB / ${totalMb} MB (${percent}%)`);
            } else {
              setSaveStatusText("Dữ liệu đã gửi xong! Đang lưu trữ và đồng bộ lên Google Drive 5TB...");
            }
          },
          abortController.signal
        );
      } catch (uploadErr) {
        // Rollback an toàn: nếu người dùng hủy hoặc upload lỗi, xóa chapter rỗng vừa tạo để không kẹt số thứ tự
        if (createdChapterId) {
          try {
            await chapterApi.delete(createdChapterId);
          } catch {
            // ignore rollback error
          }
        }
        throw uploadErr;
      }

      setSaveProgress(100);
      setSaveStatusText("Hoàn thành! Đang chuyển hướng...");
      message.success(`Đã tạo Chapter ${chapterNumber} và lưu trữ ${orderedFiles.length} trang thành công lên Google Drive!`);

      // Dọn dẹp object URLs
      images.forEach((img) => URL.revokeObjectURL(img.previewUrl));

      // Chuyển về màn hình danh sách chapter của dự án
      navigate(`/projects/${projectId}`);
    } catch (err: unknown) {
      if ((err as { name?: string })?.name === "AbortError") {
        message.warning("Bạn đã hủy lưu chapter. Đã dọn dẹp dữ liệu dở dang.");
      } else {
        message.error(errorMessage(err));
      }
      setIsSaving(false);
      setSaveProgress(0);
      setSaveStatusText("");
    } finally {
      abortControllerRef.current = null;
    }
  };

  if (projectQuery.isLoading) {
    return (
      <div style={{ textAlign: "center", padding: "80px 0" }}>
        <Spin size="large" tip="Đang tải dữ liệu dự án..." />
      </div>
    );
  }

  if (projectQuery.isError || !projectQuery.data) {
    return (
      <div style={{ padding: 24 }}>
        <Alert
          type="error"
          message="Không tìm thấy dự án"
          description="Dự án không tồn tại hoặc bạn không có quyền truy cập."
          action={
            <Button type="primary" onClick={() => navigate("/projects")}>
              Quay lại danh sách dự án
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Thanh tiêu đề Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
          paddingBottom: 16,
          borderBottom: "1px solid var(--crt-border)",
        }}
      >
        <Button
          onClick={() => navigate(`/projects/${projectId}`)}
          disabled={isSaving}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid var(--crt-border)",
            opacity: isSaving ? 0.5 : 1,
          }}
        >
          ← Quay lại
        </Button>

        <h1
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 700,
            color: "var(--crt-text)",
            textAlign: "center",
          }}
        >
          Thêm chapter mới
        </h1>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {isSaving && (
            <Button
              danger
              onClick={handleCancelSave}
              style={{
                height: 38,
                fontWeight: 500,
              }}
            >
              Hủy lưu
            </Button>
          )}
          <Button
            type="primary"
            onClick={handleSave}
            loading={isSaving}
            style={{
              background: "#52c41a",
              borderColor: "#52c41a",
              fontWeight: 600,
              height: 38,
              padding: "0 22px",
            }}
          >
            {isSaving ? "Đang lưu..." : "Lưu chapter"}
          </Button>
        </div>
      </div>

      {isSaving && (
        <div style={{ marginBottom: 20 }}>
          <Alert
            type="info"
            showIcon
            message={
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                  {saveStatusText || "Đang xử lý..."}
                </div>
                <Progress
                  percent={saveProgress}
                  status="active"
                  strokeColor={{
                    "0%": "#108ee9",
                    "100%": "#52c41a",
                  }}
                  format={(percent) => `${percent}%`}
                  style={{ marginTop: 4 }}
                />
              </div>
            }
          />
        </div>
      )}

      {/* Bố cục 2 cột */}
      <Row gutter={[24, 24]}>
        {/* Cột trái: Form thông tin & Upload (gọn gàng) */}
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
              <div style={{ marginBottom: 18 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 14,
                    fontWeight: 600,
                    marginBottom: 8,
                    color: "var(--crt-text)",
                  }}
                >
                  Số chapter{" "}
                  <span style={{ color: "#52c41a", fontWeight: 500, fontSize: 13 }}>
                    (tự động tăng)
                  </span>
                </label>
                <InputNumber
                  min={1}
                  precision={0}
                  value={chapterNumber}
                  onChange={(val) => setChapterNumber(val)}
                  style={{
                    width: "100%",
                    height: 42,
                    fontSize: 16,
                    fontWeight: 600,
                    borderRadius: 8,
                  }}
                  placeholder="1"
                />
              </div>

              {/* Tiêu đề chapter */}
              <div style={{ marginBottom: 18 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 14,
                    fontWeight: 600,
                    marginBottom: 8,
                    color: "var(--crt-text)",
                  }}
                >
                  Tiêu đề chapter
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Hãy nhập nội dung"
                  style={{ height: 42, borderRadius: 8, fontSize: 14 }}
                />
              </div>

              {/* Vùng tải ảnh */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 14,
                    fontWeight: 600,
                    marginBottom: 8,
                    color: "var(--crt-text)",
                  }}
                >
                  Thêm ảnh trang chapter
                </label>
                <Dragger
                  multiple
                  accept="image/png,image/jpeg,image/jpg,image/webp,.png,.jpg,.jpeg,.webp"
                  beforeUpload={handleBeforeUpload}
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
                    <UploadCloudIcon size={36} />
                  </p>
                  <p style={{ fontSize: 14, fontWeight: 600, margin: "0 0 4px", color: "var(--crt-text)" }}>
                    Click hoặc kéo thả ảnh vào đây
                  </p>
                  <p style={{ fontSize: 12, color: "var(--crt-text-muted)", margin: 0 }}>
                    Hỗ trợ nhiều ảnh • Có thể bấm "Lưu" để tạo sẵn thư mục trước
                  </p>
                </Dragger>
              </div>
            </Card>

            {/* Thẻ thống kê: Tổng số trang (xanh lá nổi bật) */}
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
                {images.length}
              </div>
              {images.length === 0 && (
                <div style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.5)", marginTop: 6 }}>
                  (Sẽ tạo sẵn thư mục Google Drive)
                </div>
              )}
            </Card>
          </div>
        </Col>

        {/* Cột phải: Sắp xếp thứ tự trang (kéo thả) */}
        <Col xs={24} md={14} lg={16} xl={17} xxl={19}>
          <Card
            bordered
            title={
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 16, fontWeight: 600 }}>
                  Sắp xếp thứ tự trang (kéo thả)
                </span>
                {images.length > 0 && (
                  <span style={{ fontSize: 13, color: "var(--crt-text-muted)", fontWeight: 400 }}>
                    Kéo thả để thay đổi vị trí • {images.length} trang
                  </span>
                )}
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
            {images.length === 0 ? (
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
                  Bạn có thể kéo thả ảnh vào khung bên trái, hoặc bấm <b>"Lưu chapter"</b> để tạo sẵn thư mục trống trên Google Drive
                </div>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={images.map((item) => item.id)}
                  strategy={rectSortingStrategy}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
                      gap: 16,
                    }}
                  >
                    {images.map((img, index) => (
                      <SortablePreviewImageCard
                        key={img.id}
                        item={img}
                        index={index}
                        onRemove={handleRemoveImage}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
