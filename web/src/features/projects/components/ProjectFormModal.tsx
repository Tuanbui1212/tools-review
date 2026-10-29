import { errorMessage } from "@crt/shared";
import { Alert, App, Form, Input, Modal, Radio, Select } from "antd";
import { useEffect, useState } from "react";

import { useCreateProject, useUpdateProject } from "../hooks/useProjects";
import {
  AUTOMATION_LEVEL_LABELS,
  COMIC_TYPE_LABELS,
  DEFAULT_DIRECTION_FOR_TYPE,
  READING_DIRECTION_LABELS,
  type AutomationLevel,
  type ComicType,
  type Project,
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

interface ProjectFormModalProps {
  open: boolean;
  project: Project | null;
  onClose(): void;
}

const DEFAULT_LANG_FOR_TYPE: Record<ComicType, string> = {
  manga: "ja",
  manhwa: "ko",
  manhua: "zh",
  webtoon: "ko",
  comic: "en",
  vn: "vi",
};

export function ProjectFormModal({ open, project, onClose }: ProjectFormModalProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const [error, setError] = useState<string | null>(null);
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const editing = project !== null;

  useEffect(() => {
    if (open) {
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
      } else {
        form.resetFields();
        form.setFieldsValue({
          comic_type: "manga",
          reading_direction: "rtl",
          source_lang: "ja",
          target_lang: "vi",
          automation_level: "review_script",
        });
      }
    }
  }, [open, project, form]);

  const handleComicTypeChange = (type: ComicType) => {
    form.setFieldsValue({
      reading_direction: DEFAULT_DIRECTION_FOR_TYPE[type],
      source_lang: DEFAULT_LANG_FOR_TYPE[type],
    });
  };

  const handleFinish = async (values: FormValues) => {
    setError(null);
    try {
      if (editing && project) {
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
        message.success("Đã cập nhật dự án");
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
        await createProject.mutateAsync(input);
        message.success("Đã tạo dự án mới thành công");
      }
      onClose();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  };

  return (
    <Modal
      title={editing ? `Sửa dự án ${project?.name}` : "Tạo dự án truyện mới"}
      open={open}
      okText={editing ? "Lưu thay đổi" : "Tạo dự án"}
      cancelText="Huỷ"
      confirmLoading={createProject.isPending || updateProject.isPending}
      onOk={() => form.submit()}
      onCancel={onClose}
      width={600}
      destroyOnClose
    >
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
      <Form form={form} layout="vertical" requiredMark={false} onFinish={handleFinish}>
        <Form.Item
          name="name"
          label="Tên bộ truyện"
          rules={[{ required: true, message: "Nhập tên bộ truyện" }]}
        >
          <Input placeholder="Ví dụ: One Piece, Solo Leveling, Doraemon…" autoFocus />
        </Form.Item>

        <Form.Item name="description" label="Mô tả">
          <Input.TextArea rows={2} placeholder="Tóm tắt nội dung hoặc ghi chú dự án…" />
        </Form.Item>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Form.Item name="comic_type" label="Loại truyện" rules={[{ required: true }]}>
            <Select
              options={Object.entries(COMIC_TYPE_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
              onChange={handleComicTypeChange}
            />
          </Form.Item>

          <Form.Item
            name="reading_direction"
            label="Hướng đọc khung hình"
            rules={[{ required: true }]}
          >
            <Select
              options={Object.entries(READING_DIRECTION_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
            />
          </Form.Item>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Form.Item name="source_lang" label="Ngôn ngữ chữ trong ảnh" rules={[{ required: true }]}>
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

          <Form.Item name="target_lang" label="Ngôn ngữ đầu ra review" rules={[{ required: true }]}>
            <Select
              options={[
                { value: "vi", label: "Tiếng Việt (vi)" },
                { value: "en", label: "Tiếng Anh (en)" },
              ]}
            />
          </Form.Item>
        </div>

        <Form.Item name="genre" label="Thể loại">
          <Select
            mode="tags"
            placeholder="Nhập thể loại và ấn Enter (Hành động, Phiêu lưu, Hài…)"
            options={[
              { value: "Hành động" },
              { value: "Phiêu lưu" },
              { value: "Hài hước" },
              { value: "Kinh dị" },
              { value: "Tình cảm" },
              { value: "Trọng sinh" },
              { value: "Tu tiên" },
              { value: "Khoa học viễn tưởng" },
            ]}
          />
        </Form.Item>

        <Form.Item
          name="automation_level"
          label="Mức độ tự động & Cổng duyệt"
          rules={[{ required: true }]}
        >
          <Radio.Group style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
            {Object.entries(AUTOMATION_LEVEL_LABELS).map(([value, item]) => (
              <Radio key={value} value={value} style={{ alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: "var(--crt-muted)" }}>{item.desc}</div>
                </div>
              </Radio>
            ))}
          </Radio.Group>
        </Form.Item>
      </Form>
    </Modal>
  );
}
