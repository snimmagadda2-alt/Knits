import { useEffect, useRef, useState, type FormEvent } from 'react';
import { verifyPassword, type Account } from '../account';

export function LoginScreen({
  account,
  onUnlock,
  wallpaper,
}: {
  account: Account;
  onUnlock: () => void;
  wallpaper: string;
}) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || !password) return;
    setBusy(true);
    const ok = await verifyPassword(password);
    setBusy(false);
    setPassword('');
    if (ok) {
      setError(false);
      onUnlock();
    } else {
      setError(true);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="login" style={{ background: wallpaper }}>
      <div className="login-veil" />
      <div className="login-panel">
        <div className="login-clock">
          {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
        <div className="login-avatar">{account.name.charAt(0).toUpperCase()}</div>
        <div className="login-name">{account.name}</div>

        <form className="login-form" onSubmit={submit}>
          <input
            ref={inputRef}
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setError(false);
            }}
            placeholder="Enter Password"
            aria-label="Password"
            autoComplete="current-password"
            maxLength={64}
          />
          <button type="submit" aria-label="Log in" disabled={busy}>
            →
          </button>
        </form>

        {error ? (
          <p className="login-error" role="alert">
            Incorrect password. Try again.
          </p>
        ) : (
          <p className="login-hint">Your account is stored on this computer only.</p>
        )}
      </div>
    </div>
  );
}
