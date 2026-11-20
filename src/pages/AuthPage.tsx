import { useState, type FormEvent } from 'react';
import AuthLayout from '../components/AuthLayout';
import PasswordInput from '../components/PasswordInput';
import { validateCredentials, validateSignup } from '../services/auth';
interface Props { busy: boolean; notice: string; onSubmit: (email: string, password: string, confirmation?: string) => Promise<boolean> }
export default function AuthPage({ busy, notice, onSubmit }: Props) {
  const [signup, setSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const invalid = signup ? validateSignup(email, password, confirmation) : validateCredentials(email, password);
    if (invalid) { setError(invalid); return; }
    setError('');
    try { if (await onSubmit(email, password, signup ? confirmation : undefined)) setSignup(false); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to connect. Please try again.'); }
    finally { setPassword(''); setConfirmation(''); }
  }
  function switchMode() { setSignup(!signup); setPassword(''); setConfirmation(''); setError(''); }
  return <AuthLayout><p className="eyebrow">WELCOME TO KEVAI</p><h2>{signup ? 'Join the game.' : 'Back in the game.'}</h2>
    <p className="muted">{signup ? 'Create your account to get started.' : 'Sign in to your account to get started.'}</p>
    <form onSubmit={handleSubmit} aria-busy={busy}>
      <label htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="username" placeholder="you@example.com" required maxLength={254} disabled={busy} value={email} onChange={event => setEmail(event.target.value)} />
      <PasswordInput key={signup ? 'new' : 'existing'} id="password" label="Password" value={password} onChange={setPassword} newPassword={signup} disabled={busy} />
      {signup && <PasswordInput id="confirm-password" label="Confirm password" value={confirmation} onChange={setConfirmation} newPassword disabled={busy} />}
      <p className="message" role="status" aria-live="polite" style={!error && notice ? {color: '#244f37'} : undefined}>{error || notice}</p>
      <button className="primary" type="submit" disabled={busy}>{busy ? (signup ? 'Creating account…' : 'Signing in…') : (signup ? 'Create account' : 'Sign in')} <span aria-hidden="true">↗</span></button>
    </form>
    <div className="account-help">{signup ? 'Already have an account?' : 'New to KevAI?'} <button type="button" className="text-button" disabled={busy} onClick={switchMode}>{signup ? 'Sign in' : 'Create account'}</button></div>
  </AuthLayout>;
}
