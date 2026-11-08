import { useEffect, useRef } from "react";
import { DEBUG_EVENT } from "../../../shared/contracts/studioEvents";
import { useDraftPersistence } from "../application/useDraftPersistence";
import { useGraphSelection } from "../application/useGraphSelection";
import { usePipelineDebug } from "../application/usePipelineDebug";
import { usePipelineDraft } from "../application/usePipelineDraft";
import type { NodeTemplateDrag } from "../application/useNodeTemplateDrag";
import type { GraphEdge, NormalizedGraph, PipelineDocument } from "../contracts/PipelineDocument";
import type { NodeTemplate } from "../contracts/NodeTemplate";
import type {
  PipelineDraftStatus, SavePipelineSession,
} from "../contracts/ProjectDocumentSession";
import { resolveNodePositions, type NodePosition } from "../domain/layoutDraft";
import { resolveDraftGraph } from "../domain/draftGraph";
import { resolveNodeDefinitionId, resolvePipelineDraftConfig } from "../domain/metadataDraft";
import { createInstanceId, createNodeName } from "../domain/pipelineDraft";
import { canReplaceRoute, errorRoute } from "../domain/graphRoutes";
import { draftCanSave } from "../domain/projectTransitions";
import ConsolePanel from "./ConsolePanel";
import GraphCanvas from "./GraphCanvas";
import NodeInspector from "./NodeInspector";
import SourceModal from "./SourceModal";

export interface SourceRequest {
  pipelinePath: string;
  kind: "pipeline" | "metadata";
}

interface Props {
  document: PipelineDocument;
  active: boolean;
  addNodeRequest?: { template: NodeTemplate; token: string };
  nodeDrag?: NodeTemplateDrag;
  sourceRequest?: SourceRequest;
  onSourceClosed: () => void;
  onSaved: (document: PipelineDocument) => void;
  onDraftStatus: (path: string, status?: PipelineDraftStatus) => void;
  onSaveReady: (path: string, save?: SavePipelineSession) => void;
}

export default function PipelineDocumentView(props: Props) {
  const editor = usePipelineEditor(props.document, props.onSaved);
  useEditorCommands(props, editor);
  useDocumentSession(props, editor);
  const graph = editor.graph;
  const inspectedId = editor.selection.nodeId ?? editor.selection.edge?.from;
  const selectedNode = graph?.nodes.find((node) => node.id === inspectedId);
  const config = selectedNode ? resolvePipelineDraftConfig({
    metadata: editor.draft.metadataSource, pipeline: editor.draft.pipelineSource,
  }, selectedNode) : undefined;
  return <article className="pipeline-document">
    <DocumentToolbar editor={editor} document={props.document} />
    <GraphWorkspace editor={editor} graph={graph} nodeDrag={props.nodeDrag}
      selectedNode={selectedNode} config={config} />
    <ConsolePanel entries={editor.debug.entries} onClear={editor.debug.clear}
      pending={editor.debug.pending} stale={editor.debug.stale} />
    {props.sourceRequest && <DraftSourceModal editor={editor} request={props.sourceRequest}
      onClose={props.onSourceClosed} />}
  </article>;
}

function useDocumentSession(props: Props, editor: ReturnType<typeof usePipelineEditor>) {
  const path = props.document.pipelinePath;
  const name = props.document.name;
  const reportStatus = props.onDraftStatus;
  const registerSave = props.onSaveReady;
  const canSave = editorCanSave(editor);
  useEffect(() => {
    reportStatus(path, {
    path, name, dirty: editor.draft.dirty,
    canSave, saving: editor.persistence.saving,
    });
  }, [canSave, editor.draft.dirty, editor.persistence.saving, name, path, reportStatus]);
  useEffect(() => {
    registerSave(path, editor.persistence.save);
    return () => registerSave(path, undefined);
  }, [editor.persistence.save, path, registerSave]);
  useEffect(() => () => reportStatus(path, undefined), [path, reportStatus]);
}

