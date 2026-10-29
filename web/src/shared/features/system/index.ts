// API công khai của feature: nơi khác chỉ import từ đây, không import sâu vào bên trong.
export { systemApi } from "./api/systemApi";
export { HealthStatus } from "./components/HealthStatus";
export { useHealth } from "./hooks/useHealth";
export type { HealthResponse } from "./types";
