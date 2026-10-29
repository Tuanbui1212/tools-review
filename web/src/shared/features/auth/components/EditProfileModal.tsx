import { Alert, App, Form, Input, Modal } from "antd";
import { useState } from "react";

import { errorMessage } from "../../../lib/http";
import { useAuth } from "../hooks/useAuth";

export function EditProfileModal({ open, onClose }: { open: boolean; onClose(): void }) {
  const { user, updateDisplayName } = useAuth();
  const { message } = App.useApp();
  const [form] = Form.useForm<{ display_name: string }>();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const close = () => {
    setError(null);
    onClose();
  };

  const handleFinish = async ({ display_name }: { display_name: string }) => {
    setSaving(true);
    setError(null);
    try {
      await updateDisplayName(display_name.trim());
      message.success("Đã lưu tên hiển thị");
      close();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Sửa tên hiển thị"
      open={open}
      okText="Lưu"
      cancelText="Huỷ"
      confirmLoading={saving}
      onOk={() => form.submit()}
      onCancel={close}
      destroyOnClose
    >
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={{ display_name: user?.display_name ?? "" }}
        onFinish={handleFinish}
        preserve={false}
      >
        <Form.Item
          name="display_name"
          label="Tên hiển thị"
          rules={[
            { required: true, whitespace: true, message: "Nhập tên hiển thị" },
            { max: 100, message: "Tối đa 100 ký tự" },
          ]}
        >
          <Input autoFocus />
        </Form.Item>
      </Form>
    </Modal>
  );
}
