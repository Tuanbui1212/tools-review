import { http } from "../../../lib/http";
import type { HealthResponse } from "../types";

export const systemApi = {
  getHealth: () => http.get<HealthResponse>("/health", undefined, { auth: false }),
};
