import { errorMessage } from "@crt/shared";
import { Alert, Button, message, Progress, Upload } from "antd";
import type { UploadFile } from "antd/es/upload/interface";
import { useRef, useState } from "react";

import { useUploadImages } from "../hooks/useChapters";

const { Dragger } = Upload;

interface ChapterDropzoneProps {
  chapterId: number;
  projectId: number;
  onSuccess?: () => void;
}

export function ChapterDropzone({ chapterId, projectId, onSuccess }: ChapterDropzoneProps) {
  const [uploading, setUploading] = useState(false);
  const [percent, setPercent] = useState(0);

  const uploadImagesMutation = useUploadImages(chapterId, projectId);
  const batchFilesRef = useRef<File[]>([]);
  const batchTimerRef = useRef<NodeJS.Timeout | null>(null);

  const processBatchUpload = async () => {
    const filesToUpload = [...batchFilesRef.current];
    batchFilesRef.current = [];
    if (!filesToUpload.length) return;

    setUploading(true);
    setPercent(20);

    try {
      setPercent(50);
      await uploadImagesMutation.mutateAsync(filesToUpload);
      setPercent(100);
      message.success(`Đã tải lên thành công ${filesToUpload.length} trang ảnh`);
      onSuccess?.();
    } catch (err) {
      message.error(errorMessage(err));
    } finally {
      setUploading(false);
      setPercent(0);
    }
  };

  const handleFileIncoming = (file: UploadFile) => {
    // Trong beforeUpload của Antd, file chính là RcFile (kế thừa File)
    const raw: unknown = (file as unknown as { originFileObj?: File })?.originFileObj ?? file;
    if (raw && (raw instanceof File || raw instanceof Blob)) {
      batchFilesRef.current.push(raw as File);
    }

    // Debounce 100ms để gom toàn bộ file trong cùng một lượt kéo thả/chọn file
    if (batchTimerRef.current) {
      clearTimeout(batchTimerRef.current);
    }
    batchTimerRef.current = setTimeout(() => {
      processBatchUpload();
    }, 100);

    return false; // Ngăn Antd upload mặc định
  };

  return (
    <div style={{ marginBottom: 24 }}>
      <Dragger
        multiple
        accept="image/png,image/jpeg,image/jpg,image/webp,.png,.jpg,.jpeg,.webp"
        disabled={uploading}
        beforeUpload={handleFileIncoming}
        showUploadList={false}
        style={{
          padding: 28,
          background: "var(--crt-surface)",
          border: "2px dashed var(--crt-border)",
          borderRadius: 12,
        }}
      >
        <p className="ant-upload-drag-icon" style={{ fontSize: 44, color: "var(--crt-accent)", margin: 0 }}>
          🖼️
        </p>
        <p className="ant-upload-text" style={{ fontSize: 16, fontWeight: 600, margin: "14px 0 6px" }}>
          Kéo thả hàng loạt file ảnh vào đây hoặc nhấp để chọn file
        </p>
        <p className="ant-upload-hint" style={{ color: "var(--crt-text-muted)", fontSize: 13, maxWidth: 600, margin: "0 auto 16px" }}>
          Hỗ trợ tải lên nhiều file cùng lúc: <strong>JPEG, PNG, WEBP</strong> (tối đa 20MB/ảnh). Hệ thống tự động sắp xếp số trang theo thứ tự tên file tự nhiên.
        </p>
        <Button type="primary" disabled={uploading}>
          Chọn nhiều ảnh từ máy tính
        </Button>
      </Dragger>

      {uploading && (
        <div style={{ marginTop: 16 }}>
          <Alert
            type="info"
            message={
              <div>
                <span style={{ fontWeight: 600 }}>Đang tải lên và xử lý kiểm định ảnh...</span>
                <Progress percent={percent} status="active" strokeColor="var(--crt-accent)" style={{ marginTop: 8 }} />
              </div>
            }
          />
        </div>
      )}
    </div>
  );
}
