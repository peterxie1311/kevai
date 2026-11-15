import { auth, supabase } from './auth';
import { createSupabaseClient } from './api';
import { supabaseConfig } from './config';

// Future protected screens use this client; RLS must enforce database access.
export const db = createSupabaseClient({ ...supabaseConfig, getAccessToken: auth.getAccessToken });
const app = document.querySelector<HTMLElement>('#app')!;
let operation = 0;
function loginScreen(message = '') {
  app.innerHTML = `
    <section class="login-layout">
      <aside class="intro"><a class="brand" href="#">kev<span>ai</span><i></i></a>
        <div class="pitch"><p class="eyebrow">THE GAME. A LITTLE CLEARER.</p><h1>Your edge<br>starts here.</h1>
          <p class="description">A home for basketball data, smarter questions, and your next big insight.</p>
          <div class="court" aria-hidden="true"><div class="court-line"></div><div class="court-circle"></div><span>01 / THE BIG PICTURE</span></div>
        </div><p class="aside-footer">Basketball intelligence, in your corner.</p>
      </aside>
      <div class="form-side"><div class="login-card"><p class="eyebrow">WELCOME TO KEVAI</p><h2>Back in the game.</h2><p class="muted">Sign in to your account to get started.</p>
        <form id="login-form"><label for="email">Email address</label><input id="email" name="email" type="email" autocomplete="username" placeholder="you@example.com" required maxlength="254">
        <div class="password-heading"><label for="password">Password</label></div><div class="password-field"><input id="password" name="password" type="password" autocomplete="current-password" placeholder="Enter your password" required><button type="button" id="show-password" aria-label="Show password" aria-pressed="false">Show</button></div>
        <p id="message" class="message" role="status" aria-live="polite"></p><button class="primary" type="submit">Sign in <span aria-hidden="true">↗</span></button></form>
        <div class="account-help">Need an account? Ask your KevAI administrator for an invite.</div>
        <p class="secure-note">Secure sign-in with Supabase</p>
      </div><footer>KEVAI <span>YOUR COURTSIDE COMPANION</span></footer></div>
    </section>`;
  const status = document.querySelector<HTMLElement>('#message')!;
  status.textContent = message;
  const form = document.querySelector<HTMLFormElement>('#login-form')!;
  const email = document.querySelector<HTMLInputElement>('#email')!;
  const password = document.querySelector<HTMLInputElement>('#password')!;
  document.querySelector('#show-password')!.addEventListener('click', event => {
    const button = event.currentTarget as HTMLButtonElement;
    const show = password.type === 'password'; password.type = show ? 'text' : 'password';
    button.textContent = show ? 'Hide' : 'Show'; button.setAttribute('aria-label', show ? 'Hide password' : 'Show password');button.setAttribute('aria-pressed', String(show));
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const current = ++operation;
    const submit = form.querySelector<HTMLButtonElement>('[type="submit"]')!;
    submit.disabled = true; submit.textContent = 'Signing in…'; status.textContent = '';
    email.disabled = true; password.disabled = true;
    try {
      const user = await auth.login(email.value, password.value);
      password.value = '';
      if (current === operation) dashboard(user.email ?? 'Your account');
    } catch (error) {
      if (current === operation) status.textContent = error instanceof Error ? error.message : 'Unable to connect. Please try again.';
    } finally {
      password.value = ''; submit.disabled = false;submit.textContent = 'Sign in ↗';email.disabled = false;password.disabled = false;
    }
  });
}
function dashboard(email: string) {
  app.innerHTML = `<section class="dashboard"><header><a class="brand" href="#">kev<span>ai</span><i></i></a><button id="logout" class="secondary">Sign out</button></header><main><p class="eyebrow">YOU’RE IN</p><h1>Welcome to your<br>next advantage.</h1><p id="signed-in-user" class="muted"></p><div class="welcome-panel"><span class="live-dot"></span><div><h2>Account verified</h2><p>Your workspace is ready. Basketball data and AI tools are coming next.</p></div></div><p id="dashboard-status" role="status"></p></main></section>`;
  document.querySelector('#signed-in-user')!.textContent = `Signed in as ${email}`;
  document.querySelector('#logout')!.addEventListener('click', async () => {
    ++operation; auth.invalidate(); app.innerHTML = '<div class="checking" role="status">Signing out…</div>';
    try { await auth.logout(); loginScreen(); } catch(error) { loginScreen(error instanceof Error ? error.message : 'Sign-out failed. Close this tab.'); }
  });
}
// Never await Supabase operations inside its auth-event callback (SDK lock).
supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') { ++operation; auth.invalidate(); loginScreen(); }
  if (event === 'TOKEN_REFRESHED') setTimeout(() => void checkSession(), 0);
});
async function checkSession() {
  const current = ++operation;
  auth.invalidate();
  app.innerHTML = '<div class="checking" role="status">Checking your account…</div>';
  try {
    const user = await auth.validateUser();
    if (current !== operation) return;
    if (user) dashboard(user.email ?? 'Your account'); else loginScreen();
  } catch { if (current === operation) loginScreen('Unable to verify your session. Please sign in again.'); }
}
// Revalidate on returning to the tab; hide protected content during verification.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && document.querySelector('.dashboard')) void checkSession();
});
void checkSession();
