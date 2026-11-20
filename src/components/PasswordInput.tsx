import { useState } from 'react';
interface Props { id: string; label: string; value: string; onChange: (value: string) => void; newPassword?: boolean; disabled?: boolean }
export default function PasswordInput({ id, label, value, onChange, newPassword = false, disabled = false }: Props) {
  const [visible, setVisible] = useState(false);
  return <><div className="password-heading"><label htmlFor={id}>{label}</label></div>
    <div className="password-field"><input id={id} name={id} type={visible ? 'text' : 'password'} autoComplete={newPassword ? 'new-password' : 'current-password'}
      placeholder={newPassword ? 'At least 8 characters' : 'Enter your password'} required minLength={newPassword ? 8 : undefined}
      value={value} onChange={event => onChange(event.target.value)} disabled={disabled} />
      <button type="button" aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`} aria-pressed={visible} disabled={disabled} onClick={() => setVisible(!visible)}>{visible ? 'Hide' : 'Show'}</button>
    </div></>;
}
