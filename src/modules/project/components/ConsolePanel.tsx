import { useState, type PointerEvent } from "react";
import type { DebugEntry } from "../application/usePipelineDebug";

interface Props {
  entries: DebugEntry[];
  pending: boolean;
  stale: boolean;
  onClear: () => void;
}

export default function ConsolePanel({ entries, pending, stale, onClear }: Props) {
  const [open, setOpen] = useState(false);
  const [readCount, setReadCount] = useState(0);
  const resize = useConsoleResize();
  const unread = entries.length > readCount;
  const toggle = () => { setOpen((current) => !current); setReadCount(entries.length); };
  return (
    <section className={`debug-console${open ? " open" : ""}`}
      style={open ? { height: resize.height } : undefined}>
      {open && <div aria-hidden="true" className="console-resize-handle"
        onPointerDown={resize.begin} />}
      <ConsoleBar open={open} pending={pending} stale={stale} unread={unread}
        onClear={onClear} onToggle={toggle} />
      {open && <ConsoleEntries entries={entries} />}
    </section>
  );
}

function useConsoleResize() {
  const [height, setHeight] = useState(260);
  const begin = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startY = event.clientY; const startHeight = height;
    const move = (next: globalThis.PointerEvent) => {
      const maximum = Math.round(window.innerHeight * .75);
      setHeight(Math.max(120, Math.min(maximum, startHeight + startY - next.clientY)));
    };
    const finish = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish);
  };
  return { height, begin };
}

function ConsoleBar(props: {
  open: boolean; pending: boolean; stale: boolean; unread: boolean;
  onClear: () => void; onToggle: () => void;
}) {
  const status = props.pending ? "Debugging…" : props.stale ? "Debug result is stale" : "Console";
  return <header className="console-bar">
    <button className="console-toggle" onClick={props.onToggle} type="button">
      <span className={`console-dot${props.unread ? " unread" : ""}`} />
      <span aria-hidden="true">{props.open ? "⌄" : ">"}</span><strong>{status}</strong>
    </button>
    {props.open && <button onClick={props.onClear} type="button">Clear</button>}
  </header>;
}

function ConsoleEntries({ entries }: { entries: DebugEntry[] }) {
  if (!entries.length) return <p className="console-empty">No debug messages.</p>;
  return <ol className="console-entries">{entries.map((item) =>
    <li className={item.level} key={item.id}>
      <time>{item.time}</time><strong>{item.title}</strong><span>{item.detail}</span>
    </li>)}</ol>;
}
