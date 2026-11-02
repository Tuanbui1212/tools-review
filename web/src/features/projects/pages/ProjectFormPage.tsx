import { errorMessage, FolderIcon, PageHeader } from "@crt/shared";
import {
  Alert,
  Breadcrumb,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  message,
  Radio,
  Row,
  Select,
  Spin,
} from "antd";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { useCreateProject, useProject, useUpdateProject } from "../hooks/useProjects";
import {
  AUTOMATION_LEVEL_LABELS,
  COMIC_TYPE_LABELS,
  DEFAULT_DIRECTION_FOR_TYPE,
  READING_DIRECTION_LABELS,
  type AutomationLevel,
  type ComicType,
  type ProjectCreateInput,
  type ReadingDirection,
} from "../types";

interface FormValues {
  name: string;
  description?: string;
  comic_type: ComicType;
  reading_direction: ReadingDirection;
  source_lang: string;
  target_lang: string;
  genre?: string[];
  automation_level: AutomationLevel;
}

const DEFAULT_LANG_FOR_TYPE: Record<ComicType, string> = {
  manga: "ja",
  manhwa: "ko",
  manhua: "zh",
  webtoon: "ko",
  comic: "en",
  vn: "vi",
};

const POPULAR_GENRES = [
  "Hành động (Action)",
  "Phiêu lưu (Adventure)",
  "Hài hước (Comedy)",
  "Kinh dị (Horror)",
  "Tình cảm (Romance)",
  "Trọng sinh",
  "Tu tiên / Huyền huyễn",
  "Khoa học viễn tưởng (Sci-Fi)",
  "Isekai",
  "Shounen",
  "Siêu nhiên (Supernatural)",
  "Đời thường (Slice of Life)",
  "Trinh thám / Bí ẩn",
];

