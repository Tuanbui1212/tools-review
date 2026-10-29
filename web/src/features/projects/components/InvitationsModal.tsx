import { MailIcon, errorMessage } from "@crt/shared";
import { App, Button, Empty, List, Modal, Tag } from "antd";

import { useMyInvitations, useRespondInvitation } from "../hooks/useProjects";
import type { ProjectInvitation } from "../types";

interface InvitationsModalProps {
  open: boolean;
  onClose(): void;
}

export function InvitationsModal({ open, onClose }: InvitationsModalProps) {
  const { message } = App.useApp();
  const invitationsQuery = useMyInvitations();
  const respondMutation = useRespondInvitation();

  const handleRespond = async (invitation: ProjectInvitation, accept: boolean) => {
    try {
      await respondMutation.mutateAsync({ id: invitation.id, accept });
      message.success(
        accept
          ? `Đã tham gia dự án "${invitation.project_name}"!`
          : `Đã từ chối lời mời vào "${invitation.project_name}".`,
      );
    } catch (err) {
      message.error(errorMessage(err));
    }
  };

  const invitations = invitationsQuery.data ?? [];

  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <MailIcon size={18} />
          <span>Lời mời tham gia dự án ({invitations.length})</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Đóng
        </Button>,
      ]}
      width={600}
    >
      <div style={{ minHeight: 200, maxHeight: 400, overflowY: "auto", padding: "8px 0" }}>
        {invitations.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Bạn không có lời mời tham gia dự án nào đang chờ."
          />
        ) : (
          <List
            itemLayout="horizontal"
            dataSource={invitations}
            loading={invitationsQuery.isLoading}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Button
                    key="accept"
                    type="primary"
                    size="small"
                    loading={respondMutation.isPending}
                    onClick={() => handleRespond(item, true)}
                  >
                    Đồng ý
                  </Button>,
                  <Button
                    key="decline"
                    danger
                    size="small"
                    loading={respondMutation.isPending}
                    onClick={() => handleRespond(item, false)}
                  >
                    Từ chối
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  title={
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontWeight: 600 }}>{item.project_name}</span>
                      <Tag color="cyan">Lời mời mới</Tag>
                    </div>
                  }
                  description={
                    <div style={{ fontSize: 12, color: "var(--crt-text-muted)" }}>
                      Người mời: <strong>@{item.inviter_username}</strong> •{" "}
                      {new Date(item.created_at).toLocaleString("vi-VN")}
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </div>
    </Modal>
  );
}
