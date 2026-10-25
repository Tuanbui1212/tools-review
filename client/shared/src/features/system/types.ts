export interface HealthResponse {
  status: "ok" | "degraded";
  version: string;
  services: Record<string, boolean>;
}
