import { Alert, Button, Form, Input } from "antd";
import { useState } from "react";

import { useAuth } from "../hooks/useAuth";
import { loginErrorMessage } from "../lib/messages";

interface LoginValues {
  identifier: string;
  password: string;
}

export function LoginForm({ onSuccess }: { onSuccess(): void }) {
  const { login, notice, clearNotice } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleFinish = async ({ identifier, password }: LoginValues) => {
    setSubmitting(true);
    setError(null);
    clearNotice();
    try {
      await login(identifier.trim(), password);
      onSuccess();
    } catch (caught) {
      setError(loginErrorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
      {!error && notice && (
        <Alert type="warning" showIcon message={notice} style={{ marginBottom: 16 }} />
      )}
      <Form<LoginValues>
        layout="vertical"
        size="middle"
        requiredMark={false}
        onFinish={handleFinish}
      >
        <Form.Item
          name="identifier"
          label="Username hoặc email"
          rules={[{ required: true, whitespace: true, message: "Nhập username hoặc email" }]}
        >
          <Input autoFocus autoComplete="username" placeholder="admin hoặc admin@example.com" />
        </Form.Item>
        <Form.Item
          name="password"
          label="Mật khẩu"
          rules={[{ required: true, message: "Nhập mật khẩu" }]}
        >
          <Input.Password autoComplete="current-password" placeholder="••••••••" />
        </Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          block
          loading={submitting}
          style={{ marginTop: 8 }}
        >
          Vào studio
        </Button>
      </Form>
    </>
  );
}
