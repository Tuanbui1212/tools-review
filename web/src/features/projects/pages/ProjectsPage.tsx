import {
  FolderIcon,
  MailIcon,
  PageHeader,
  PlusIcon,
  SearchIcon,
  errorMessage,
  useAuth,
  useDebounce,
} from "@crt/shared";
import {
  App,
  Badge,
  Button,
  Card,
  Checkbox,
  Empty,
  Input,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
} from "antd";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { InvitationsModal } from "../components/InvitationsModal";
import {
  useDeleteProject,
  useMyInvitations,
  useProjectList,
} from "../hooks/useProjects";
import {
  AUTOMATION_LEVEL_LABELS,
  COMIC_TYPE_LABELS,
  READING_DIRECTION_LABELS,
  type AutomationLevel,
  type ComicType,
  type Project,
} from "../types";

const COMIC_TYPE_COLORS: Record<string, string> = {
  manga: "gold",
  manhwa: "cyan",
  manhua: "volcano",
  webtoon: "purple",
  comic: "blue",
  vn: "green",
};

const PAGE_SIZE = 24;

export function ProjectsPage() {
  const { user: actor } = useAuth();
  const { message } = App.useApp();
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [comicType, setComicType] = useState<ComicType>();
  const [includeArchived, setIncludeArchived] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const debouncedQuery = useDebounce(searchInput.trim(), 350);

  const [invitationsOpen, setInvitationsOpen] = useState(false);

  // Khi search thay đổi thì reset về trang 1
  useEffect(() => {
    setPage(1);
  }, [debouncedQuery]);

  const list = useProjectList({
    page,
    page_size: PAGE_SIZE,
    comic_type: comicType,
    q: debouncedQuery || undefined,
    include_archived: includeArchived,
  });

  // Tự động lùi trang nếu số trang tối đa giảm xuống (ví dụ xoá hết dự án ở trang 3 thì lùi về trang 2)
  useEffect(() => {
    const total = list.data?.total ?? 0;
    if (total > 0) {
      const maxPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
      if (page > maxPage) {
        setPage(maxPage);
      }
    } else if (page > 1) {
      setPage(1);
    }
  }, [list.data?.total, page]);

  const invitationsQuery = useMyInvitations();
  const deleteProject = useDeleteProject();

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
    navigate(`/projects/${project.id}/edit`);
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
              onClick={() => navigate("/projects/create")}
            >
              Tạo dự án mới
            </Button>
          </div>
        }
      />

      {/* Filter toolbar */}
      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
          marginTop: 16,
          marginBottom: 16,
          background: "var(--crt-surface)",
          padding: 12,
          borderRadius: 8,
          border: "1px solid var(--crt-border)",
        }}
      >
        <Input
          prefix={<SearchIcon size={16} />}
          placeholder="Tìm kiếm dự án theo tên..."
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

      {/* Project Table (Hiển thị theo dòng, loại bỏ mô tả) */}
      <Card
        style={{
          marginTop: 16,
          borderRadius: 12,
          borderColor: "var(--crt-border)",
          background: "var(--crt-surface)",
          overflow: "hidden",
        }}
        bodyStyle={{ padding: 0 }}
      >
        <Table<Project>
          rowKey="id"
          loading={list.isLoading}
          dataSource={list.data?.items ?? []}
          pagination={
            (list.data?.total ?? 0) > PAGE_SIZE
              ? {
                  current: page,
                  pageSize: PAGE_SIZE,
                  onChange: (p) => setPage(p),
                  showTotal: (total) => `Tổng ${total} dự án`,
                  hideOnSinglePage: true,
                  showSizeChanger: false,
                }
              : false
          }
          columns={[
            {
              title: "STT",
              key: "stt",
              width: 70,
              align: "center",
              render: (_, __, index) => (
                <span style={{ fontWeight: 500, color: "var(--crt-text-muted)" }}>
                  {(page - 1) * PAGE_SIZE + index + 1}
                </span>
              ),
            },
            {
              title: "Tên dự án",
              dataIndex: "name",
              key: "name",
              render: (name: string, record: Project) => {
                const isArchived = Boolean(record.deleted_at);
                return (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span
                      onClick={() => navigate(`/projects/${record.id}`)}
                      style={{
                        fontWeight: 600,
                        fontSize: 15,
                        color: isArchived ? "var(--crt-text-muted)" : "var(--crt-primary, #1677ff)",
                        cursor: "pointer",
                        textDecoration: isArchived ? "line-through" : "none",
                      }}
                    >
                      {name}
                    </span>
                    {record.my_role === "owner" && (
                      <Tag color="gold" style={{ margin: 0, fontSize: 11, fontWeight: 500 }}>
                        Chủ sở hữu
                      </Tag>
                    )}
                    {record.my_role === "member" && (
                      <Tag color="blue" style={{ margin: 0, fontSize: 11 }}>
                        Thành viên
                      </Tag>
                    )}
                    {isArchived && (
                      <Tag color="error" style={{ margin: 0, fontSize: 11 }}>
                        Đã lưu trữ
                      </Tag>
                    )}
                  </div>
                );
              },
            },
            {
              title: "Loại truyện",
              dataIndex: "comic_type",
              key: "comic_type",
              width: 140,
              render: (type: ComicType) => (
                <Tag color={COMIC_TYPE_COLORS[type] ?? "default"}>
                  {COMIC_TYPE_LABELS[type] ?? type}
                </Tag>
              ),
            },
            {
              title: "Định dạng & Ngôn ngữ",
              key: "format",
              width: 220,
              render: (_, record) => (
                <span style={{ fontSize: 13, color: "var(--crt-text-secondary)" }}>
                  {READING_DIRECTION_LABELS[record.reading_direction] || record.reading_direction}{" "}
                  <Tag style={{ marginLeft: 4 }}>
                    {record.source_lang} → {record.target_lang}
                  </Tag>
                </span>
              ),
            },
            {
              title: "Cơ chế duyệt",
              dataIndex: "automation_level",
              key: "automation_level",
              width: 180,
              render: (lvl: AutomationLevel) => (
                <Tag color="purple">
                  {AUTOMATION_LEVEL_LABELS[lvl]?.title ?? lvl}
                </Tag>
              ),
            },
            {
              title: "Thành viên",
              dataIndex: "members_count",
              key: "members_count",
              width: 120,
              render: (count: number) => (
                <span style={{ fontSize: 13, color: "var(--crt-text-secondary)" }}>
                  {count} thành viên
                </span>
              ),
            },
            {
              title: "Người tạo",
              dataIndex: "owner_username",
              key: "owner_username",
              width: 130,
              render: (username: string) => (
                <span style={{ fontSize: 13, color: "var(--crt-text-muted)" }}>
                  @{username}
                </span>
              ),
            },
            {
              title: "Thao tác",
              key: "actions",
              width: 220,
              align: "right",
              render: (_, record: Project) => {
                const canManage =
                  actor.system_role === "admin" || record.my_role === "owner";
                const isArchived = Boolean(record.deleted_at);
                return (
                  <Space size={8}>
                    <Button
                      type="primary"
                      size="small"
                      onClick={() => navigate(`/projects/${record.id}`)}
                    >
                      Vào dự án
                    </Button>
                    {canManage && (
                      <Button
                        size="small"
                        onClick={() => handleEdit(record)}
                      >
                        Sửa
                      </Button>
                    )}
                    {canManage && !isArchived && (
                      <Popconfirm
                        title="Lưu trữ dự án này?"
                        description={`Bạn có chắc muốn lưu trữ dự án "${record.name}"?`}
                        okText="Lưu trữ"
                        cancelText="Huỷ"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => handleDelete(record)}
                      >
                        <Button size="small" danger>
                          Lưu trữ
                        </Button>
                      </Popconfirm>
                    )}
                  </Space>
                );
              },
            },
          ]}
          locale={{
            emptyText: (
              <Empty
                description={
                  debouncedQuery || comicType
                    ? "Không tìm thấy dự án nào phù hợp với bộ lọc."
                    : "Chưa có dự án nào."
                }
                style={{ padding: "48px 0" }}
              >
                {!debouncedQuery && !comicType && (
                  <Button
                    type="primary"
                    icon={<PlusIcon size={16} />}
                    onClick={() => navigate("/projects/create")}
                  >
                    Tạo dự án đầu tiên
                  </Button>
                )}
              </Empty>
            ),
          }}
        />
      </Card>

      {/* Invitations Modal */}
      <InvitationsModal
        open={invitationsOpen}
        onClose={() => setInvitationsOpen(false)}
      />
    </>
  );
}
