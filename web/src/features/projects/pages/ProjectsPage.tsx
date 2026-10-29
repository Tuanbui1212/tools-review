import {
  ArchiveIcon,
  BookOpenIcon,
  FolderIcon,
  MailIcon,
  PageHeader,
  PlusIcon,
  SearchIcon,
  StatCard,
  errorMessage,
  useAuth,
  useDebounce,
} from "@crt/shared";
import {
  App,
  Badge,
  Button,
  Checkbox,
  Col,
  Empty,
  Input,
  Pagination,
  Row,
  Select,
  Spin,
} from "antd";
import { useEffect, useState } from "react";

import { InvitationsModal } from "../components/InvitationsModal";
import { ProjectCard } from "../components/ProjectCard";
import { ProjectFormModal } from "../components/ProjectFormModal";
import {
  useDeleteProject,
  useMyInvitations,
  useProjectList,
} from "../hooks/useProjects";
import {
  COMIC_TYPE_LABELS,
  type ComicType,
  type Project,
} from "../types";

const DEFAULT_PAGE_SIZE = 12;

export function ProjectsPage() {
  const { user: actor } = useAuth();
  const { message } = App.useApp();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [comicType, setComicType] = useState<ComicType>();
  const [includeArchived, setIncludeArchived] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const debouncedQuery = useDebounce(searchInput.trim(), 350);

  const [formOpen, setFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [invitationsOpen, setInvitationsOpen] = useState(false);

  // Khi search thay đổi thì reset về trang 1
  useEffect(() => {
    setPage(1);
  }, [debouncedQuery]);

  const list = useProjectList({
    page,
    page_size: pageSize,
    comic_type: comicType,
    q: debouncedQuery || undefined,
    include_archived: includeArchived,
  });

  const invitationsQuery = useMyInvitations();
  const deleteProject = useDeleteProject();

  const stats = list.data?.stats;
  const pendingInvitesCount = invitationsQuery.data?.length ?? 0;

  const handleDelete = async (project: Project) => {
    try {
      await deleteProject.mutateAsync(project.id);
      message.success(`Đã lưu trữ dự án "${project.name}"`);
    } catch (err) {
      message.error(errorMessage(err));
    }
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormOpen(true);
  };

  if (!actor) return null;

  return (
    <>
      <PageHeader
        icon={<FolderIcon size={24} />}
        title="Quản lý dự án"
        subtitle={
          actor.system_role === "admin"
            ? "Toàn bộ dự án trong hệ thống studio"
            : "Các dự án bạn tham gia hoặc quản lý"
        }
        extra={
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Badge count={pendingInvitesCount} offset={[-4, 4]}>
              <Button
                icon={<MailIcon size={16} />}
                onClick={() => setInvitationsOpen(true)}
              >
                Lời mời {pendingInvitesCount > 0 && `(${pendingInvitesCount})`}
              </Button>
            </Badge>

            <Button
              type="primary"
              size="large"
              icon={<PlusIcon size={18} />}
              onClick={() => {
                setEditingProject(null);
                setFormOpen(true);
              }}
            >
              Tạo dự án mới
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          margin: "24px 0",
        }}
      >
        <StatCard
          icon={<FolderIcon size={20} />}
          label="Tổng dự án"
          value={stats?.total ?? 0}
          tone="accent"
        />
        <StatCard
          icon={<BookOpenIcon size={20} />}
          label="Đang hoạt động"
          value={stats?.active ?? 0}
          tone="success"
        />
        <StatCard
          icon={<ArchiveIcon size={20} />}
          label="Đã lưu trữ"
          value={stats?.archived ?? 0}
          tone="info"
        />
      </div>

      {/* Filter toolbar */}
      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: 20,
          background: "var(--crt-surface)",
          padding: 12,
          borderRadius: 8,
          border: "1px solid var(--crt-border)",
        }}
      >
        <Input
          prefix={<SearchIcon size={16} />}
          placeholder="Tìm kiếm dự án theo tên hoặc mô tả..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          allowClear
          style={{ width: 320 }}
        />

        <Select
          placeholder="Tất cả thể loại truyện"
          value={comicType}
          onChange={(val) => {
            setComicType(val);
            setPage(1);
          }}
          allowClear
          style={{ width: 200 }}
          options={Object.entries(COMIC_TYPE_LABELS).map(([k, v]) => ({
            value: k,
            label: v,
          }))}
        />

        <Checkbox
          checked={includeArchived}
          onChange={(e) => {
            setIncludeArchived(e.target.checked);
            setPage(1);
          }}
          style={{ marginLeft: 8 }}
        >
          Hiện cả dự án đã lưu trữ
        </Checkbox>
      </div>

      {/* Project Grid */}
      {list.isLoading ? (
        <div style={{ textAlign: "center", padding: "64px 0" }}>
          <Spin size="large" tip="Đang tải danh sách dự án..." />
        </div>
      ) : list.data && list.data.items.length > 0 ? (
        <>
          <Row gutter={[16, 16]}>
            {list.data.items.map((project) => {
              const canManage =
                actor.system_role === "admin" || project.my_role === "owner";
              return (
                <Col xs={24} sm={12} lg={8} xl={6} key={project.id}>
                  <ProjectCard
                    project={project}
                    canManage={canManage}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                </Col>
              );
            })}
          </Row>

          <div
            style={{
              marginTop: 24,
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <Pagination
              current={page}
              pageSize={pageSize}
              total={list.data.total}
              showSizeChanger
              pageSizeOptions={["12", "24", "48"]}
              onChange={(p, ps) => {
                setPage(p);
                setPageSize(ps);
              }}
              showTotal={(total) => `Tổng cộng ${total} dự án`}
            />
          </div>
        </>
      ) : (
        <div
          style={{
            padding: "64px 0",
            background: "var(--crt-surface)",
            borderRadius: 8,
            border: "1px solid var(--crt-border)",
            textAlign: "center",
          }}
        >
          <Empty
            description={
              debouncedQuery || comicType
                ? "Không tìm thấy dự án nào phù hợp với bộ lọc."
                : "Chưa có dự án nào."
            }
          >
            {!debouncedQuery && !comicType && (
              <Button
                type="primary"
                icon={<PlusIcon size={16} />}
                onClick={() => {
                  setEditingProject(null);
                  setFormOpen(true);
                }}
              >
                Tạo dự án đầu tiên
              </Button>
            )}
          </Empty>
        </div>
      )}

      {/* Create / Edit Modal */}
      <ProjectFormModal
        open={formOpen}
        project={editingProject}
        onClose={() => setFormOpen(false)}
      />

      {/* Invitations Modal */}
      <InvitationsModal
        open={invitationsOpen}
        onClose={() => setInvitationsOpen(false)}
      />
    </>
  );
}
