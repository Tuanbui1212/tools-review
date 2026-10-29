import { ApiError, AuthProvider, StudioThemeProvider } from "@crt/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { BrowserRouter } from "react-router-dom";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Dữ liệu còn mới trong 30 giây, không tự refetch vô ích khi re-render
      staleTime: 30_000,
      // Tắt tự động gọi lại API mỗi lần click/focus qua lại giữa các cửa sổ
      refetchOnWindowFocus: false,
      // Lỗi 4xx (sai quyền, không tìm thấy…) không thử lại; lỗi mạng / 5xx thử lại tối đa 1 lần.
      retry: (failureCount, error) =>
        !(error instanceof ApiError && error.status < 500) && failureCount < 1,
    },
  },
});

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <StudioThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider client="web">{children}</AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </StudioThemeProvider>
  );
}
