import { useState } from "react";
import {
  CLOSE_PROJECT_EVENT, DEBUG_EVENT, OPEN_PROJECT_EVENT,
} from "../../shared/contracts/studioEvents";

export default function StudioHeader() {
  const [menu, setMenu] = useState(false);
  const [about, setAbout] = useState(false);
  const debug = () => window.dispatchEvent(new CustomEvent(DEBUG_EVENT));
  return (
    <header className="studio-header">
      <div className="studio-brand"><span className="studio-eyebrow">WATCHDOG AUTOMATION</span>
        <h1>WatchDog Studio</h1></div>
      <div className="header-actions">
        <button aria-label="Debug active pipeline" onClick={debug} title="Debug" type="button">⌁</button>
        <div className="header-menu"><button aria-expanded={menu} aria-label="Open application menu"
          onClick={() => setMenu((value) => !value)} type="button">▾</button>
        {menu && <HeaderMenu close={() => setMenu(false)} openAbout={() => setAbout(true)} />}</div>
      </div>
      {about && <AboutModal onClose={() => setAbout(false)} />}
    </header>
  );
}

function HeaderMenu(props: { close: () => void; openAbout: () => void }) {
  const dispatch = (event: string) => {
    window.dispatchEvent(new CustomEvent(event)); props.close();
  };
  return <div className="header-menu-popover">
    <button onClick={() => dispatch(OPEN_PROJECT_EVENT)} type="button">Open Project…</button>
    <button onClick={() => dispatch(CLOSE_PROJECT_EVENT)} type="button">Close Project</button>
    <hr />
    <button onClick={() => { props.openAbout(); props.close(); }} type="button">About</button>
  </div>;
}

function AboutModal({ onClose }: { onClose: () => void }) {
  return <div className="modal-backdrop" onPointerDown={onClose} role="presentation">
    <section aria-labelledby="about-title" className="about-modal" onPointerDown={stop} role="dialog">
      <header><div><span>WATCHDOG AUTOMATION</span><h2 id="about-title">WatchDog Studio</h2></div>
        <button aria-label="Close About" onClick={onClose} type="button">×</button></header>
      <p>A graph-first editor for WatchDog 2 pipeline projects.</p>
      <small>Studio 0.1.0 · WatchDog specification 2.0.0</small>
    </section>
  </div>;
}

function stop(event: React.PointerEvent) {
  event.stopPropagation();
}
