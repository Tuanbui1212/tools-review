import { Alert, App, Form, Input, Modal } from "antd";
import { useState } from "react";

import { errorMessage } from "../../../lib/http";
import { useAuth } from "../hooks/useAuth";

interface ChangePasswordValues {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export function ChangePasswordModal({ open, onClose }: { open: boolean; onClose(): void }) {
  const { changePassword } = useAuth();
  const { message } = App.useApp();
  const [form] = Form.useForm<ChangePasswordValues>();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const close = () => {
    form.resetFields();
    setError(null);
    onClose();
  };

  const handleFinish = async (values: ChangePasswordValues) => {
    setSaving(true);
    setError(null);
    try {
      await changePassword(values.current_password, values.new_password);
      message.success("Đã đổi mật khẩu");
      close();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Đổi mật khẩu"
      open={open}
      okText="Đổi mật khẩu"
      cancelText="Huỷ"
      confirmLoading={saving}
      onOk={() => form.submit()}
      onCancel={close}
      destroyOnClose
    >
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
      <Form form={form} layout="vertical" requiredMark={false} onFinish={handleFinish}>
        <Form.Item
          name="current_password"
          label="Mật khẩu hiện tại"
          rules={[{ required: true, message: "Nhập mật khẩu hiện tại" }]}
        >
          <Input.Password autoComplete="current-password" />
        </Form.Item>
        <Form.Item
          name="new_password"
          label="Mật khẩu mới"
          rules={[
            { required: true, message: "Nhập mật khẩu mới" },
            { min: 8, message: "Tối thiểu 8 ký tự" },
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          name="confirm_password"
          label="Nhập lại mật khẩu mới"
          dependencies={["new_password"]}
          rules={[
            { required: true, message: "Nhập lại mật khẩu mới" },
            ({ getFieldValue }) => ({
              validator: (_, value) =>
                !value || value === getFieldValue("new_password")
                  ? Promise.resolve()
                  : Promise.reject(new Error("Hai mật khẩu không khớp")),
            }),
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
