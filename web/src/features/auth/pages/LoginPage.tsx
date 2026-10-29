import { AuthScreen, LoginForm, useAuth } from "@crt/shared";
import { Navigate, useLocation, useNavigate, type Location } from "react-router-dom";

function redirectTarget(state: unknown): string {
  const from = (state as { from?: Location } | null)?.from;
  return from ? `${from.pathname}${from.search}` : "/";
}

export function LoginPage() {
  const { status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const target = redirectTarget(location.state);

  if (status === "authenticated") return <Navigate to={target} replace />;

  return (
    <AuthScreen tagline="WEB QUẢN LÝ">
      <LoginForm onSuccess={() => navigate(target, { replace: true })} />
    </AuthScreen>
  );
}
