import { useEffect, useRef, useState } from 'react';

export function LoginScreen({ onUnlock, wallpaper }: { onUnlock: () => void; wallpaper: string }) {
  const [step, setStep] = useState<'idle' | 'password'>('idle');
  const [password, setPassword] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === 'password') inputRef.current?.focus();
  }, [step]);

  return (
    <div className="login" style={{ background: wallpaper }}>
      <div className="login-veil" />
      <div className="login-panel">
        <div className="login-clock">
          {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
        <div className="login-avatar">K</div>
        <div className="login-name">Knits Studio</div>

        {step === 'idle' ? (
          <button className="login-cta" onClick={() => setStep('password')}>
            Click to unlock
          </button>
        ) : (
          <form
            className="login-form"
            onSubmit={(e) => {
              e.preventDefault();
              onUnlock();
            }}
          >
            <input
              ref={inputRef}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter Password"
              aria-label="Password"
            />
            <button type="submit" aria-label="Unlock">
              →
            </button>
          </form>
        )}

        <p className="login-hint">Any password works — this is a simulation.</p>
      </div>
    </div>
  );
}
