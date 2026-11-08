import type { PipelineDraftStatus } from "../contracts/ProjectDocumentSession";
import type { ProjectTransitionIntent } from "../application/useProjectTransitions";

interface Props {
  pending?: ProjectTransitionIntent;
  dirty: PipelineDraftStatus[];
  canSaveAll: boolean;
  saving: boolean;
  error?: string;
  onCancel: () => void;
  onDiscard: () => Promise<void>;
  onSaveAll: () => Promise<void>;
}

export default function ProjectTransitionDialog(props: Props) {
  if (!props.pending) return null;
  const action = props.pending === "open" ? "open another project" : "close this project";
  return <div className="modal-backdrop" onPointerDown={props.onCancel} role="presentation">
    <section aria-labelledby="transition-title" className="project-transition-modal"
      onPointerDown={stop} role="dialog">
      <header><div><span>UNSAVED CHANGES</span><h2 id="transition-title">Save before you {action}?</h2></div>
        <button aria-label="Cancel project change" onClick={props.onCancel} type="button">×</button></header>
      <p>The following pipelines contain changes that have not been written to disk.</p>
      <ul>{props.dirty.map((item) => <li key={item.path}><strong>{item.name}</strong>
        <span>{item.canSave ? "Ready to save" : "Debug required"}</span></li>)}</ul>
      {!props.canSaveAll && <p className="transition-warning">
        Run Debug and resolve diagnostics before saving all pipelines.</p>}
      {props.error && <p className="project-error">{props.error}</p>}
      <footer><button onClick={props.onCancel} type="button">Cancel</button>
        <button className="danger" disabled={props.saving}
          onClick={() => void props.onDiscard()} type="button">Discard and continue</button>
        <button className="primary" disabled={!props.canSaveAll || props.saving}
          onClick={() => void props.onSaveAll()} type="button">
          {props.saving ? "Saving…" : "Save all"}</button></footer>
    </section>
  </div>;
}

function stop(event: React.PointerEvent) {
  event.stopPropagation();
}
