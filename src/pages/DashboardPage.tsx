import Brand from '../components/Brand';
export default function DashboardPage({ email, onLogout }: { email: string; onLogout: () => void }) {
  return <section className="dashboard"><header><Brand /><button className="secondary" onClick={onLogout}>Sign out</button></header>
    <main><p className="eyebrow">YOU’RE IN</p><h1>Welcome to your<br />next advantage.</h1><p className="muted">Signed in as {email}</p>
      <div className="welcome-panel"><span className="live-dot" /><div><h2>Account verified</h2><p>Your workspace is ready. Basketball data and AI tools are coming next.</p></div></div>
    </main></section>;
}