export function ProjectFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm<FormValues>();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isEditing = Boolean(id);
  const projectId = id ? Number(id) : 0;

  const projectQuery = useProject(projectId);
  const project = projectQuery.data;

  const createProject = useCreateProject();
  const updateProject = useUpdateProject();

  useEffect(() => {
    if (isEditing) {
      if (project) {
        form.setFieldsValue({
          name: project.name,
          description: project.description ?? "",
          comic_type: project.comic_type,
          reading_direction: project.reading_direction,
          source_lang: project.source_lang,
          target_lang: project.target_lang,
          genre: project.genre ?? [],
          automation_level: project.automation_level,
        });
      }
    } else {
      form.setFieldsValue({
        comic_type: "manga",
        reading_direction: "rtl",
        source_lang: "ja",
        target_lang: "vi",
        automation_level: "review_script",
      });
    }
  }, [isEditing, project, form]);

  const handleComicTypeChange = (type: ComicType) => {
    form.setFieldsValue({
      reading_direction: DEFAULT_DIRECTION_FOR_TYPE[type],
      source_lang: DEFAULT_LANG_FOR_TYPE[type],
    });
  };

  const handleSubmit = async (values: FormValues) => {
    setSubmitError(null);
    try {
      if (isEditing && project) {
        await updateProject.mutateAsync({
          id: project.id,
          input: {
            name: values.name.trim(),
            description: values.description?.trim() || undefined,
            comic_type: values.comic_type,
            reading_direction: values.reading_direction,
            source_lang: values.source_lang,
            target_lang: values.target_lang,
            genre: values.genre,
            automation_level: values.automation_level,
          },
        });
        message.success("Cập nhật thông tin dự án thành công");
        navigate(`/projects/${project.id}`);
      } else {
        const input: ProjectCreateInput = {
          name: values.name.trim(),
          description: values.description?.trim() || undefined,
          comic_type: values.comic_type,
          reading_direction: values.reading_direction,
          source_lang: values.source_lang,
          target_lang: values.target_lang,
          genre: values.genre || [],
          automation_level: values.automation_level,
        };
        const created = await createProject.mutateAsync(input);
        message.success("Đã tạo dự án mới thành công");
        navigate(`/projects/${created.id}`);
      }
    } catch (err) {
      setSubmitError(errorMessage(err));
    }
  };

  if (isEditing && projectQuery.isLoading) {
    return (
      <div style={{ textAlign: "center", padding: "100px 0" }}>
        <Spin size="large" tip="Đang tải dữ liệu dự án..." />
      </div>
    );
  }

  if (isEditing && (projectQuery.isError || !project)) {
    return (
      <div style={{ maxWidth: 800, margin: "40px auto", padding: "0 20px" }}>
        <Alert
          type="error"
          message="Không tìm thấy dự án"
          description="Dự án không tồn tại hoặc bạn không có quyền chỉnh sửa."
          action={
            <Button type="primary" onClick={() => navigate("/projects")}>
              Quay lại danh sách dự án
            </Button>
          }
        />
      </div>
    );
  }

  const isSubmitting = createProject.isPending || updateProject.isPending;

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", paddingBottom: 60 }}>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: <Link to="/projects">Dự án</Link> },
          ...(isEditing && project
            ? [
                { title: <Link to={`/projects/${project.id}`}>{project.name}</Link> },
                { title: "Chỉnh sửa" },
              ]
            : [{ title: "Tạo dự án mới" }]),
        ]}
      />

      <PageHeader
        icon={<FolderIcon size={24} />}
        title={isEditing ? `Chỉnh sửa dự án: ${project?.name}` : "Tạo dự án truyện mới"}
        subtitle={
          isEditing
            ? "Cập nhật các thông số định dạng, ngôn ngữ dịch và cơ chế tự động hoá của dự án."
            : "Thiết lập thông tin bộ truyện, cấu hình ngôn ngữ và quy trình pipeline tạo video review."
        }
      />

      {submitError && (
        <Alert
          type="error"
          showIcon
          message="Lỗi lưu thông tin"
          description={submitError}
          style={{ marginBottom: 20 }}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={handleSubmit}
        scrollToFirstError
      >
        {/* Phần 1: Thông tin cơ bản */}
        <Card
          title="1. Thông tin bộ truyện"
          style={{
            marginBottom: 20,
            borderRadius: 12,
            borderColor: "var(--crt-border)",
            background: "var(--crt-surface)",
          }}
        >
          <Form.Item
            name="name"
            label={<span style={{ fontWeight: 600 }}>Tên bộ truyện</span>}
            rules={[{ required: true, message: "Vui lòng nhập tên bộ truyện" }]}
            extra="Tên chính thức hoặc tên tiếng Việt thường gọi (ví dụ: One Piece, Solo Leveling, Doraemon…)"
          >
            <Input
              size="large"
              placeholder="Nhập tên bộ truyện..."
              autoFocus={!isEditing}
            />
          </Form.Item>

          <Form.Item
            name="description"
            label={<span style={{ fontWeight: 600 }}>Tóm tắt / Ghi chú dự án</span>}
            extra="Mô tả ngắn gọn bối cảnh truyện hoặc lưu ý nội bộ cho các thành viên trong nhóm."
          >
            <Input.TextArea
              rows={3}
              placeholder="Tóm tắt cốt truyện hoặc ghi chú tiến độ dự án…"
              showCount
              maxLength={1000}
            />
          </Form.Item>
        </Card>

        {/* Phần 2: Định dạng & Hướng đọc & Ngôn ngữ */}
        <Card
          title="2. Định dạng & Ngôn ngữ đọc"
          style={{
            marginBottom: 20,
            borderRadius: 12,
            borderColor: "var(--crt-border)",
            background: "var(--crt-surface)",
          }}
        >
          <Row gutter={20}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="comic_type"
                label={<span style={{ fontWeight: 600 }}>Loại truyện</span>}
                rules={[{ required: true, message: "Vui lòng chọn loại truyện" }]}
                extra="Hệ thống tự động đề xuất hướng đọc và ngôn ngữ gốc phù hợp."
              >
                <Select
                  size="large"
                  options={Object.entries(COMIC_TYPE_LABELS).map(([value, label]) => ({
                    value,
                    label,
                  }))}
                  onChange={handleComicTypeChange}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                name="reading_direction"
                label={<span style={{ fontWeight: 600 }}>Hướng đọc khung hình</span>}
                rules={[{ required: true, message: "Vui lòng chọn hướng đọc" }]}
                extra="Quyết định thứ tự tách khung tranh (panel detection) trong pipeline."
              >
                <Select
                  size="large"
                  options={Object.entries(READING_DIRECTION_LABELS).map(([value, label]) => ({
                    value,
                    label,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: "12px 0 20px" }} />

          <Row gutter={20}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="source_lang"
                label={<span style={{ fontWeight: 600 }}>Ngôn ngữ chữ trong ảnh gốc</span>}
                rules={[{ required: true, message: "Vui lòng chọn ngôn ngữ ảnh gốc" }]}
                extra="Được OCR sử dụng để nhận diện bóng thoại nhân vật."
              >
                <Select
                  size="large"
                  options={[
                    { value: "ja", label: "Tiếng Nhật (ja)" },
                    { value: "ko", label: "Tiếng Hàn (ko)" },
                    { value: "zh", label: "Tiếng Trung (zh)" },
                    { value: "en", label: "Tiếng Anh (en)" },
                    { value: "vi", label: "Tiếng Việt (vi)" },
                  ]}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                name="target_lang"
                label={<span style={{ fontWeight: 600 }}>Ngôn ngữ đầu ra review</span>}
                rules={[{ required: true, message: "Vui lòng chọn ngôn ngữ review" }]}
                extra="Ngôn ngữ sinh kịch bản review và tạo giọng đọc lồng tiếng (TTS)."
              >
                <Select
                  size="large"
                  options={[
                    { value: "vi", label: "Tiếng Việt (vi)" },
                    { value: "en", label: "Tiếng Anh (en)" },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Phần 3: Thể loại truyện */}
        <Card
          title="3. Thể loại truyện (Genres)"
          style={{
            marginBottom: 20,
            borderRadius: 12,
            borderColor: "var(--crt-border)",
            background: "var(--crt-surface)",
          }}
        >
          <Form.Item
            name="genre"
            extra="Chọn từ danh sách gợi ý hoặc gõ từ khoá mới rồi ấn Enter để thêm tag."
          >
            <Select
              mode="tags"
              size="large"
              placeholder="Chọn hoặc gõ thể loại (Hành động, Phiêu lưu, Hài hước…)"
              options={POPULAR_GENRES.map((g) => ({ value: g, label: g }))}
              style={{ width: "100%" }}
            />
          </Form.Item>
        </Card>

        {/* Phần 4: Cơ chế tự động hoá Pipeline */}
        <Card
          title="4. Mức độ tự động & Cổng duyệt Pipeline"
          style={{
            marginBottom: 28,
            borderRadius: 12,
            borderColor: "var(--crt-border)",
            background: "var(--crt-surface)",
          }}
        >
          <Form.Item
            name="automation_level"
            rules={[{ required: true, message: "Vui lòng chọn mức độ tự động" }]}
          >
            <Radio.Group style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
              {Object.entries(AUTOMATION_LEVEL_LABELS).map(([value, item]) => (
                <div
                  key={value}
                  style={{
                    border: "1px solid var(--crt-border)",
                    borderRadius: 10,
                    padding: "14px 18px",
                    background: "var(--crt-bg)",
                    transition: "border-color 0.2s",
                  }}
                >
                  <Radio value={value} style={{ width: "100%", alignItems: "flex-start" }}>
                    <div style={{ marginLeft: 6 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--crt-text-primary)" }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: 13, color: "var(--crt-text-muted)", marginTop: 4 }}>
                        {item.desc}
                      </div>
                    </div>
                  </Radio>
                </div>
              ))}
            </Radio.Group>
          </Form.Item>
        </Card>

        {/* Action Buttons Bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: 14,
            padding: "16px 24px",
            background: "var(--crt-surface)",
            border: "1px solid var(--crt-border)",
            borderRadius: 12,
          }}
        >
          <Button
            size="large"
            onClick={() => navigate(isEditing && project ? `/projects/${project.id}` : "/projects")}
            disabled={isSubmitting}
          >
            Hủy bỏ
          </Button>

          <Button
            type="primary"
            size="large"
            htmlType="submit"
            loading={isSubmitting}
            style={{
              minWidth: 150,
              fontWeight: 600,
              background: "#1677ff",
              borderColor: "#1677ff",
            }}
          >
            {isEditing ? "Lưu thay đổi" : "Tạo dự án mới"}
          </Button>
        </div>
      </Form>
    </div>
  );
}
