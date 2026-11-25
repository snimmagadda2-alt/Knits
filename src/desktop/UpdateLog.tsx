import { useEffect } from 'react';
import { LATEST, releaseNotes } from '../changelog';

interface Props {
  since: string | null;
  onClose: () => void;
}

export function UpdateLog({ since, onClose }: Props) {
  const notes = releaseNotes(since);
  const shown = notes.length > 0 ? notes : [LATEST];
  const heading = since && notes.length > 0 ? `What's new in Knits ${LATEST.version}` : 'Knits release notes';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="whatsnew-backdrop">
      <div className="whatsnew" role="dialog" aria-modal="true" aria-labelledby="whatsnew-title">
        <header className="whatsnew-head">
          <div>
            <h2 id="whatsnew-title">{heading}</h2>
            <p>{since ? 'Knits updated. Here is everything that changed.' : 'Everything that has shipped so far.'}</p>
          </div>
          <button className="whatsnew-x" onClick={onClose} aria-label="Close the update log">
            ×
          </button>
        </header>

        <div className="whatsnew-body">
          {shown.map((release) => (
            <article className="whatsnew-release" key={release.version}>
              <h3>
                Knits {release.version}
                <span>{release.date}</span>
              </h3>
              <ul>
                {release.changes.map((change) => (
                  <li key={change}>{change}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
