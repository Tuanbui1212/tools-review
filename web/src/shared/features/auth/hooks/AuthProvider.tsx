import { useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { ApiError, setAuthHandler } from "../../../lib/http";
import { authApi } from "../api/authApi";
import { sessionEndedMessage } from "../lib/messages";
import { refreshSession } from "../lib/refreshSession";
import { clearTokens, getAccessToken, getRefreshToken, saveTokens } from "../lib/tokenStore";
import type { Client, User } from "../types";

export type AuthStatus = "loading" | "authenticated" | "anonymous";

export interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  /** Lý do phiên vừa kết thúc, hiện ở trang đăng nhập. */
  notice: string | null;
  clearNotice(): void;
  login(identifier: string, password: string): Promise<void>;
  logout(): Promise<void>;
  changePassword(currentPassword: string, newPassword: string): Promise<void>;
  updateDisplayName(displayName: string): Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ client, children }: { client: Client; children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const endSession = useCallback(
    (code: string | null) => {
      clearTokens(client);
      queryClient.clear();
      setUser(null);
      setStatus("anonymous");
      setNotice(code ? sessionEndedMessage(code) : null);
    },
    [client, queryClient],
  );

  useEffect(() => {
    setAuthHandler({
      getAccessToken,
      refresh: async () => {
        try {
          await refreshSession(client);
          return true;
        } catch (error) {
          endSession(error instanceof ApiError ? error.code : "refresh_failed");
          return false;
        }
      },
      onSessionEnded: endSession,
    });
    return () => setAuthHandler(null);
  }, [client, endSession]);

  // Mở trang: còn refresh token thì khôi phục phiên.
  useEffect(() => {
    let cancelled = false;
    if (!getRefreshToken(client)) {
      setStatus("anonymous");
      return;
    }
    (async () => {
      try {
        if (!getAccessToken()) {
          await refreshSession(client);
        }
        const me = await authApi.me();
        if (!cancelled) {
          setUser(me);
          setStatus("authenticated");
        }
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ApiError) {
          endSession(error.code);
        } else {
          // Main đang tắt: giữ token để lần sau vào lại được.
          setStatus("anonymous");
          setNotice("Không kết nối được tới Main");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client, endSession]);

  const login = useCallback(
    async (identifier: string, password: string) => {
      saveTokens(client, await authApi.login(identifier, password, client));
      setUser(await authApi.me());
      setNotice(null);
      setStatus("authenticated");
    },
    [client],
  );

  const logout = useCallback(async () => {
    const token = getRefreshToken(client);
    try {
      if (token) await authApi.logout(token);
    } catch {
      // Main không phản hồi vẫn đăng xuất ở phía trình duyệt.
    } finally {
      endSession(null);
    }
  }, [client, endSession]);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      saveTokens(client, await authApi.changePassword(currentPassword, newPassword, client));
    },
    [client],
  );

  const updateDisplayName = useCallback(
    async (displayName: string) => {
      if (!user) return;
      setUser(await authApi.updateDisplayName(user.id, displayName));
    },
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      notice,
      clearNotice: () => setNotice(null),
      login,
      logout,
      changePassword,
      updateDisplayName,
    }),
    [status, user, notice, login, logout, changePassword, updateDisplayName],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
