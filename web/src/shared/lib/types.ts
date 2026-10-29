/** Kết quả phân trang chuẩn của Main. */
export interface Page<T> {
  items: T[];
  page: number;
  page_size: number;
  total: number;
}
