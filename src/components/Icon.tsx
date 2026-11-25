import type { AppId } from '../apps';

type IconId = AppId | 'trash';

export function AppIcon({ id, size = 52 }: { id: IconId; size?: number }) {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 64 64',
    xmlns: 'http://www.w3.org/2000/svg',
    'aria-hidden': true,
  } as const;

  switch (id) {
    case 'store':
      return (
        <svg {...props}>
          <defs>
            <linearGradient id="store" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#2b7bff" />
              <stop offset="0.55" stopColor="#5b5cff" />
              <stop offset="1" stopColor="#b45cff" />
            </linearGradient>
          </defs>
          <rect width="64" height="64" rx="15" fill="url(#store)" />
          <rect x="1" y="1" width="62" height="62" rx="14" fill="none" stroke="rgba(255,255,255,0.2)" />
          <path
            d="M19.5 24.5h25L42 48H22z"
            fill="rgba(255,255,255,0.18)"
            stroke="#fff"
            strokeWidth="2.6"
            strokeLinejoin="round"
          />
          <path d="M26.5 24.5v-2a5.5 5.5 0 0 1 11 0v2" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
          <g stroke="#fff" strokeWidth="2.2" strokeLinecap="round" opacity="0.95">
            <path d="M27.5 32.5l7 7M34.5 32.5l-7 7" />
            <path d="M27 43.5h10" />
          </g>
        </svg>
      );
    case 'safari':
      return (
        <svg {...props}>
          <defs>
            <linearGradient id="saf" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#4fd0ff" />
              <stop offset="1" stopColor="#0a63d6" />
            </linearGradient>
          </defs>
          <rect width="64" height="64" rx="15" fill="url(#saf)" />
          <rect x="1" y="1" width="62" height="62" rx="14" fill="none" stroke="rgba(255,255,255,0.2)" />
          <circle cx="32" cy="32" r="21.5" fill="none" stroke="rgba(255,255,255,0.92)" strokeWidth="2.4" />
          <g stroke="rgba(255,255,255,0.55)" strokeWidth="1.8" strokeLinecap="round">
            <path d="M32 12.5v2.6" />
            <path d="M32 48.9v2.6" />
            <path d="M12.5 32h2.6" />
            <path d="M48.9 32h2.6" />
          </g>
          <path d="M41.5 22.5L27.6 28.2 22.5 41.5 36.4 35.8z" fill="#fff" />
          <path d="M36.4 35.8l5.1-13.3-13.9 5.7z" fill="#ff5a4f" />
        </svg>
      );
    case 'finder':
      return (
        <svg {...props}>
          <defs>
            <linearGradient id="fnd-a" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#4fc3ff" />
              <stop offset="1" stopColor="#1a7fd4" />
            </linearGradient>
            <linearGradient id="fnd-b" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#f7fbff" />
              <stop offset="1" stopColor="#d6e8f8" />
            </linearGradient>
          </defs>
          <rect width="64" height="64" rx="15" fill="url(#fnd-a)" />
          <path d="M33 0h16a15 15 0 0 1 15 15v34a15 15 0 0 1-15 15H33z" fill="url(#fnd-b)" />
          <circle cx="23" cy="26" r="2.4" fill="#0b2b45" />
          <circle cx="42" cy="26" r="2.4" fill="#0b2b45" />
          <path d="M22 40c3.6 4.4 16.4 4.4 20 0" stroke="#0b2b45" strokeWidth="2.4" strokeLinecap="round" fill="none" />
        </svg>
      );
    case 'terminal':
      return (
        <svg {...props}>
          <defs>
            <linearGradient id="trm" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#3a3a42" />
              <stop offset="1" stopColor="#131316" />
            </linearGradient>
          </defs>
          <rect width="64" height="64" rx="15" fill="url(#trm)" />
          <rect x="1" y="1" width="62" height="62" rx="14" fill="none" stroke="rgba(255,255,255,0.16)" />
          <path d="M16 22l9 10-9 10" stroke="#eaeaea" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M31 42h16" stroke="#eaeaea" strokeWidth="3.4" strokeLinecap="round" />
        </svg>
      );
    case 'notes':
      return (
        <svg {...props}>
          <defs>
            <linearGradient id="nts" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffe066" />
              <stop offset="1" stopColor="#f5b93b" />
            </linearGradient>
          </defs>
          <rect width="64" height="64" rx="15" fill="url(#nts)" />
          <rect x="13" y="12" width="38" height="40" rx="4" fill="#fffdf5" />
          <g stroke="#c9a227" strokeWidth="2.4" strokeLinecap="round">
            <path d="M19 22h26" />
            <path d="M19 30h26" />
            <path d="M19 38h18" />
          </g>
        </svg>
      );
    case 'calculator':
      return (
        <svg {...props}>
          <defs>
            <linearGradient id="calc" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#5b5b63" />
              <stop offset="1" stopColor="#2b2b30" />
            </linearGradient>
          </defs>
          <rect width="64" height="64" rx="15" fill="url(#calc)" />
          <rect x="11" y="11" width="42" height="14" rx="3" fill="#d7d7dc" />
          <g fill="#8e8e96">
            <rect x="11" y="30" width="12" height="10" rx="2.5" />
            <rect x="26" y="30" width="12" height="10" rx="2.5" />
            <rect x="41" y="30" width="12" height="10" rx="2.5" />
            <rect x="11" y="43" width="12" height="10" rx="2.5" />
            <rect x="26" y="43" width="12" height="10" rx="2.5" />
          </g>
          <rect x="41" y="43" width="12" height="10" rx="2.5" fill="#ff9f0a" />
        </svg>
      );
    case 'settings':
      return (
        <svg {...props}>
          <defs>
            <linearGradient id="set" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#b9bcc6" />
              <stop offset="1" stopColor="#71757f" />
            </linearGradient>
          </defs>
          <rect width="64" height="64" rx="15" fill="url(#set)" />
          <circle cx="32" cy="32" r="14" fill="none" stroke="#f6f7fb" strokeWidth="3" />
          <g stroke="#f6f7fb" strokeWidth="3.2" strokeLinecap="round">
            <path d="M32 8v7" />
            <path d="M32 49v7" />
            <path d="M8 32h7" />
            <path d="M49 32h7" />
            <path d="M15 15l5 5" />
            <path d="M44 44l5 5" />
            <path d="M49 15l-5 5" />
            <path d="M20 44l-5 5" />
          </g>
        </svg>
      );
    case 'trash':
      return (
        <svg {...props}>
          <rect width="64" height="64" rx="15" fill="rgba(180,186,200,0.22)" />
          <g stroke="rgba(240,244,255,0.86)" strokeWidth="2.6" fill="none" strokeLinejoin="round">
            <path d="M21 22h22l-2.4 30H23.4z" />
            <path d="M18 22h28" />
            <path d="M27 22v-4h10v4" />
            <path d="M28 29v17" />
            <path d="M36 29v17" />
          </g>
        </svg>
      );
    case 'about':
      return (
        <svg {...props}>
          <defs>
            <linearGradient id="knits" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#6d5cff" />
              <stop offset="0.5" stopColor="#a86bff" />
              <stop offset="1" stopColor="#ff8f6b" />
            </linearGradient>
          </defs>
          <rect width="64" height="64" rx="15" fill="url(#knits)" />
          <g fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" opacity="0.95">
            <circle cx="32" cy="33" r="13" />
            <path d="M21 25c7 3 14 11 17 21" />
            <path d="M43 25c-7 3-14 11-17 21" />
            <path d="M19 33h26" />
            <path d="M32 20v26" />
          </g>
        </svg>
      );
  }
}

