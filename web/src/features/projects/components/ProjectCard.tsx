import {
  ArchiveIcon,
  EditIcon,
  UsersIcon,
} from "@crt/shared";
import { Button, Card, Dropdown, Tag, Tooltip } from "antd";
import type { MenuProps } from "antd";
import { useNavigate } from "react-router-dom";

import {
  AUTOMATION_LEVEL_LABELS,
  COMIC_TYPE_LABELS,
  type Project,
} from "../types";

interface ProjectCardProps {
  project: Project;
  canManage: boolean;
  onEdit?(project: Project): void;
  onDelete?(project: Project): void;
}

const COMIC_TYPE_COLORS: Record<string, string> = {
  manga: "gold",
  manhwa: "cyan",
  manhua: "volcano",
  webtoon: "purple",
  comic: "blue",
  vn: "green",
};

export function ProjectCard({ project, canManage, onEdit, onDelete }: ProjectCardProps) {
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/projects/${project.id}`);
  };

  const menuItems: MenuProps["items"] = [];
  if (canManage && onEdit) {
    menuItems.push({
      key: "edit",
      label: "Chỉnh sửa thông tin",
      icon: <EditIcon size={16} />,
      onClick: (e) => {
        e.domEvent.stopPropagation();
        onEdit(project);
      },
    });
  }
  if (canManage && onDelete) {
    menuItems.push({
      key: "delete",
      danger: true,
      label: "Lưu trữ dự án",
      icon: <ArchiveIcon size={16} />,
      onClick: (e) => {
        e.domEvent.stopPropagation();
        onDelete(project);
      },
    });
  }

  const isArchived = Boolean(project.deleted_at);

  return (
    <Card
      hoverable
      onClick={handleCardClick}
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        cursor: "pointer",
        position: "relative",
        opacity: isArchived ? 0.6 : 1,
        border: isArchived ? "1px dashed var(--crt-border)" : "1px solid var(--crt-border)",
      }}
      bodyStyle={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        padding: "18px 20px",
      }}
    >
      {/* Top badges: Comic type & Role */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <Tag color={COMIC_TYPE_COLORS[project.comic_type] ?? "default"}>
            {COMIC_TYPE_LABELS[project.comic_type] ?? project.comic_type}
          </Tag>
          {isArchived && <Tag color="error">Đã lưu trữ</Tag>}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }} onClick={(e) => e.stopPropagation()}>
          {project.my_role === "owner" && (
            <Tag color="gold" style={{ margin: 0, fontWeight: 600 }}>
              Chủ sở hữu
            </Tag>
          )}
          {project.my_role === "member" && (
            <Tag color="blue" style={{ margin: 0 }}>
              Thành viên
            </Tag>
          )}

          {canManage && menuItems.length > 0 && (
            <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
              <Button
                type="text"
                size="small"
                style={{ color: "var(--crt-text-muted)" }}
                onClick={(e) => e.stopPropagation()}
              >
                •••
              </Button>
            </Dropdown>
          )}
        </div>
      </div>

      {/* Project Title & Description */}
      <div style={{ marginBottom: 16 }}>
        <h3
          style={{
            margin: "0 0 6px 0",
            fontSize: 17,
            fontWeight: 600,
            color: "var(--crt-text-primary)",
            lineHeight: 1.3,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={project.name}
        >
          {project.name}
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: "var(--crt-text-muted)",
            height: 38,
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            lineHeight: 1.45,
          }}
        >
          {project.description || "Chưa có mô tả cho dự án này."}
        </p>
      </div>

      {/* Tags / Genres */}
      {project.genre && project.genre.length > 0 && (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 14 }}>
          {project.genre.slice(0, 3).map((g) => (
            <Tag key={g} style={{ fontSize: 11, background: "rgba(255,255,255,0.04)" }}>
              #{g}
            </Tag>
          ))}
          {project.genre.length > 3 && (
            <span style={{ fontSize: 11, color: "var(--crt-text-muted)", alignSelf: "center" }}>
              +{project.genre.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Automation badge */}
      <div style={{ marginTop: "auto", paddingTop: 12, borderTop: "1px solid var(--crt-border)" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 12,
            color: "var(--crt-text-muted)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <UsersIcon size={14} />
            <span>{project.members_count} thành viên</span>
          </div>

          <Tooltip title={AUTOMATION_LEVEL_LABELS[project.automation_level]?.desc}>
            <span style={{ fontSize: 11, color: "var(--crt-accent)" }}>
              {AUTOMATION_LEVEL_LABELS[project.automation_level]?.title}
            </span>
          </Tooltip>
        </div>

        <div
          style={{
            marginTop: 8,
            display: "flex",
            justifyContent: "space-between",
            fontSize: 11,
            color: "var(--crt-text-muted)",
          }}
        >
          <span>Bởi: <strong>{project.owner_username}</strong></span>
          <span>{new Date(project.updated_at).toLocaleDateString("vi-VN")}</span>
        </div>
      </div>
    </Card>
  );
}
