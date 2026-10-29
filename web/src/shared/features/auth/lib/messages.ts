import { ApiError } from "../../../lib/http";

const SESSION_ENDED: Record<string, string> = {
  session_replaced: "Tài khoản đã đăng nhập ở thiết bị khác",
  user_locked: "Tài khoản đã bị khoá",
  refresh_token_expired: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại",
  refresh_token_revoked: "Phiên đăng nhập đã kết thúc, vui lòng đăng nhập lại",
  refresh_token_reused: "Phiên đăng nhập không còn an toàn, vui lòng đăng nhập lại",
};

export function sessionEndedMessage(code: string): string {
  return SESSION_ENDED[code] ?? "Phiên đăng nhập đã kết thúc, vui lòng đăng nhập lại";
}

export function loginErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return "Không kết nối được tới Main";
  if (error.code === "login_temporarily_locked") {
    const seconds = Number(error.details.retry_after_seconds ?? 0);
    const minutes = Math.max(1, Math.ceil(seconds / 60));
    return `Đăng nhập sai quá nhiều lần. Vui lòng thử lại sau ${minutes} phút.`;
  }
  return error.message;
}
