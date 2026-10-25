import { apiGet } from "../../../lib/http";
import type { HealthResponse } from "../types";

export const systemApi = {
  getHealth: () => apiGet<HealthResponse>("/health"),
};