function editorCanSave(editor: ReturnType<typeof usePipelineEditor>) {
  return draftCanSave({
    dirty: editor.draft.dirty, saving: editor.persistence.saving,
    debugPending: editor.debug.pending, debugStale: editor.debug.stale,
    debugError: editor.debug.error, diagnosticCount: editor.debug.diagnostics.length,
  });
}

function usePipelineEditor(document: PipelineDocument, onSaved: Props["onSaved"]) {
  const selection = useGraphSelection();
  const draft = usePipelineDraft(document.pipelineSource, document.metadataSource, document.layoutSource);
  const sources = { pipelineSource: draft.pipelineSource, metadataSource: draft.metadataSource,
    layoutSource: draft.layoutSource };
  const debug = usePipelineDebug(document, sources);
  const persistence = useDraftPersistence(document, draft, onSaved);
  const graph = resolveDraftGraph(debug.graph, draft.pipelineSource, draft.metadataSource);
  const routes = routeOperations(draft, selection, graph);
  return { draft, debug, persistence, selection, routes, graph };
}

function useEditorCommands(props: Props, editor: ReturnType<typeof usePipelineEditor>) {
  const active = props.active;
  const request = props.addNodeRequest;
  const consumedToken = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!active) return;
    const debug = () => void editor.debug.run();
    window.addEventListener(DEBUG_EVENT, debug);
    return () => window.removeEventListener(DEBUG_EVENT, debug);
  }, [active, editor.debug]);
  useEffect(() => {
    if (!request || consumedToken.current === request.token) return;
    consumedToken.current = request.token;
    addRequestedNode(active, request, editor);
  }, [active, editor, request]);
  useEffect(() => installKeyboardCommands(active, editor), [active, editor]);
}

function installKeyboardCommands(active: boolean, editor: ReturnType<typeof usePipelineEditor>) {
  if (!active) return;
  const handler = (event: KeyboardEvent) => handleKey(event, editor);
  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}

function handleKey(event: KeyboardEvent, editor: ReturnType<typeof usePipelineEditor>) {
  if (isTextInput(event.target)) return;
  if ((event.key === "Delete" || event.key === "Backspace") && hasSelection(editor.selection)) {
    event.preventDefault(); removeSelection(editor); return;
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
    event.preventDefault();
    if (event.shiftKey) editor.draft.redo(); else editor.draft.undo();
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
    event.preventDefault(); editor.draft.redo();
  }
}

function removeSelection(editor: ReturnType<typeof usePipelineEditor>) {
  const positions = currentPositions(editor);
  if (editor.selection.nodeIds.length) editor.draft.removeNodes(editor.selection.nodeIds);
  else editor.draft.removeRoutes(editor.selection.edges, positions);
  editor.selection.clear();
}

function addRequestedNode(active: boolean, request: Props["addNodeRequest"],
  editor: ReturnType<typeof usePipelineEditor>) {
  if (!active || !request) return;
  insertNode(editor, request.template);
}

function insertNode(editor: ReturnType<typeof usePipelineEditor>, template: NodeTemplate,
  position?: NodePosition) {
  const definitionId = resolveNodeDefinitionId(
    editor.draft.metadataSource, template.nodeId, template.definition,
  );
  const instanceId = createInstanceId(definitionId);
  const label = createNodeName(editor.draft.pipelineSource, template.nodeId);
  editor.draft.addInstance({ instanceId, nodeId: definitionId, label },
    template.kind, template.definition, position);
  editor.selection.selectNode(instanceId);
}

function routeOperations(
  draft: ReturnType<typeof usePipelineDraft>, selection: ReturnType<typeof useGraphSelection>,
  graph?: NormalizedGraph,
) {
  const positions = () => graph ? resolveNodePositions(graph, draft.layoutSource) : undefined;
  const add = (edge: GraphEdge) => { draft.addRoute(edge, positions()); selection.selectEdge(edge); };
  const remove = (edge: GraphEdge) => { draft.removeRoute(edge, positions()); selection.clearEdge(); };
  const replace = (edge: GraphEdge, next: GraphEdge) => {
    if (graph && !canReplaceRoute(graph, edge, next)) return;
    draft.replaceRoute(edge, next, positions()); selection.selectEdge(next);
  };
  const connect = (edge: GraphEdge) => {
    const existing = edge.kind === "Error" && graph ? errorRoute(graph, edge.from) : undefined;
    if (existing) replace(existing, edge); else add(edge);
  };
  return { add, remove, replace, connect };
}

