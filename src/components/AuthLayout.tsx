import type { ReactNode } from "react";
import Brand from "./Brand";
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <section className="login-layout">
      <aside className="intro">
        <Brand />
        <div className="pitch">
          <p className="eyebrow">THE GAME. A LITTLE CLEARER.</p>
          <h1>
            Your edge
            <br />
            starts here.
          </h1>
          <p className="description">
            A home for basketball data, smarter questions, and your next big
            insight.
          </p>
          <div className="court" aria-hidden="true">
            <div className="court-line" />
            <div className="court-circle" />
            <span>01 / THE BIG PICTURE</span>
          </div>
        </div>
        <p className="aside-footer">Basketball intelligence, in your corner.</p>
      </aside>
      <div className="form-side">
        <div className="login-card">
          {children}
          <p className="secure-note">Secure sign-in with Supabase</p>
        </div>
        <footer>
          KEVAI <span>YOUR COURTSIDE COMPANION</span>
        </footer>
      </div>
    </section>
  );
}
