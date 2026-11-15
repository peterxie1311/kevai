import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { supabaseConfig } from './config';

export function validateCredentials(email: string, password: string): string | undefined {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Enter a valid email address.';
  if (!password) return 'Enter your password.';
  return undefined;
}
export function createAuthService(client: Pick<SupabaseClient, 'auth'>) {
  let verifiedUser: User | null = null;
  let revision = 0;
  return {
    async login(email: string, password: string) {
      const message = validateCredentials(email, password);
      if (message) throw new Error(message);
      const current = ++revision;
      verifiedUser = null;
      const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw new Error('Unable to sign in. Check your email and password, confirm your email, and try again.');
      const { data, error: userError } = await client.auth.getUser();
      if (current !== revision) throw new Error('Sign-in was cancelled. Please try again.');
      if (userError || !data.user) throw new Error('Unable to verify your account. Please try signing in again.');
      verifiedUser = data.user;
      return data.user;
    },
    async validateUser() {
      const current = ++revision;
      verifiedUser = null;
      const { data: sessionData, error: sessionError } = await client.auth.getSession();
      if (current !== revision || sessionError || !sessionData.session) return null;
      const { data, error } = await client.auth.getUser();
      if (current !== revision || error || !data.user) return null;
      verifiedUser = data.user;
      return data.user;
    },
    async getAccessToken() {
      if (!verifiedUser) return undefined;
      const userId = verifiedUser.id;
      const current = revision;
      const { data, error } = await client.auth.getSession();
      if (current !== revision || error || !data.session || data.session.user.id !== userId) {
        verifiedUser = null; return undefined;
      }
      return data.session.access_token;
    },
    async logout() {
      ++revision; verifiedUser = null;
      const { error } = await client.auth.signOut({ scope: 'local' });
      if (error) throw new Error('You are locked out of this page, but server sign-out could not be confirmed. Close this tab to clear its in-memory session.');
    },
    invalidate() { ++revision; verifiedUser = null; },
  };
}
// Sessions live only in memory. Closing/reloading the page requires login again.
export const supabase = createClient(supabaseConfig.url, supabaseConfig.publishableKey, {
  auth: { persistSession: false, autoRefreshToken: true, detectSessionInUrl: false },
  global: { fetch: (input, init) => fetch(input, { ...init,
    signal: init?.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(20_000)]) : AbortSignal.timeout(20_000),
  }) },
});
export const auth = createAuthService(supabase);
