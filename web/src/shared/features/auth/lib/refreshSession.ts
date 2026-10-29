import { ApiError } from "../../../lib/http";
import { authApi } from "../api/authApi";
import type { Client, TokenPair } from "../types";
import { getRefreshToken, saveTokens } from "./tokenStore";

let inFlight: Promise<TokenPair> | null = null;
let lastRefreshedAt = 0;
let lastPair: TokenPair | null = null;

async function withCrossTabLock<T>(name: string, task: () => Promise<T>): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.locks) {
    return navigator.locks.request(name, task);
  }
  return task();
}

/**
 * Đổi refresh token lấy cặp token mới.
 *
 * Mỗi refresh token chỉ dùng được 1 lần; dùng lại token đã đổi sẽ bị Main coi là bị lộ và
 * đá mọi phiên. Vì vậy: gộp các lần gọi trùng nhau trong một tab, khoá giữa các tab, và
 * luôn đọc token mới nhất ngay trước khi gửi (tab khác có thể vừa đổi).
 */
export function refreshSession(client: Client): Promise<TokenPair> {
  const now = Date.now();
  // Nếu vừa refresh thành công trong 2.5 giây trước, tái sử dụng kết quả để chống bão request
  if (lastPair && now - lastRefreshedAt < 2500) {
    return Promise.resolve(lastPair);
  }

  if (!inFlight) {
    inFlight = withCrossTabLock(`crt-refresh-${client}`, async () => {
      const token = getRefreshToken(client);
      if (!token) throw new ApiError(401, "not_authenticated", "Chưa đăng nhập");
      const pair = await authApi.refresh(token);
      saveTokens(client, pair);
      lastRefreshedAt = Date.now();
      lastPair = pair;
      return pair;
    }).finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}
