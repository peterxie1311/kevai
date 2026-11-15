import { auth, supabase } from './auth';
import { createSupabaseClient } from './api';
import { supabaseConfig } from './config';

// Future protected screens use this client; RLS must enforce database access.
export const db = createSupabaseClient({ ...supabaseConfig, getAccessToken: auth.getAccessToken });
const app = document.querySelector<HTMLElement>('#app')!;
let operation = 0;
function loginScreen(message = '', signup = false, success = false) {
  ++operation;
  app.innerHTML = `
    <section class="login-layout">
      <aside class="intro"><a class="brand" href="#">kev<span>ai</span><i></i></a>
        <div class="pitch"><p class="eyebrow">THE GAME. A LITTLE CLEARER.</p><h1>Your edge<br>starts here.</h1>
          <p class="description">A home for basketball data, smarter questions, and your next big insight.</p>
          <div class="court" aria-hidden="true"><div class="court-line"></div><div class="court-circle"></div><span>01 / THE BIG PICTURE</span></div>
        </div><p class="aside-footer">Basketball intelligence, in your corner.</p>
      </aside>
      <div class="form-side"><div class="login-card"><p class="eyebrow">WELCOME TO KEVAI</p><h2>${signup ? "Join the game." : "Back in the game."}</h2><p class="muted">${signup ? "Create your account to get started." : "Sign in to your account to get started."}</p>
        <form id="login-form"><label for="email">Email address</label><input id="email" name="email" type="email" autocomplete="username" placeholder="you@example.com" required maxlength="254">
        <div class="password-heading"><label for="password">Password</label></div><div class="password-field"><input id="password" name="password" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" placeholder="${signup ? 'At least 8 characters' : 'Enter your password'}" ${signup ? 'minlength="8"' : ''} required><button type="button" id="show-password" aria-label="Show password" aria-pressed="false">Show</button></div>
        ${signup ? '<div class="password-heading"><label for="confirm-password">Confirm password</label></div><input id="confirm-password" name="confirm-password" type="password" autocomplete="new-password" placeholder="Re-enter your password" required minlength="8">' : ''}
        <p id="message" class="message" role="status" aria-live="polite"></p><button class="primary" type="submit">${signup ? "Create account" : "Sign in"} <span aria-hidden="true">↗</span></button></form>
        <div class="account-help">${signup ? "Already have an account?" : "New to KevAI?"} <button type="button" id="switch-mode" class="text-button">${signup ? "Sign in" : "Create account"}</button></div>
        <p class="secure-note">Secure sign-in with Supabase</p>
      </div><footer>KEVAI <span>YOUR COURTSIDE COMPANION</span></footer></div>
    </section>`;
  const status = document.querySelector<HTMLElement>('#message')!;
  status.textContent = message;
  if (success) status.style.color = '#244f37';
  const switchMode = document.querySelector<HTMLButtonElement>('#switch-mode')!;
  switchMode.addEventListener('click', () => loginScreen('', !signup));
  const form = document.querySelector<HTMLFormElement>('#login-form')!;
  const email = document.querySelector<HTMLInputElement>('#email')!;
  const password = document.querySelector<HTMLInputElement>('#password')!;
  const confirmation = document.querySelector<HTMLInputElement>('#confirm-password');
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
    submit.disabled = true; switchMode.disabled = true; submit.textContent = signup ? 'Creating account…' : 'Signing in…'; status.textContent = '';
    email.disabled = true; password.disabled = true; if (confirmation) confirmation.disabled = true;
    try {
      if (signup) {
        const result = await auth.createAccount(email.value, password.value, confirmation?.value ?? '');
        if (current !== operation) return;
        if (result.user) dashboard(result.user.email ?? 'Your account');
        else loginScreen('Check your email for a confirmation link if registration is available for this address. After confirming, return here to sign in. If you already have an account, sign in instead.', false, true);
      } else {
        const user = await auth.login(email.value, password.value);
        if (current === operation) dashboard(user.email ?? 'Your account');
      }
    } catch (error) {
      if (current === operation) status.textContent = error instanceof Error ? error.message : 'Unable to connect. Please try again.';
    } finally {
      password.value = ''; if (confirmation) { confirmation.value = ''; confirmation.disabled = false; } submit.disabled = false;switchMode.disabled = false;submit.textContent = signup ? 'Create account ↗' : 'Sign in ↗';email.disabled = false;password.disabled = false;
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