function currentPositions(editor: ReturnType<typeof usePipelineEditor>) {
  return editor.graph ? resolveNodePositions(editor.graph, editor.draft.layoutSource) : undefined;
}

function DocumentToolbar(props: {
  editor: ReturnType<typeof usePipelineEditor>; document: PipelineDocument;
}) {
  const { draft, debug, persistence } = props.editor;
  const blocked = !editorCanSave(props.editor);
  return <header className="document-toolbar"><div><strong>{props.document.name}</strong>
    <span>{draft.dirty ? "Unsaved" : "Saved"}{debug.stale ? " · Debug required" : ""}</span></div>
    <div className="document-actions"><button disabled={!draft.canUndo} onClick={draft.undo}
      title="Undo" type="button">↶</button><button disabled={!draft.canRedo} onClick={draft.redo}
      title="Redo" type="button">↷</button><button disabled={!draft.dirty} onClick={draft.reset}
      type="button">Revert</button><button className="primary" disabled={blocked}
      onClick={() => void persistence.save()} type="button">{persistence.saving ? "Saving…" : "Save"}</button></div>
  </header>;
}

function GraphWorkspace(props: {
  editor: ReturnType<typeof usePipelineEditor>; graph?: NormalizedGraph;
  nodeDrag?: NodeTemplateDrag;
  selectedNode?: NonNullable<NormalizedGraph["nodes"]>[number]; config?: Record<string, unknown>;
}) {
  const { draft, selection, routes } = props.editor;
  return <div className="document-body"><GraphCanvas graph={props.graph}
    layoutSource={draft.layoutSource} nodeDrag={props.nodeDrag}
    onBackground={selection.clear}
    onConnectEdge={routes.connect} onMoveNodes={draft.moveNodes}
    onDropNode={(template, position) => insertNode(props.editor, template, position)}
    onReplaceEdge={routes.replace}
    onSelectEdge={selection.selectEdge} onSelectNode={selection.selectNode}
    onSelectNodes={selection.selectNodes} selectedEdges={selection.edges}
    selectedNodeIds={selection.nodeIds} />
    {props.graph && props.selectedNode && props.config && <NodeInspector config={props.config}
      graph={props.graph} onChange={(field, value) => draft.update(props.selectedNode!, field, value)}
      onChangePath={(path, value) => draft.updateBehavior(props.selectedNode!, path, value)}
      onClose={selection.clear} onRouteAdd={routes.add} onRouteRemove={routes.remove}
      onRouteReplace={routes.replace} selectedEdge={selection.edge} selectedNode={props.selectedNode} />}
  </div>;
}

function DraftSourceModal(props: {
  editor: ReturnType<typeof usePipelineEditor>; request: SourceRequest; onClose: () => void;
}) {
  const source = props.request.kind === "pipeline" ? props.editor.draft.pipelineSource
    : props.editor.draft.metadataSource;
  const path = props.request.kind === "pipeline" ? props.request.pipelinePath
    : props.request.pipelinePath.replace(/\.pipeline\.json$/i, ".meta.json");
  return <SourceModal onApply={(value) => props.editor.draft.replaceSource(props.request.kind, value)}
    onClose={props.onClose} path={path} source={source}
    title={props.request.kind === "pipeline" ? "Pipeline JSON" : "Meta JSON"} />;
}

function isTextInput(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
    || target instanceof HTMLSelectElement;
}
function hasSelection(selection: ReturnType<typeof useGraphSelection>): boolean {
  return selection.nodeIds.length > 0 || selection.edges.length > 0;
}
