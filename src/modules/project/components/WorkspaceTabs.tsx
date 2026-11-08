import type { PipelineDocument } from "../contracts/PipelineDocument";

interface Props {
  documents: PipelineDocument[];
  activePath?: string;
  onActivate: (path: string) => void;
  onClose: (path: string) => void;
}

export default function WorkspaceTabs(props: Props) {
  return <nav aria-label="Open pipelines" className="workspace-tabs">
    {props.documents.map((document) => <div className={document.pipelinePath === props.activePath
      ? "workspace-tab active" : "workspace-tab"} key={document.pipelinePath}>
      <button onClick={() => props.onActivate(document.pipelinePath)} type="button">
        {document.name}</button>
      <button aria-label={`Close ${document.name}`} className="tab-close"
        onClick={() => props.onClose(document.pipelinePath)} type="button">×</button>
    </div>)}
  </nav>;
}
