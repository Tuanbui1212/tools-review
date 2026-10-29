import { useContext } from "react";

import { AuthContext, type AuthContextValue } from "./AuthProvider";

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth phải dùng bên trong <AuthProvider>");
  return context;
}
