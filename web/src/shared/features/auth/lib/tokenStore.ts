import type { Client, TokenPair } from "../types";

// Access token lưu trong bộ nhớ và sessionStorage (giữ được khi F5 reload tab);
// refresh token lưu localStorage để mở lại trình duyệt không phải đăng nhập lại (M01 spec 5.8).
let accessToken: string | null = null;

const refreshKey = (client: Client) => `crt.${client}.refresh_token`;
const accessKey = (client: Client) => `crt.${client}.access_token`;

export function getAccessToken(): string | null {
  if (accessToken) return accessToken;
  try {
    const stored = sessionStorage.getItem(accessKey("web"));
    if (stored) {
      accessToken = stored;
      return stored;
    }
  } catch {
    // Trình duyệt chặn sessionStorage
  }
  return null;
}

export function getRefreshToken(client: Client): string | null {
  try {
    return localStorage.getItem(refreshKey(client));
  } catch {
    return null;
  }
}

export function saveTokens(client: Client, pair: TokenPair): void {
  accessToken = pair.access_token;
  try {
    sessionStorage.setItem(accessKey(client), pair.access_token);
    localStorage.setItem(refreshKey(client), pair.refresh_token);
  } catch {
    // Trình duyệt chặn storage: phiên chỉ còn đến khi đóng tab.
  }
}

export function clearTokens(client: Client): void {
  accessToken = null;
  try {
    sessionStorage.removeItem(accessKey(client));
    localStorage.removeItem(refreshKey(client));
  } catch {
    // Bỏ qua: không có gì để xoá.
  }
}
