import { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { auth, supabase } from '../services/auth';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const userRef = useRef(user);
  userRef.current = user;
  const sequence = useRef(0);
  const acting = useRef(false);
  const mounted = useRef(true);
  const verify = useCallback(async () => {
    if (acting.current) return;
    const current = ++sequence.current;
    setChecking(true); setUser(null);
    try {
      const validated = await auth.validateUser();
      if (mounted.current && current === sequence.current) setUser(validated);
    } catch {
      if (mounted.current && current === sequence.current) setNotice('Unable to verify your session. Please sign in again.');
    } finally {
      if (mounted.current && current === sequence.current) setChecking(false);
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    void verify();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(event => {
      if (acting.current) return;
      if (event === 'SIGNED_OUT') { ++sequence.current; auth.invalidate(); setUser(null); setChecking(false); }
      if (event === 'TOKEN_REFRESHED') setTimeout(() => { if (mounted.current) void verify(); }, 0);
    });
    const onVisible = () => { if (document.visibilityState === 'visible' && userRef.current) void verify(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { mounted.current = false; ++sequence.current; subscription.unsubscribe(); document.removeEventListener('visibilitychange', onVisible); };
  }, [verify]);
  async function submit(email: string, password: string, confirmation?: string): Promise<boolean> {
    if (acting.current) return false;
    acting.current = true; const current = ++sequence.current; setBusy(true); setNotice('');
    try {
      const result = confirmation === undefined
        ? { user: await auth.login(email, password), confirmationRequired: false }
        : await auth.createAccount(email, password, confirmation);
      if (!mounted.current || current !== sequence.current) return false;
      setUser(result.user);
      if (result.confirmationRequired) setNotice('Check your email for a confirmation link if registration is available for this address. After confirming, return here to sign in. If you already have an account, sign in instead.');
      return true;
    } finally { acting.current = false; if (mounted.current) setBusy(false); }
  }
  async function logout() {
    if (acting.current) return;
    acting.current = true; ++sequence.current; setBusy(true); setUser(null); setChecking(true);setNotice('');
    try { await auth.logout(); }
    catch (error) { if (mounted.current) setNotice(error instanceof Error ? error.message : 'Sign-out failed. Close this tab.'); }
    finally { acting.current = false; if (mounted.current) { setBusy(false);setChecking(false); } }
  }
  return { user, checking, busy, notice, submit, logout };
}
