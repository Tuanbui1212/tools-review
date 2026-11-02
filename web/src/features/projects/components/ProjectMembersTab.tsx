import {
  PlusIcon,
  ROLE_LABELS,
  UsersIcon,
  errorMessage,
  type SystemRole,
} from "@crt/shared";
import {
  Alert,
  App,
  Button,
  Card,
  Form,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tag,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useState } from "react";

import {
  useInviteMember,
  useProjectMembers,
  useRemoveMember,
  useUpdateProject,
} from "../hooks/useProjects";
import type { Project, ProjectMember } from "../types";
import { UserSelectCombobox } from "./UserSelectCombobox";

interface ProjectMembersTabProps {
  project: Project;
  canManage: boolean;
}

export function ProjectMembersTab({ project, canManage }: ProjectMembersTabProps) {
  const { message } = App.useApp();
  const membersQuery = useProjectMembers(project.id);
  const inviteMember = useInviteMember(project.id);
  const removeMember = useRemoveMember(project.id);
  const updateProject = useUpdateProject();

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [selectedIdentifiers, setSelectedIdentifiers] = useState<string[]>([]);
  const [inviteErrors, setInviteErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInvite = async () => {
    if (selectedIdentifiers.length === 0) {
      setInviteErrors(["Vui lòng chọn ít nhất một thành viên để mời."]);
      return;
    }
    setInviteErrors([]);
    setIsSubmitting(true);

    const results = await Promise.allSettled(
      selectedIdentifiers.map((id) => inviteMember.mutateAsync(id))
    );

    const successful: string[] = [];
    const failed: { id: string; error: string }[] = [];

    results.forEach((res, index) => {
      const id = selectedIdentifiers[index];
      if (res.status === "fulfilled") {
        successful.push(id);
      } else {
        failed.push({
          id,
          error: errorMessage(res.reason),
        });
      }
    });

    setIsSubmitting(false);

    if (successful.length > 0) {
      message.success(
        `Đã gửi lời mời tới ${successful.length} thành viên (${successful.join(", ")})!`
      );
    }

    if (failed.length === 0) {
      setSelectedIdentifiers([]);
      setInviteModalOpen(false);
    } else {
      // Giữ lại các user bị lỗi để người dùng xem và quyết định
      setSelectedIdentifiers(failed.map((f) => f.id));
      setInviteErrors(failed.map((f) => `${f.id}: ${f.error}`));
    }
  };

  const handleRemove = async (member: ProjectMember) => {
    try {
      await removeMember.mutateAsync(member.user_id);
      message.success(`Đã xoá ${member.username} khỏi dự án.`);
    } catch (err) {
      message.error(errorMessage(err));
    }
  };

  const handleTransferOwnership = async (member: ProjectMember) => {
    try {
      await updateProject.mutateAsync({
        id: project.id,
        input: { owner_id: member.user_id },
      });
      message.success(`Đã chuyển quyền chủ sở hữu cho ${member.username}!`);
    } catch (err) {
      message.error(errorMessage(err));
    }
  };

  const columns: ColumnsType<ProjectMember> = [
    {
      title: "Thành viên",
      key: "user",
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 600, color: "var(--crt-text-primary)" }}>
            {record.display_name || record.username}
          </div>
          <div style={{ fontSize: 12, color: "var(--crt-text-muted)" }}>
            @{record.username} (ID: {record.user_id})
          </div>
        </div>
      ),
    },
    {
      title: "Vai trò hệ thống",
      dataIndex: "system_role",
      key: "system_role",
      width: 150,
      render: (role: SystemRole) => {
        const color = role === "admin" ? "magenta" : role === "root" ? "blue" : "default";
        return <Tag color={color}>{ROLE_LABELS[role] ?? role}</Tag>;
      },
    },
    {
      title: "Vai trò dự án",
      dataIndex: "role",
      key: "role",
      width: 150,
      render: (role: string) => (
        <Tag color={role === "owner" ? "gold" : "cyan"}>
          {role === "owner" ? "Chủ sở hữu" : "Thành viên"}
        </Tag>
      ),
    },
    {
      title: "Ngày tham gia",
      dataIndex: "joined_at",
      key: "joined_at",
      width: 180,
      render: (date: string) => new Date(date).toLocaleString("vi-VN"),
    },
  ];

  if (canManage) {
    columns.push({
      title: "Hành động",
      key: "actions",
      width: 220,
      render: (_, record) => {
        if (record.role === "owner") {
          return <span style={{ fontSize: 12, color: "var(--crt-text-muted)" }}>Chủ dự án</span>;
        }
        return (
          <Space direction="horizontal" size="small">
            <Popconfirm
              title="Chuyển quyền chủ sở hữu"
              description={`Bạn có chắc muốn chuyển quyền chủ sở hữu cho ${record.username}?`}
              okText="Đồng ý"
              cancelText="Huỷ"
              onConfirm={() => handleTransferOwnership(record)}
            >
              <Button size="small" type="link">
                Chuyển chủ
              </Button>
            </Popconfirm>

            <Popconfirm
              title="Xoá thành viên"
              description={`Bạn có chắc muốn xoá ${record.username} khỏi dự án?`}
              okText="Xoá"
              cancelText="Huỷ"
              okButtonProps={{ danger: true }}
              onConfirm={() => handleRemove(record)}
            >
              <Button size="small" type="link" danger>
                Xoá
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    });
  }

  return (
    <Card
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <UsersIcon size={18} />
          <span>Danh sách thành viên ({membersQuery.data?.length ?? 0})</span>
        </div>
      }
      extra={
        canManage && (
          <Button
            type="primary"
            icon={<PlusIcon size={16} />}
            onClick={() => {
              setSelectedIdentifiers([]);
              setInviteErrors([]);
              setInviteModalOpen(true);
            }}
          >
            Mời thành viên
          </Button>
        )
      }
      style={{ marginTop: 16 }}
    >
      <Table
        rowKey="user_id"
        loading={membersQuery.isLoading}
        columns={columns}
        dataSource={membersQuery.data ?? []}
        pagination={false}
      />

      <Modal
        title="Mời thành viên vào dự án"
        open={inviteModalOpen}
        onOk={handleInvite}
        confirmLoading={isSubmitting}
        onCancel={() => {
          setSelectedIdentifiers([]);
          setInviteErrors([]);
          setInviteModalOpen(false);
        }}
        okText={
          selectedIdentifiers.length > 1
            ? `Gửi lời mời (${selectedIdentifiers.length})`
            : "Gửi lời mời"
        }
        cancelText="Đóng"
        width={580}
        destroyOnClose
      >
        <p style={{ color: "var(--crt-text-muted)", fontSize: 13, marginBottom: 16 }}>
          Tìm kiếm và chọn các người dùng muốn mời vào dự án. Bạn có thể chọn nhiều người cùng lúc.
          Hệ thống hỗ trợ tìm kiếm theo username, họ tên, email và tự động cuộn tải thêm.
        </p>

        {inviteErrors.length > 0 && (
          <Alert
            message="Không thể gửi lời mời đến một số thành viên"
            description={
              <ul style={{ margin: "4px 0 0 16px", padding: 0 }}>
                {inviteErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            }
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Form layout="vertical">
          <Form.Item
            label="Danh sách người dùng được mời"
            required
            tooltip="Chọn một hoặc nhiều thành viên từ danh sách gợi ý"
          >
            <UserSelectCombobox
              projectId={project.id}
              value={selectedIdentifiers}
              onChange={(vals) => {
                setSelectedIdentifiers(vals);
                if (inviteErrors.length > 0) setInviteErrors([]);
              }}
              placeholder="Chọn hoặc gõ tìm kiếm thành viên..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
