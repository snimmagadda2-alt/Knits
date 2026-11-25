import { useEffect, useState } from 'react';
import type { AppletKind, InstalledApp } from '../library';

const PALETTES: Record<AppletKind, [string, string]> = {
  clock: ['#3a3a42', '#111114'],
  weather: ['#4fa8ff', '#0a63d6'],
  gallery: ['#ff8f6b', '#bf5af2'],
};

export function AppletIcon({ kind, size = 52 }: { kind: AppletKind; size?: number }) {
  const [from, to] = PALETTES[kind] ?? PALETTES.clock;
  const id = `applet-${kind}`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill={`url(#${id})`} />
      <rect x="1" y="1" width="62" height="62" rx="14" fill="none" stroke="rgba(255,255,255,0.18)" />
      {kind === 'clock' && (
        <g fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round">
          <circle cx="32" cy="32" r="18" />
          <path d="M32 20v13l8 5" />
        </g>
      )}
      {kind === 'weather' && (
        <g fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="25" cy="25" r="7" />
          <path d="M25 12v4M25 34v4M12 25h4M36 25h4M16 16l3 3M31 31l3 3" />
          <path d="M22 45a8 8 0 0 1 1-16 10 10 0 0 1 19 3 6 6 0 0 1-2 13z" fill="#fff" stroke="none" />
        </g>
      )}
      {kind === 'gallery' && (
        <g fill="none" stroke="#fff" strokeWidth="2.8" strokeLinejoin="round">
          <rect x="13" y="16" width="38" height="32" rx="4" />
          <circle cx="24" cy="26" r="3.4" fill="#fff" stroke="none" />
          <path d="M15 43l11-11 8 8 7-6 8 9" />
        </g>
      )}
    </svg>
  );
}

function Clock({ app }: { app: InstalledApp }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const zones = Array.isArray(app.payload.zones)
    ? (app.payload.zones as { label?: unknown; zone?: unknown }[]).map((item) => ({
        label: typeof item.label === 'string' ? item.label : 'City',
        zone: typeof item.zone === 'string' ? item.zone : null,
      }))
    : [];

  const time = (zone: string | null) => {
    try {
      return now.toLocaleTimeString(undefined, zone ? { timeZone: zone } : undefined);
    } catch {
      return now.toLocaleTimeString();
    }
  };

  return (
    <div className="applet applet-clock">
      <div className="clock-face">
        <span className="clock-time">{now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
        <span className="clock-date">
          {now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
        </span>
      </div>
      <ul className="clock-zones">
        {zones.map((zone) => (
          <li key={`${zone.label}-${zone.zone ?? 'local'}`}>
            <span>{zone.label}</span>
            <strong>{time(zone.zone)}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Weather({ app }: { app: InstalledApp }) {
  const location = typeof app.payload.location === 'string' ? app.payload.location : 'Knits Studio';
  const forecast = Array.isArray(app.payload.forecast)
    ? (app.payload.forecast as { day?: unknown; condition?: unknown; high?: unknown; low?: unknown }[]).map((row) => ({
        day: typeof row.day === 'string' ? row.day : '—',
        condition: typeof row.condition === 'string' ? row.condition : '',
        high: typeof row.high === 'number' ? row.high : 0,
        low: typeof row.low === 'number' ? row.low : 0,
      }))
    : [];

  return (
    <div className="applet applet-weather">
      <header>
        <h2>{location}</h2>
        <span>Five day forecast</span>
      </header>
      <ul>
        {forecast.map((row) => (
          <li key={row.day}>
            <span className="weather-day">{row.day}</span>
            <span className="weather-condition">{row.condition}</span>
            <span className="weather-range">
              {row.high}° <em>{row.low}°</em>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Gallery({ app }: { app: InstalledApp }) {
  const tiles = Array.isArray(app.payload.tiles)
    ? (app.payload.tiles as { label?: unknown; from?: unknown; to?: unknown }[]).map((tile) => ({
        label: typeof tile.label === 'string' ? tile.label : '',
        from: typeof tile.from === 'string' ? tile.from : '#3a3a42',
        to: typeof tile.to === 'string' ? tile.to : '#111114',
      }))
    : [];

  return (
    <div className="applet applet-gallery">
      <div className="gallery-grid">
        {tiles.map((tile) => (
          <figure key={tile.label} style={{ background: `linear-gradient(150deg, ${tile.from}, ${tile.to})` }}>
            <figcaption>{tile.label}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

export function Applet({ app }: { app: InstalledApp }) {
  if (app.kind === 'weather') return <Weather app={app} />;
  if (app.kind === 'gallery') return <Gallery app={app} />;
  return <Clock app={app} />;
}
