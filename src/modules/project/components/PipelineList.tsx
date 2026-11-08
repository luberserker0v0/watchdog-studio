import type { PipelineSummary } from "../contracts/ProjectSummary";

interface Props {
  pipelines: PipelineSummary[];
  activePath?: string;
  selectedPath?: string;
  busy: boolean;
  onOpen: (pipeline: PipelineSummary) => void;
  onEditSource: (pipeline: PipelineSummary) => void;
  onSelect: (path: string) => void;
}

export default function PipelineList(props: Props) {
  if (!props.pipelines.length) return <p className="empty-list">No pipeline source sets found.</p>;
  return <ul className="pipeline-list">{props.pipelines.map((pipeline) =>
    <li className={pipelineClass(pipeline, props)} key={pipeline.pipelinePath}
      onClick={() => props.onSelect(pipeline.pipelinePath)}
      onDoubleClick={() => props.onOpen(pipeline)}>
      <div><strong>{pipeline.name}</strong><code>{pipeline.pipelinePath}</code>
        <span>{pipeline.layoutPath ? "Saved layout" : "Automatic layout"}</span></div>
      <button aria-label={`Edit ${pipeline.name} pipeline JSON`} className="file-button"
        disabled={props.busy} onClick={(event) => {
          event.stopPropagation(); props.onEditSource(pipeline);
        }} title="Edit pipeline JSON" type="button"><FileIcon /></button>
    </li>)}</ul>;
}

function pipelineClass(pipeline: PipelineSummary, props: Props): string {
  const names = [props.selectedPath === pipeline.pipelinePath ? "selected" : "",
    props.activePath === pipeline.pipelinePath ? "open" : ""];
  return names.filter(Boolean).join(" ");
}

export function FileIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6 2h8l4 4v16H6z" />
    <path d="M14 2v5h5M9 12h6M9 16h6" /></svg>;
}
