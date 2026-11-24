import { AppIcon } from '../components/Icon';

const SPECS: [string, string][] = [
  ['Chip', 'Knits M3 (virtual)'],
  ['Memory', '16 GB unified'],
  ['Startup disk', 'Knits HD — 128 GB'],
  ['Display', 'Retina, 2560 × 1600 (scaled)'],
  ['Window server', 'Knits Window Server 1.0'],
  ['Shell', 'knsh 1.0'],
];

export function About() {
  return (
    <div className="about">
      <div className="about-icon">
        <AppIcon id="about" size={92} />
      </div>
      <h1>Knits</h1>
      <p className="about-version">Version {__VERSION__}</p>

      <dl className="about-specs">
        {SPECS.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      <p className="about-footnote">
        Knits is a macOS-style simulation built with web technology. It is not affiliated with Apple and does not run
        macOS software.
      </p>
    </div>
  );
}
