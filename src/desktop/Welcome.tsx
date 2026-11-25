import { useEffect, useRef, useState } from 'react';
import { createAccount, type Account } from '../account';

/**
 * First run: ask for a name, then a password, and save the account on this computer.
 * The login screen asks for that password before the desktop opens.
 */
export function Welcome({ wallpaper, onCreated }: { wallpaper: string; onCreated: (account: Account) => void }) {
  const [step, setStep] = useState<'name' | 'password'>('name');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [step]);

  const submitName = () => {
    const value = name.trim();
    if (!value) {
      setError('Knits needs a name to put on the login screen.');
      return;
    }
    setError(null);
    setName(value);
    setStep('password');
  };

  const submitPassword = async () => {
    if (password.length < 4) {
      setError('Use at least four characters.');
      return;
    }
    setError(null);
    setBusy(true);
    const account = await createAccount(name, password);
    setBusy(false);
    onCreated(account);
  };

  const initial = name.trim().charAt(0).toUpperCase() || 'K';

  return (
    <div className="login" style={{ background: wallpaper }}>
      <div className="login-veil" />
      <div className="login-panel">
        <div className="login-clock">Welcome to Knits {__VERSION__}</div>
        <div className="login-avatar">{initial}</div>
        <h1 className="login-name">
          {step === 'name' ? "What's your name?" : `Nice to meet you, ${name}`}
        </h1>
        <p className="login-sub">
          {step === 'name'
            ? 'This is the account you will sign in with on this computer.'
            : 'Choose a password for your account. You will type it to sign in.'}
        </p>

        {step === 'name' ? (
          <form
            className="login-form"
            onSubmit={(event) => {
              event.preventDefault();
              submitName();
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
              aria-label="Your name"
              autoComplete="given-name"
              maxLength={32}
            />
            <button type="submit" aria-label="Continue">
              →
            </button>
          </form>
        ) : (
          <form
            className="login-form"
            onSubmit={(event) => {
              event.preventDefault();
              void submitPassword();
            }}
          >
            <input
              ref={inputRef}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Choose a password"
              aria-label="Choose a password"
              autoComplete="new-password"
              maxLength={64}
            />
            <button type="submit" aria-label="Create account" disabled={busy}>
              →
            </button>
          </form>
        )}

        {error && <p className="login-error">{error}</p>}
        <p className="login-hint">
          {step === 'name'
            ? 'Stays on this computer — no account is created anywhere else.'
            : 'The password is saved as a hash in this browser, never sent anywhere.'}
        </p>
      </div>
    </div>
  );
}
