import { errorMessage } from "@crt/shared";
import { Form, Input, InputNumber, message, Modal } from "antd";
import { useEffect } from "react";

import { useCreateChapter, useUpdateChapter } from "../hooks/useChapters";
import type { Chapter } from "../types";

interface CreateChapterModalProps {
  projectId: number;
  open: boolean;
  onClose: () => void;
  chapterToEdit?: Chapter | null;
  nextChapterNumber?: number;
}

export function CreateChapterModal({
  projectId,
  open,
  onClose,
  chapterToEdit,
  nextChapterNumber = 1,
}: CreateChapterModalProps) {
  const [form] = Form.useForm();
  const isEditing = Boolean(chapterToEdit);

  const createMutation = useCreateChapter(projectId);
  const updateMutation = useUpdateChapter(chapterToEdit?.id ?? 0, projectId);

  useEffect(() => {
    if (open) {
      if (chapterToEdit) {
        form.setFieldsValue({
          chapter_number: chapterToEdit.chapter_number,
          title: chapterToEdit.title ?? "",
        });
      } else {
        form.setFieldsValue({
          chapter_number: nextChapterNumber,
          title: "",
        });
      }
    } else {
      form.resetFields();
    }
  }, [open, chapterToEdit, nextChapterNumber, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (isEditing && chapterToEdit) {
        await updateMutation.mutateAsync({
          title: values.title || null,
        });
        message.success("Cập nhật thông tin tập truyện thành công");
      } else {
        await createMutation.mutateAsync({
          chapter_number: values.chapter_number,
          title: values.title || null,
        });
        message.success("Tạo tập truyện mới thành công");
      }
      onClose();
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null && "errorFields" in err) {
        return; // Validation error của Antd
      }
      message.error(errorMessage(err));
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      title={isEditing ? `Sửa thông tin Chapter ${chapterToEdit?.chapter_number}` : "Thêm Tập truyện mới"}
      open={open}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={isSubmitting}
      okText={isEditing ? "Lưu thay đổi" : "Tạo tập truyện"}
      cancelText="Huỷ"
      destroyOnClose
    >
      <Form form={form} layout="vertical" requiredMark={false} style={{ marginTop: 16 }}>
        <Form.Item
          label="Số thứ tự Chapter"
          name="chapter_number"
          rules={[
            { required: true, message: "Vui lòng nhập số chapter" },
            { type: "number", min: 1, message: "Số chapter phải là số nguyên >= 1" },
          ]}
          extra="Số nguyên dương xác định thứ tự đọc trong truyện (ví dụ: 1, 2, 3...)"
        >
          <InputNumber
            min={1}
            precision={0}
            style={{ width: "100%" }}
            placeholder="1"
            disabled={isEditing}
          />
        </Form.Item>

        <Form.Item
          label="Tiêu đề Chapter (không bắt buộc)"
          name="title"
          rules={[{ max: 255, message: "Tiêu đề không quá 255 ký tự" }]}
          extra="Ví dụ: Khởi đầu mới, Đại chiến tại kinh đô..."
        >
          <Input placeholder="Nhập tiêu đề hoặc để trống" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
