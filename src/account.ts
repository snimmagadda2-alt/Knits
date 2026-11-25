/**
 * The account you set up on the welcome screen: a name and a password.
 *
 * It is stored in this browser's localStorage — nothing leaves the computer, and
 * the password is kept as a salted hash rather than the text you typed.
 */
export interface Account {
  name: string;
  salt: string;
  hash: string;
  createdAt: string;
}

const KEY = 'knits.account';

function randomSalt(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * SHA-256 where WebCrypto is available (https and 127.0.0.1); a plain hash where it
 * is not, so an account can still be created from a file:// copy of the app.
 */
async function digest(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buffer = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  let hash = 0x811c9dc5;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `fnv1a-${hash.toString(16)}`;
}

/** The account saved on this computer, or null before the welcome screen has run. */
export function readAccount(): Account | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Account>;
    if (!parsed.name || !parsed.salt || !parsed.hash) return null;
    return {
      name: parsed.name,
      salt: parsed.salt,
      hash: parsed.hash,
      createdAt: parsed.createdAt ?? '',
    };
  } catch {
    return null;
  }
}

export async function createAccount(name: string, password: string): Promise<Account> {
  const salt = randomSalt();
  const hash = await digest(`${salt}:${password}`);
  const account: Account = {
    name: name.trim(),
    salt,
    hash,
    createdAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(account));
  } catch {
    /* storage unavailable: the account lasts for this visit only */
  }
  return account;
}

/** Checks a typed password against the saved account. No account means nothing to check. */
export async function verifyPassword(password: string): Promise<boolean> {
  const account = readAccount();
  if (!account) return true;
  return (await digest(`${account.salt}:${password}`)) === account.hash;
}
