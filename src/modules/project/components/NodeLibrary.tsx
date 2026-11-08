import type { PipelineDocument } from "../contracts/PipelineDocument";
import type { PipelineSummary } from "../contracts/ProjectSummary";
import type { NodeTemplate } from "../contracts/NodeTemplate";
import type { NodePosition } from "../domain/layoutDraft";
import { clearNodeTemplateSelection } from "../application/useNodeTemplateDrag";
import { FileIcon } from "./PipelineList";

interface Props {
  pipelines: PipelineSummary[];
  documents: PipelineDocument[];
  canAdd: boolean;
  loadedPaths: string[];
  onEditMetadata: (pipeline: PipelineSummary) => void;
  onAddNode: (template: NodeTemplate) => void;
  onBeginDrag: (template: NodeTemplate, client: NodePosition) => void;
  selectedKey?: string;
  onSelect: (key: string) => void;
}

export default function NodeLibrary(props: Props) {
  return <div className="node-library">
    <BuiltInNodes canAdd={props.canAdd} onAdd={props.onAddNode} onBeginDrag={props.onBeginDrag}
      onSelect={props.onSelect} selectedKey={props.selectedKey} />
    {props.pipelines.map((pipeline) => <PipelineNodeGroup key={pipeline.pipelinePath}
      document={loadedDocument(pipeline, props)}
      canAdd={props.canAdd} onAdd={props.onAddNode} onBeginDrag={props.onBeginDrag}
      onEdit={() => props.onEditMetadata(pipeline)}
      onSelect={props.onSelect} pipeline={pipeline}
      selectedKey={props.selectedKey} />)}
  </div>;
}

function BuiltInNodes(props: { canAdd: boolean; onAdd: (template: NodeTemplate) => void;
  onBeginDrag: Props["onBeginDrag"];
  onSelect: (key: string) => void;
  selectedKey?: string }) {
  return <section className="node-group"><header><strong>Built-in nodes</strong></header>
    <div className="node-cards"><NodeCard disabled={!props.canAdd} onAdd={props.onAdd}
      onBeginDrag={props.onBeginDrag} template={builtInTemplate("Entry")}
      onSelect={props.onSelect} selected={props.selectedKey === "builtin:Entry"} selectionKey="builtin:Entry" />
      <NodeCard disabled={!props.canAdd} onAdd={props.onAdd} onSelect={props.onSelect}
        onBeginDrag={props.onBeginDrag} template={builtInTemplate("Endpoint")}
        selected={props.selectedKey === "builtin:Endpoint"} selectionKey="builtin:Endpoint" /></div></section>;
}

function PipelineNodeGroup(props: {
  pipeline: PipelineSummary; document?: PipelineDocument;
  canAdd: boolean;
  onEdit: () => void; onAdd: (template: NodeTemplate) => void; onBeginDrag: Props["onBeginDrag"];
  selectedKey?: string; onSelect: (key: string) => void;
}) {
  const definitions = props.document ? definitionsFrom(props.document.metadataSource) : [];
  return <section className="node-group"><header><strong>{props.pipeline.name}</strong>
    <button aria-label={`Edit ${props.pipeline.name} metadata JSON`} className="file-button"
      onClick={props.onEdit} title="Edit meta JSON" type="button"><FileIcon /></button></header>
    {!props.document && <p className="unloaded-node-group">Open this pipeline to load its nodes.</p>}
    <div className="node-cards">{definitions.map((template) =>
      <NodeCard disabled={!props.canAdd} key={template.nodeId} onAdd={props.onAdd}
        onBeginDrag={props.onBeginDrag}
        onSelect={props.onSelect}
        selected={props.selectedKey === `${props.pipeline.pipelinePath}:${template.nodeId}`}
        selectionKey={`${props.pipeline.pipelinePath}:${template.nodeId}`} template={template} />)}</div>
  </section>;
}

function loadedDocument(pipeline: PipelineSummary, props: Props): PipelineDocument | undefined {
  if (!props.loadedPaths.includes(pipeline.pipelinePath)) return undefined;
  return props.documents.find((item) => item.pipelinePath === pipeline.pipelinePath);
}

function NodeCard(props: { template: NodeTemplate; onAdd: (template: NodeTemplate) => void;
  onBeginDrag: Props["onBeginDrag"];
  selectionKey: string; selected: boolean; onSelect: (key: string) => void; disabled: boolean }) {
  return <button className={`node-card ${props.template.kind.toLowerCase()}${props.selected ? " selected" : ""}`}
    disabled={props.disabled}
    onDragStart={(event) => event.preventDefault()}
    onPointerDown={(event) => beginDrag(event, props.template, props.onBeginDrag)}
    onClick={() => props.onSelect(props.selectionKey)}
    onDoubleClick={() => props.onAdd(props.template)} title="Double-click or drag to the active pipeline"
    type="button"><span>{props.template.kind}</span><strong>{props.template.nodeId}</strong></button>;
}

function definitionsFrom(source: string): NodeTemplate[] {
  try {
    const root = JSON.parse(source) as { nodes?: Record<string, unknown> };
    return Object.entries(root.nodes ?? {}).map(([nodeId, value]) => templateFrom(nodeId, value));
  } catch { return []; }
}

function templateFrom(nodeId: string, value: unknown): NodeTemplate {
  const definition = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
  const kind = definition.kind === "Entry" || definition.kind === "Endpoint"
    ? definition.kind : "Normal";
  return { nodeId, kind, definition };
}

function builtInTemplate(kind: "Entry" | "Endpoint"): NodeTemplate {
  return { nodeId: kind, kind, definition: { kind } };
}

function beginDrag(event: React.PointerEvent, template: NodeTemplate, begin: Props["onBeginDrag"]) {
  if (event.button !== 0) return;
  clearNodeTemplateSelection();
  begin(template, { x: event.clientX, y: event.clientY });
}
