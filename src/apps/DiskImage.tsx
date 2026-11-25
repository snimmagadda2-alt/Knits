import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useLibrary, type Volume } from '../library';
import { AppletIcon } from './Applet';
import { Glyph } from '../components/Icon';

interface Props {
  volume: Volume;
  onClose: () => void;
  onEject: () => void;
  onRun: (id: string) => void;
}

export function DiskImage({ volume, onClose, onEject, onRun }: Props) {
  const { install, installed } = useLibrary();
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [over, setOver] = useState(false);
  const folderRef = useRef<HTMLDivElement>(null);
  const record = installed(volume.app.id);

  const copy = () => install(volume.download);

  const hitFolder = (x: number, y: number) => {
    const rect = folderRef.current?.getBoundingClientRect();
    return !!rect && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  };

  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (record) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* synthetic pointer or capture already released */
    }
    setDrag({ x: e.clientX, y: e.clientY });
  };

  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag) return;
    setDrag({ x: e.clientX, y: e.clientY });
    setOver(hitFolder(e.clientX, e.clientY));
  };

  const onUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (drag && hitFolder(e.clientX, e.clientY)) copy();
    setDrag(null);
    setOver(false);
  };

  return (
    <div className="installer-backdrop">
      <div className="installer volume" role="dialog" aria-modal="true" aria-labelledby="volume-title">
        <header className="installer-head">
          <span id="volume-title">{volume.name}</span>
          <span className="volume-actions">
            <button className="volume-eject" onClick={onEject} aria-label={`Eject ${volume.name}`}>
              <Glyph name="eject" size={14} /> Eject
            </button>
            <button className="whatsnew-x" onClick={onClose} aria-label="Close the volume window">
              ×
            </button>
          </span>
        </header>

        <div className="installer-body volume-body">
          <div className="installer-volume">
            <div
              className={`volume-app${drag ? ' is-dragging' : ''}`}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={() => {
                setDrag(null);
                setOver(false);
              }}
              onDoubleClick={() => !record && copy()}
              role="button"
              tabIndex={0}
              aria-label={`${volume.app.name}, drag to Applications`}
            >
              <AppletIcon kind={volume.app.kind} size={52} />
              <span>{volume.app.name}</span>
            </div>

            <span className="installer-arrow" aria-hidden>
              →
            </span>

            <div ref={folderRef} className={`installer-folder${over ? ' is-target' : ''}`}>
              <Glyph name="folder" size={34} />
              <span>Applications</span>
            </div>
          </div>

          {record ? (
            <div className="installer-done">
              <Glyph name="check" size={18} />
              <div>
                <strong>{volume.app.name} is in Applications.</strong>
                <p>Drag it to the Trash to remove it, or eject this volume when you are done.</p>
              </div>
            </div>
          ) : (
            <p className="installer-note">
              Drag {volume.app.name} onto the Applications folder to install it, or double-click it.
            </p>
          )}

          <p className="installer-note">
            Mounted from {volume.download.fileName} · version {volume.app.version} · {volume.app.publisher}. Copies land
            in Knits, never on your real disk.
          </p>
        </div>

        <footer className="installer-foot">
          <button className="btn btn-small btn-ghost" onClick={onEject}>
            Eject
          </button>
          {record && (
            <button
              className="btn btn-small"
              onClick={() => {
                onRun(`app:${volume.app.id}`);
                onClose();
              }}
            >
              Open {volume.app.name}
            </button>
          )}
        </footer>
      </div>

      {drag && (
        <div className="volume-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden>
          <AppletIcon kind={volume.app.kind} size={46} />
        </div>
      )}
    </div>
  );
}
