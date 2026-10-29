import { ROLE_LABELS, errorMessage, type SystemRole, type User } from "@crt/shared";
import { Alert, App, Form, Input, Modal, Select } from "antd";
import { useState } from "react";

import { useCreateUser, useUpdateUser } from "../hooks/useUsers";

interface UserFormValues {
  username: string;
  email: string;
  password: string;
  display_name?: string;
  system_role: SystemRole;
}

interface UserFormModalProps {
  open: boolean;
  /** Có user: sửa; không có: tạo mới. */
  user: User | null;
  creatableRoles: SystemRole[];
  onClose(): void;
}

export function UserFormModal({ open, user, creatableRoles, onClose }: UserFormModalProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm<UserFormValues>();
  const [error, setError] = useState<string | null>(null);
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const editing = user !== null;

  const close = () => {
    setError(null);
    onClose();
  };

  const handleFinish = async (values: UserFormValues) => {
    setError(null);
    const displayName = values.display_name?.trim() || undefined;
    try {
      if (editing) {
        await updateUser.mutateAsync({
          id: user.id,
          input: { email: values.email.trim(), display_name: displayName },
        });
        message.success("Đã lưu thông tin user");
      } else {
        await createUser.mutateAsync({
          username: values.username.trim(),
          email: values.email.trim(),
          password: values.password,
          display_name: displayName,
          system_role: values.system_role,
        });
        message.success("Đã tạo user");
      }
      close();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  };

  return (
    <Modal
      title={editing ? `Sửa user ${user.username}` : "Tạo user"}
      open={open}
      okText={editing ? "Lưu" : "Tạo"}
      cancelText="Huỷ"
      confirmLoading={createUser.isPending || updateUser.isPending}
      onOk={() => form.submit()}
      onCancel={close}
      destroyOnClose
    >
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        preserve={false}
        initialValues={
          editing
            ? { email: user.email, display_name: user.display_name ?? "" }
            : { system_role: creatableRoles[creatableRoles.length - 1] }
        }
        onFinish={handleFinish}
      >
        {!editing && (
          <Form.Item
            name="username"
            label="Username"
            extra="3–32 ký tự: chữ, số, dấu . _ -"
            rules={[
              { required: true, message: "Nhập username" },
              { pattern: /^[A-Za-z0-9_.-]{3,32}$/, message: "3–32 ký tự: chữ, số, dấu . _ -" },
            ]}
          >
            <Input autoComplete="off" />
          </Form.Item>
        )}
        <Form.Item
          name="email"
          label="Email"
          rules={[
            { required: true, message: "Nhập email" },
            { type: "email", message: "Email không hợp lệ" },
          ]}
        >
          <Input autoComplete="off" />
        </Form.Item>
        <Form.Item
          name="display_name"
          label="Tên hiển thị"
          rules={[{ max: 100, message: "Tối đa 100 ký tự" }]}
        >
          <Input />
        </Form.Item>
        {!editing && (
          <>
            <Form.Item
              name="password"
              label="Mật khẩu"
              rules={[
                { required: true, message: "Nhập mật khẩu" },
                { min: 8, message: "Tối thiểu 8 ký tự" },
              ]}
            >
              <Input.Password autoComplete="new-password" />
            </Form.Item>
            <Form.Item name="system_role" label="Quyền" rules={[{ required: true }]}>
              <Select
                options={creatableRoles.map((role) => ({ value: role, label: ROLE_LABELS[role] }))}
              />
            </Form.Item>
          </>
        )}
      </Form>
    </Modal>
  );
}
