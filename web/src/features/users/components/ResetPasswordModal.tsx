import { errorMessage, type User } from "@crt/shared";
import { Alert, App, Form, Input, Modal } from "antd";
import { useState } from "react";

import { useResetPassword } from "../hooks/useUsers";

export function ResetPasswordModal({ user, onClose }: { user: User | null; onClose(): void }) {
  const { message } = App.useApp();
  const [form] = Form.useForm<{ new_password: string }>();
  const [error, setError] = useState<string | null>(null);
  const resetPassword = useResetPassword();

  const close = () => {
    setError(null);
    onClose();
  };

  const handleFinish = async ({ new_password }: { new_password: string }) => {
    if (!user) return;
    setError(null);
    try {
      await resetPassword.mutateAsync({ id: user.id, newPassword: new_password });
      message.success(`Đã đặt lại mật khẩu cho ${user.username}`);
      close();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  };

  return (
    <Modal
      title={user ? `Đặt lại mật khẩu cho ${user.username}` : ""}
      open={user !== null}
      okText="Đặt lại"
      cancelText="Huỷ"
      confirmLoading={resetPassword.isPending}
      onOk={() => form.submit()}
      onCancel={close}
      destroyOnClose
    >
      <Alert
        type="info"
        showIcon
        message="User sẽ bị đăng xuất ở mọi thiết bị và phải đăng nhập lại bằng mật khẩu mới."
        style={{ marginBottom: 16 }}
      />
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
      <Form form={form} layout="vertical" requiredMark={false} preserve={false} onFinish={handleFinish}>
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
      </Form>
    </Modal>
  );
}
