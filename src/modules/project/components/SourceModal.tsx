import { useState } from "react";

interface Props {
  title: string;
  path: string;
  source: string;
  onApply: (source: string) => void;
  onClose: () => void;
}

export default function SourceModal(props: Props) {
  const [source, setSource] = useState(props.source);
  return <div className="modal-backdrop" onPointerDown={props.onClose} role="presentation">
    <section aria-labelledby="source-title" className="source-modal" onPointerDown={stop} role="dialog">
      <header><div><span>{props.path}</span><h2 id="source-title">{props.title}</h2></div>
        <button aria-label="Close source editor" onClick={props.onClose} type="button">×</button></header>
      <textarea aria-label={`${props.title} source`} onChange={(event) => setSource(event.target.value)}
        spellCheck={false} value={source} />
      <footer><p>Changes join the current draft. Run Debug to validate them.</p>
        <div><button onClick={props.onClose} type="button">Cancel</button>
        <button className="primary" onClick={() => { props.onApply(source); props.onClose(); }}
          type="button">Apply draft</button></div></footer>
    </section>
  </div>;
}

function stop(event: React.PointerEvent) {
  event.stopPropagation();
}
