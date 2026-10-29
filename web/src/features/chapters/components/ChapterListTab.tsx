import { errorMessage, FilmIcon } from "@crt/shared";
import {
  Button,
  Card,
  Empty,
  message,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useChapters, useDeleteChapter } from "../hooks/useChapters";
import { CHAPTER_STATUS_CONFIG, type Chapter, type ChapterStatus } from "../types";
import { CreateChapterModal } from "./CreateChapterModal";

interface ChapterListTabProps {
  projectId: number;
  canEdit: boolean;
  canManage: boolean;
}

export function ChapterListTab({ projectId, canEdit, canManage }: ChapterListTabProps) {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);

  const { data, isLoading } = useChapters(projectId, { status: statusFilter });
  const deleteMutation = useDeleteChapter(projectId);

  const chapters = data?.items ?? [];

  const nextChapterNumber = useMemo(() => {
    if (!chapters.length) return 1;
    const maxNum = Math.max(...chapters.map((c) => c.chapter_number));
    return maxNum + 1;
  }, [chapters]);

  const handleDelete = async (chapterId: number) => {
    try {
      await deleteMutation.mutateAsync(chapterId);
      message.success("Đã xoá tập truyện");
    } catch (err) {
      message.error(errorMessage(err));
    }
  };

  const columns: ColumnsType<Chapter> = [
    {
      title: "Tập",
      dataIndex: "chapter_number",
      key: "chapter_number",
      width: 100,
      render: (num: number) => (
        <Tag color="volcano" style={{ fontWeight: 600, fontSize: 13, padding: "2px 8px" }}>
          Chap {num}
        </Tag>
      ),
    },
    {
      title: "Tiêu đề",
      dataIndex: "title",
      key: "title",
      render: (title: string | null, record) => (
        <Space direction="vertical" size={2}>
          <span style={{ fontWeight: 500, fontSize: 14 }}>
            {title || `Chapter ${record.chapter_number}`}
          </span>
          <span style={{ fontSize: 12, color: "var(--crt-text-muted)" }}>
            Tạo ngày: {new Date(record.created_at).toLocaleDateString("vi-VN")}
          </span>
        </Space>
      ),
    },
    {
      title: "Số trang ảnh",
      dataIndex: "total_pages",
      key: "total_pages",
      width: 140,
      render: (count: number) => (
        <span style={{ fontWeight: 500 }}>
          {count > 0 ? (
            <Tag color="cyan">{count} trang</Tag>
          ) : (
            <Tag color="default">0 trang</Tag>
          )}
        </span>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 180,
      render: (status: ChapterStatus) => {
        const conf = CHAPTER_STATUS_CONFIG[status] || { label: status, color: "default" };
        return <Tag color={conf.color}>{conf.label}</Tag>;
      },
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 260,
      render: (_, record) => (
        <Space size={8}>
          <Button
            type="primary"
            size="small"
            icon={<FilmIcon size={14} />}
            onClick={() => navigate(`/projects/${projectId}/chapters/${record.id}`)}
          >
            Quản lý ảnh
          </Button>

          {canEdit && (
            <Button
              size="small"
              onClick={() => {
                setEditingChapter(record);
                setModalOpen(true);
              }}
            >
              Sửa
            </Button>
          )}

          {canManage && (
            <Popconfirm
              title="Xoá tập truyện này?"
              description="Tập truyện sẽ được chuyển vào mục lưu trữ và có thể khôi phục."
              okText="Xoá"
              cancelText="Huỷ"
              okButtonProps={{ danger: true }}
              onConfirm={() => handleDelete(record.id)}
            >
              <Button size="small" danger>
                Xoá
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card style={{ marginTop: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <Space size={12}>
          <span style={{ fontWeight: 500 }}>Lọc trạng thái:</span>
          <Select
            style={{ width: 180 }}
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
            allowClear
            placeholder="Tất cả trạng thái"
            options={[
              { value: "draft", label: "Chưa có ảnh (Draft)" },
              { value: "ready", label: "Sẵn sàng (Ready)" },
              { value: "processing", label: "Đang chạy Pipeline" },
              { value: "completed", label: "Hoàn thành" },
            ]}
          />
        </Space>

        {canEdit && (
          <Button
            type="primary"
            onClick={() => {
              setEditingChapter(null);
              setModalOpen(true);
            }}
          >
            + Thêm Chapter mới
          </Button>
        )}
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={chapters}
        loading={isLoading}
        pagination={{ pageSize: 20, showTotal: (total) => `Tổng ${total} tập truyện` }}
        locale={{
          emptyText: (
            <Empty
              description="Chưa có tập truyện nào trong dự án này"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              {canEdit && (
                <Button
                  type="primary"
                  onClick={() => {
                    setEditingChapter(null);
                    setModalOpen(true);
                  }}
                >
                  Tạo tập truyện đầu tiên
                </Button>
              )}
            </Empty>
          ),
        }}
      />

      <CreateChapterModal
        projectId={projectId}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingChapter(null);
        }}
        chapterToEdit={editingChapter}
        nextChapterNumber={nextChapterNumber}
      />
    </Card>
  );
}
