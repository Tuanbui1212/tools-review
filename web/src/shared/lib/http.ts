/** Lỗi chuẩn từ Main: { "error": { "code", "message", "details" } }. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

export interface AuthHandler {
  getAccessToken(): string | null;
  /** Lấy access token mới. Trả false nếu không làm mới được (phiên đã kết thúc). */
  refresh(): Promise<boolean>;
  /** Phiên không còn dùng được: bị đá, bị khoá, hết hạn. */
  onSessionEnded(code: string): void;
}

let authHandler: AuthHandler | null = null;

export function setAuthHandler(handler: AuthHandler | null): void {
  authHandler = handler;
}

// Phiên đã bị kết thúc hẳn thì không thử làm mới, vì refresh cũng sẽ thất bại.
const SESSION_ENDED_CODES = new Set(["session_replaced", "user_locked"]);

export type QueryValue = string | number | boolean | null | undefined;

export interface RequestOptions {
  body?: unknown;
  query?: Record<string, QueryValue>;
  /** false: không gắn token, không tự làm mới (login, refresh, health). */
  auth?: boolean;
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const search = params.toString();
  // Mọi request đi qua /api; Vite proxy chuyển tới Main (localhost:8000).
  return `/api${path}${search ? `?${search}` : ""}`;
}

async function toApiError(response: Response): Promise<ApiError> {
  let body: { error?: { code?: string; message?: string; details?: Record<string, unknown> } } = {};
  try {
    body = await response.json();
  } catch {
    // Không phải JSON (ví dụ lỗi proxy): dùng thông báo mặc định.
  }
  return new ApiError(
    response.status,
    body.error?.code ?? "http_error",
    body.error?.message ?? `Lỗi ${response.status}`,
    body.error?.details ?? {},
  );
}

function send(method: string, path: string, options: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  if (options.body !== undefined && !isFormData) headers["Content-Type"] = "application/json";
  const token = options.auth === false ? null : authHandler?.getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(buildUrl(path, options.query), {
    method,
    headers,
    body: options.body === undefined ? undefined : (isFormData ? (options.body as BodyInit) : JSON.stringify(options.body)),
  });
}

let refreshPromise: Promise<boolean> | null = null;

export async function apiRequest<T>(
  method: string,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  let response = await send(method, path, options);

  if (response.status === 401 && options.auth !== false && authHandler) {
    const error = await toApiError(response);
    if (SESSION_ENDED_CODES.has(error.code)) {
      authHandler.onSessionEnded(error.code);
      throw error;
    }
    // Access token hết hạn: gộp tất cả request đồng thời vào 1 lần làm mới token duy nhất
    if (!refreshPromise) {
      refreshPromise = authHandler.refresh().finally(() => {
        refreshPromise = null;
      });
    }
    const success = await refreshPromise;
    if (!success) throw error;
    response = await send(method, path, options);
  }

  if (!response.ok) throw await toApiError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const http = {
  get: <T>(path: string, query?: Record<string, QueryValue>, options: RequestOptions = {}) =>
    apiRequest<T>("GET", path, { ...options, query }),
  post: <T>(path: string, body?: unknown, options: RequestOptions = {}) =>
    apiRequest<T>("POST", path, { ...options, body }),
  put: <T>(path: string, body?: unknown, options: RequestOptions = {}) =>
    apiRequest<T>("PUT", path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options: RequestOptions = {}) =>
    apiRequest<T>("PATCH", path, { ...options, body }),
  delete: <T>(path: string, options: RequestOptions = {}) =>
    apiRequest<T>("DELETE", path, options),
};

/** Thông báo lỗi để hiện cho người dùng. */
export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : "Không kết nối được tới Main";
}
