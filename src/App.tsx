import { useAuth } from "./hooks/useAuth";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";

export default function App() {
  const { user, checking, busy, notice, submit, logout } = useAuth();
  if (checking)
    return (
      <div className="checking" role="status">
        {busy ? "Signing out…" : "Checking your account…"}
      </div>
    );
  if (user)
    return (
      <DashboardPage
        email={user.email ?? "Your account"}
        onLogout={() => void logout()}
      />
    );
  return <AuthPage busy={busy} notice={notice} onSubmit={submit} />;
}