export function Glyph({ name, size = 16 }: { name: string; size?: number }) {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    xmlns: 'http://www.w3.org/2000/svg',
    'aria-hidden': true,
  };

  switch (name) {
    case 'search':
      return (
        <svg {...props}>
          <circle cx="11" cy="11" r="6.5" />
          <path d="M16 16l4.5 4.5" />
        </svg>
      );
    case 'wifi':
      return (
        <svg {...props}>
          <path d="M3 9.5a13 13 0 0 1 18 0" />
          <path d="M6.5 13a8 8 0 0 1 11 0" />
          <path d="M10 16.4a3 3 0 0 1 4 0" />
          <circle cx="12" cy="19.4" r="0.9" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'wifi-off':
      return (
        <svg {...props}>
          <path d="M3 9.5a13 13 0 0 1 18 0" opacity="0.45" />
          <path d="M6.5 13a8 8 0 0 1 11 0" opacity="0.45" />
          <path d="M10 16.4a3 3 0 0 1 4 0" opacity="0.45" />
          <path d="M4 4l16 16" />
        </svg>
      );
    case 'lock':
      return (
        <svg {...props}>
          <rect x="5" y="10.5" width="14" height="9.5" rx="2.4" />
          <path d="M8.4 10.5V8a3.6 3.6 0 0 1 7.2 0v2.5" />
        </svg>
      );
    case 'download':
      return (
        <svg {...props}>
          <path d="M12 4v11" />
          <path d="M7.5 10.5L12 15l4.5-4.5" />
          <path d="M4.5 19.5h15" />
        </svg>
      );
    case 'eject':
      return (
        <svg {...props}>
          <path d="M12 4.5L5.5 13h13z" />
          <path d="M5.5 17.5h13" />
        </svg>
      );
    case 'check':
      return (
        <svg {...props}>
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      );
    case 'reload':
      return (
        <svg {...props}>
          <path d="M19.5 12a7.5 7.5 0 1 1-2.6-5.7" />
          <path d="M19.6 4.4v4.6h-4.6" />
        </svg>
      );
    case 'external':
      return (
        <svg {...props}>
          <path d="M13.5 4.5h6v6" />
          <path d="M19.5 4.5l-8 8" />
          <path d="M18 14.5v4a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6h4" />
        </svg>
      );
    case 'battery':
      return (
        <svg {...props}>
          <rect x="2" y="8" width="17" height="9" rx="2.6" />
          <rect x="4" y="10" width="11" height="5" rx="1.4" fill="currentColor" stroke="none" />
          <path d="M21 11v3" />
        </svg>
      );
    case 'control':
      return (
        <svg {...props}>
          <rect x="3.5" y="4" width="7" height="16" rx="3.5" />
          <rect x="13.5" y="4" width="7" height="16" rx="3.5" />
          <circle cx="7" cy="8.5" r="1.9" fill="currentColor" stroke="none" />
          <circle cx="17" cy="15.5" r="1.9" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'folder':
      return (
        <svg {...props}>
          <path d="M3 7.5A2 2 0 0 1 5 5.5h4l2 2.5h8a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        </svg>
      );
    case 'doc':
      return (
        <svg {...props}>
          <path d="M6 3.5h7l5 5v12H6z" />
          <path d="M13 3.5v5h5" />
          <path d="M9 13h6M9 16.5h6" />
        </svg>
      );
    case 'disk':
      return (
        <svg {...props}>
          <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
          <circle cx="12" cy="12" r="3.6" />
          <path d="M12 8.4V4.9" />
        </svg>
      );
    case 'chevron-left':
      return (
        <svg {...props}>
          <path d="M14.5 5.5L8 12l6.5 6.5" />
        </svg>
      );
    case 'chevron-right':
      return (
        <svg {...props}>
          <path d="M9.5 5.5L16 12l-6.5 6.5" />
        </svg>
      );
    case 'plus':
      return (
        <svg {...props}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case 'trash':
      return (
        <svg {...props}>
          <path d="M4.5 7h15M9.5 7V4.8h5V7M6.5 7l1 12.2h9l1-12.2" />
        </svg>
      );
    case 'apple':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <path
            fill="currentColor"
            d="M16.36 12.6c0-2.1 1.72-3.1 1.8-3.15-.98-1.44-2.5-1.64-3.04-1.66-1.29-.13-2.53.77-3.18.77-.66 0-1.67-.75-2.75-.73-1.4.02-2.7.82-3.42 2.08-1.47 2.55-.38 6.32 1.05 8.4.7 1.01 1.53 2.14 2.62 2.1 1.05-.04 1.45-.68 2.72-.68 1.27 0 1.63.68 2.74.66 1.13-.02 1.85-1.03 2.54-2.04.8-1.17 1.13-2.3 1.15-2.36-.03-.01-2.2-.85-2.23-3.39zM14.2 6.2c.58-.7.97-1.68.86-2.65-.83.03-1.85.55-2.45 1.25-.54.62-1 1.62-.87 2.57.93.07 1.88-.47 2.46-1.17z"
          />
        </svg>
      );
    default:
      return null;
  }
}
