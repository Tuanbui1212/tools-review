import { ROLE_LABELS, SearchIcon, useDebounce, type SystemRole } from "@crt/shared";
import { Empty, Select, Spin, Tag } from "antd";
import type { DefaultOptionType } from "antd/es/select";
import { useMemo, useState } from "react";

import { useCandidateUsers } from "../hooks/useProjects";
import type { UserCandidate } from "../types";

export interface UserSelectComboboxProps {
  projectId: number;
  value?: string;
  onChange?(value: string, user?: UserCandidate): void;
  placeholder?: string;
  disabled?: boolean;
}

interface CandidateOption extends DefaultOptionType {
  value: string;
  label: React.ReactNode;
  user: UserCandidate;
}

export function UserSelectCombobox({
  projectId,
  value,
  onChange,
  placeholder = "Gõ tìm kiếm theo username, họ tên hoặc email...",
  disabled = false,
}: UserSelectComboboxProps) {
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput.trim(), 350);

  const {
    data,
    isLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useCandidateUsers(projectId, debouncedSearch);

  // Gộp danh sách các trang thành 1 mảng duy nhất và loại bỏ trùng lặp id
  const users = useMemo(() => {
    if (!data?.pages) return [];
    const map = new Map<number, UserCandidate>();
    for (const page of data.pages) {
      for (const item of page.items) {
        if (!map.has(item.id)) {
          map.set(item.id, item);
        }
      }
    }
    return Array.from(map.values());
  }, [data]);

  const totalCount = data?.pages[0]?.total ?? 0;

  // Lắng nghe sự kiện cuộn của popup dropdown (kéo đến đâu mới fetch tiếp)
  const handlePopupScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    // Khi cuộn gần tới đáy (còn 20px) thì fetch trang tiếp theo
    if (scrollHeight - (scrollTop + clientHeight) <= 20) {
      if (hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    }
  };

  const options: CandidateOption[] = useMemo(() => {
    return users.map((u) => {
      const roleColor =
        u.system_role === "admin"
          ? "magenta"
          : u.system_role === "root"
          ? "blue"
          : "default";

      return {
        value: u.username,
        user: u,
        label: (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "4px 0",
            }}
          >
            <div>
              <span style={{ fontWeight: 600, color: "var(--crt-text-primary)" }}>
                {u.username}
              </span>
              {u.display_name && (
                <span style={{ marginLeft: 8, fontSize: 13, color: "var(--crt-text-muted)" }}>
                  ({u.display_name})
                </span>
              )}
              <div style={{ fontSize: 11, color: "var(--crt-text-muted)", marginTop: 2 }}>
                {u.email}
              </div>
            </div>
            <Tag color={roleColor} style={{ margin: 0, fontSize: 11 }}>
              {ROLE_LABELS[u.system_role as SystemRole] ?? u.system_role}
            </Tag>
          </div>
        ),
      };
    });
  }, [users]);

  return (
    <Select
      showSearch
      allowClear
      disabled={disabled}
      value={value}
      placeholder={placeholder}
      filterOption={false} // Tìm kiếm server-side, không lọc client-side
      onSearch={(val) => setSearchInput(val)}
      onChange={(val, option) => {
        const selected = option as CandidateOption | undefined;
        onChange?.(val, selected?.user);
      }}
      options={options}
      onPopupScroll={handlePopupScroll}
      style={{ width: "100%" }}
      suffixIcon={<SearchIcon size={16} />}
      notFoundContent={
        isLoading || isFetching ? (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <Spin size="small" tip="Đang tìm kiếm..." />
          </div>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Không tìm thấy người dùng phù hợp"
          />
        )
      }
      dropdownRender={(menu) => (
        <>
          {menu}
          {/* Thông tin lazy load ở chân dropdown */}
          <div
            style={{
              padding: "6px 12px",
              borderTop: "1px solid var(--crt-border)",
              fontSize: 12,
              color: "var(--crt-text-muted)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "var(--crt-surface)",
            }}
          >
            <span>
              Đã tải {users.length} / {totalCount} người dùng
            </span>
            {isFetchingNextPage ? (
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Spin size="small" /> Đang tải thêm...
              </span>
            ) : hasNextPage ? (
              <span>Cuộn xuống để tải thêm</span>
            ) : (
              <span>Đã tải hết</span>
            )}
          </div>
        </>
      )}
    />
  );
}
