// API công khai của feature auth (dùng chung Web + App).
export { authApi } from "./api/authApi";
export { AuthScreen } from "./components/AuthScreen";
export { LoginForm } from "./components/LoginForm";
export { RequireAuth } from "./components/RequireAuth";
export { RoleTag } from "./components/RoleTag";
export { UserAvatar } from "./components/UserAvatar";
export { UserMenu } from "./components/UserMenu";
export { AuthProvider, type AuthStatus } from "./hooks/AuthProvider";
export { useAuth } from "./hooks/useAuth";
export { getAccessToken } from "./lib/tokenStore";
export { ROLE_LABELS } from "./lib/roles";
export type { Client, SystemRole, TokenPair, User, UserStatus } from "./types";
