import {
  BookOpenIcon,
  FilmIcon,
  FolderIcon,
  PageHeader,
  UsersIcon,
  useAuth,
} from "@crt/shared";
import { Alert, Breadcrumb, Button, Spin, Tabs, Tag } from "antd";
import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { ChapterListTab } from "../../chapters";
import { ProjectMembersTab } from "../components/ProjectMembersTab";
import { ProjectSettingsTab } from "../components/ProjectSettingsTab";
import { useProject } from "../hooks/useProjects";
import {
  AUTOMATION_LEVEL_LABELS,
  COMIC_TYPE_LABELS,
} from "../types";

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: actor } = useAuth();

  const projectId = Number(id);
  const projectQuery = useProject(projectId);
  const project = projectQuery.data;

  const canManage = useMemo(() => {
    if (!actor || !project) return false;
    return actor.system_role === "admin" || project.my_role === "owner";
  }, [actor, project]);

  const canEdit = useMemo(() => {
    if (!actor || !project) return false;
    return (
      actor.system_role === "admin" ||
      actor.system_role === "root" ||
      project.my_role === "owner" ||
      project.my_role === "member"
    );
  }, [actor, project]);

  if (projectQuery.isLoading) {
    return (
      <div style={{ textAlign: "center", padding: "80px 0" }}>
        <Spin size="large" tip="Đang tải dữ liệu dự án..." />
      </div>
    );
  }

  if (projectQuery.isError || !project) {
    return (
      <div style={{ padding: 24 }}>
        <Alert
          type="error"
          message="Không tìm thấy dự án"
          description="Dự án không tồn tại hoặc bạn không có quyền truy cập."
          action={
            <Button type="primary" onClick={() => navigate("/projects")}>
              Quay lại danh sách dự án
            </Button>
          }
        />
      </div>
    );
  }

  const items = [
    {
      key: "chapters",
      label: (
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <FilmIcon size={16} />
          <span>Danh sách Tập truyện</span>
        </span>
      ),
      children: (
        <ChapterListTab
          projectId={projectId}
          canEdit={canEdit}
          canManage={canManage}
        />
      ),
    },
    {
      key: "members",
      label: (
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <UsersIcon size={16} />
          <span>Thành viên ({project.members_count})</span>
        </span>
      ),
      children: <ProjectMembersTab project={project} canManage={canManage} />,
    },
    {
      key: "settings",
      label: (
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <BookOpenIcon size={16} />
          <span>Cấu hình & Thiết lập</span>
        </span>
      ),
      children: <ProjectSettingsTab project={project} canManage={canManage} />,
    },
  ];

  return (
    <>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          {
            title: <Link to="/projects">Dự án</Link>,
          },
          {
            title: project.name,
          },
        ]}
      />

      <PageHeader
        icon={<FolderIcon size={24} />}
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span>{project.name}</span>
            {project.my_role === "owner" && <Tag color="gold">Chủ sở hữu</Tag>}
            {project.my_role === "member" && <Tag color="blue">Thành viên</Tag>}
            {project.deleted_at && <Tag color="error">Đã lưu trữ</Tag>}
          </div>
        }
        subtitle={
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginTop: 4 }}>
            <span>Loại: <strong>{COMIC_TYPE_LABELS[project.comic_type]}</strong></span>
            <span>•</span>
            <span>Tự động: <strong>{AUTOMATION_LEVEL_LABELS[project.automation_level]?.title}</strong></span>
            <span>•</span>
            <span>Tạo bởi: <strong>@{project.owner_username}</strong></span>
          </div>
        }
      />

      <Tabs defaultActiveKey="overview" items={items} />
    </>
  );
}
