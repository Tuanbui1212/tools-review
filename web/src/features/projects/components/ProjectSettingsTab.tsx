import { ArchiveIcon, EditIcon, errorMessage } from "@crt/shared";
import {
  Alert,
  App,
  Button,
  Card,
  Divider,
  Form,
  Input,
  Popconfirm,
  Radio,
  Select,
} from "antd";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useDeleteProject, useUpdateProject } from "../hooks/useProjects";
import {
  AUTOMATION_LEVEL_LABELS,
  COMIC_TYPE_LABELS,
  DEFAULT_DIRECTION_FOR_TYPE,
  READING_DIRECTION_LABELS,
  type AutomationLevel,
  type ComicType,
  type Project,
  type ReadingDirection,
} from "../types";

interface ProjectSettingsTabProps {
  project: Project;
  canManage: boolean;
}

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

const COMMON_GENRES = [
  "Action",
  "Adventure",
  "Comedy",
  "Drama",
  "Fantasy",
  "Horror",
  "Isekai",
  "Martial Arts",
  "Mystery",
  "Romance",
  "Sci-Fi",
  "Shounen",
  "Supernatural",
  "Tu Tiên",
  "Huyền Huyễn",
  "Trọng Sinh",
];

export function ProjectSettingsTab({ project, canManage }: ProjectSettingsTabProps) {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [form] = Form.useForm<FormValues>();
  const [error, setError] = useState<string | null>(null);

  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  useEffect(() => {
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
  }, [project, form]);

  const handleFinish = async (values: FormValues) => {
    setError(null);
    try {
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
      message.success("Đã cập nhật cài đặt dự án thành công!");
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const handleArchive = async () => {
    try {
      await deleteProject.mutateAsync(project.id);
      message.success("Dự án đã được lưu trữ (soft-deleted).");
      navigate("/projects");
    } catch (err) {
      message.error(errorMessage(err));
    }
  };

  return (
    <div style={{ marginTop: 16 }}>
      <Card
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <EditIcon size={18} />
            <span>Cấu hình dự án</span>
          </div>
        }
      >
        {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}

        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          disabled={!canManage}
          style={{ maxWidth: 720 }}
        >
          <Form.Item
            name="name"
            label="Tên dự án"
            rules={[
              { required: true, message: "Vui lòng nhập tên dự án" },
              { min: 3, message: "Tên dự án tối thiểu 3 ký tự" },
            ]}
          >
            <Input placeholder="ví dụ: One Piece Chapter 1100" />
          </Form.Item>

          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={3} placeholder="Tóm tắt nội dung, ghi chú lưu ý khi xử lý..." />
          </Form.Item>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Form.Item
              name="comic_type"
              label="Thể loại truyện"
              rules={[{ required: true }]}
            >
              <Select
                options={Object.entries(COMIC_TYPE_LABELS).map(([k, v]) => ({
                  value: k,
                  label: v,
                }))}
                onChange={(type: ComicType) => {
                  form.setFieldsValue({
                    reading_direction: DEFAULT_DIRECTION_FOR_TYPE[type],
                  });
                }}
              />
            </Form.Item>

            <Form.Item
              name="reading_direction"
              label="Hướng đọc"
              rules={[{ required: true }]}
            >
              <Select
                options={Object.entries(READING_DIRECTION_LABELS).map(([k, v]) => ({
                  value: k,
                  label: v,
                }))}
              />
            </Form.Item>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Form.Item
              name="source_lang"
              label="Ngôn ngữ gốc"
              rules={[{ required: true }]}
            >
              <Select
                options={[
                  { value: "ja", label: "Tiếng Nhật (ja)" },
                  { value: "ko", label: "Tiếng Hàn (ko)" },
                  { value: "zh", label: "Tiếng Trung (zh)" },
                  { value: "en", label: "Tiếng Anh (en)" },
                  { value: "vi", label: "Tiếng Việt (vi)" },
                ]}
              />
            </Form.Item>

            <Form.Item
              name="target_lang"
              label="Ngôn ngữ dịch ra"
              rules={[{ required: true }]}
            >
              <Select
                options={[
                  { value: "vi", label: "Tiếng Việt (vi)" },
                  { value: "en", label: "Tiếng Anh (en)" },
                ]}
              />
            </Form.Item>
          </div>

          <Form.Item name="genre" label="Thể loại / Tags">
            <Select
              mode="tags"
              placeholder="Chọn hoặc gõ tag mới..."
              options={COMMON_GENRES.map((g) => ({ value: g, label: g }))}
            />
          </Form.Item>

          <Form.Item
            name="automation_level"
            label="Chế độ tự động hoá (Gate Control)"
            rules={[{ required: true }]}
          >
            <Radio.Group style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
              {Object.entries(AUTOMATION_LEVEL_LABELS).map(([k, v]) => (
                <Radio key={k} value={k} style={{ alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{v.title}</div>
                    <div style={{ fontSize: 12, color: "var(--crt-text-muted)" }}>{v.desc}</div>
                  </div>
                </Radio>
              ))}
            </Radio.Group>
          </Form.Item>

          {canManage && (
            <Form.Item style={{ marginTop: 24 }}>
              <Button type="primary" htmlType="submit" loading={updateProject.isPending}>
                Lưu thay đổi
              </Button>
            </Form.Item>
          )}
        </Form>

        {canManage && (
          <>
            <Divider style={{ borderColor: "var(--crt-border)" }} />
            <div style={{ marginTop: 24 }}>
              <h4 style={{ color: "var(--crt-status-locked)", margin: "0 0 8px 0" }}>
                Khu vực nguy hiểm
              </h4>
              <p style={{ color: "var(--crt-text-muted)", fontSize: 13, marginBottom: 16 }}>
                Lưu trữ dự án sẽ ẩn dự án khỏi danh sách hoạt động nhưng vẫn bảo lưu dữ liệu để có thể phục hồi khi cần.
              </p>
              <Popconfirm
                title="Lưu trữ dự án này?"
                description="Dự án sẽ được đưa vào kho lưu trữ (soft delete). Bạn có chắc chắn không?"
                okText="Đồng ý lưu trữ"
                cancelText="Huỷ"
                okButtonProps={{ danger: true }}
                onConfirm={handleArchive}
              >
                <Button danger icon={<ArchiveIcon size={16} />} loading={deleteProject.isPending}>
                  Lưu trữ dự án (Archive)
                </Button>
              </Popconfirm>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
