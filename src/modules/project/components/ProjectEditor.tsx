import { useEffect, useState } from "react";
import { useNodeTemplateDrag, type NodeTemplateDrag } from "../application/useNodeTemplateDrag";
import type { PipelineDocument } from "../contracts/PipelineDocument";
import type {
  InitializeProjectRequest, PipelineSummary, ProjectSummary,
} from "../contracts/ProjectSummary";
import type { NodeTemplate } from "../contracts/NodeTemplate";
import type {
  PipelineDraftStatus, SavePipelineSession,
} from "../contracts/ProjectDocumentSession";
import NodeLibrary from "./NodeLibrary";
import EmptyProjectSetup from "./EmptyProjectSetup";
import PipelineDocumentView, { type SourceRequest } from "./PipelineDocumentView";
import PipelineList from "./PipelineList";
import ProjectSummaryView from "./ProjectSummaryView";
import WorkspaceTabs from "./WorkspaceTabs";

interface Props {
  summary: ProjectSummary;
  documents: PipelineDocument[];
  openPaths: string[];
  activePath?: string;
  error?: string;
  busy: boolean;
  openPipeline: (pipeline: PipelineSummary) => Promise<void>;
  loadDocument: (pipeline: PipelineSummary) => Promise<PipelineDocument | undefined>;
  setActivePath: (path: string) => void;
  closePipeline: (path: string) => void;
  documentSaved: (document: PipelineDocument) => void;
  initializeProject: (request: InitializeProjectRequest) => Promise<void>;
  reportStatus: (path: string, status?: PipelineDraftStatus) => void;
  registerSave: (path: string, save?: SavePipelineSession) => void;
}

export default function ProjectEditor(props: Props) {
  const state = useProjectEditorState(props);
  useOutsideDismiss(state.leftOpen, () => state.setLeftOpen(false));
  const openDocuments = props.documents.filter((item) => props.openPaths.includes(item.pipelinePath));
  return <section className="project-editor">
    <WorkspaceTabs activePath={props.activePath} documents={openDocuments}
      onActivate={props.setActivePath} onClose={props.closePipeline} />
    <button aria-label="Toggle project panel" className="left-panel-toggle"
      data-project-panel-toggle="true"
      onClick={() => state.setLeftOpen((value) => !value)} type="button">☰</button>
    {state.leftOpen && <ProjectPanel {...props} activeTab={state.leftTab}
      onTab={state.selectTab} onAddNode={state.addNode}
      onBeginNodeDrag={state.nodeDrag.begin}
      selectedNodeKey={state.selectedNodeKey} selectedPipelinePath={state.selectedPipelinePath}
      onSelectNode={state.setSelectedNodeKey} onSelectPipeline={state.setSelectedPipelinePath}
      onEditMetadata={(pipeline) => void state.openSource(pipeline, "metadata")}
      onEditPipeline={(pipeline) => void state.openSource(pipeline, "pipeline")} />}
    <DocumentLayers {...props} addNode={state.addRequest} nodeDrag={state.nodeDrag.drag} source={state.source}
      closeSource={() => state.setSource(undefined)} />
    <NodePointerGhost drag={state.nodeDrag.drag} />
  </section>;
}

function useProjectEditorState(props: Props) {
  const [leftOpen, setLeftOpen] = useState(true);
  const [leftTab, setLeftTab] = useState<"pipelines" | "nodes">("pipelines");
  const [source, setSource] = useState<SourceRequest>();
  const [addNode, setAddNode] = useState<{ template: NodeTemplate; token: string }>();
  const [selectedPipelinePath, setSelectedPipelinePath] = useState(props.activePath);
  const [selectedNodeKey, setSelectedNodeKey] = useState<string>();
  const nodeDrag = useNodeTemplateDrag();
  const openSource = async (pipeline: PipelineSummary, kind: SourceRequest["kind"]) => {
    const document = await props.loadDocument(pipeline);
    if (document) setSource({ pipelinePath: document.pipelinePath, kind });
  };
  const add = (template: NodeTemplate) => {
    if (props.activePath) setAddNode({ template, token: crypto.randomUUID() });
  };
  const selectTab = (tab: "pipelines" | "nodes") => {
    setLeftTab(tab);
  };
  return { leftOpen, setLeftOpen, leftTab, setLeftTab, source, setSource,
    addRequest: addNode, addNode: add, nodeDrag, openSource, selectTab,
    selectedPipelinePath, setSelectedPipelinePath, selectedNodeKey, setSelectedNodeKey };
}

function useOutsideDismiss(open: boolean, dismiss: () => void) {
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-project-panel], [data-project-panel-toggle]")) return;
      dismiss();
    };
    document.addEventListener("pointerdown", outside, true);
    return () => document.removeEventListener("pointerdown", outside, true);
  }, [dismiss, open]);
}

function DocumentLayers(props: Props & {
  addNode?: { template: NodeTemplate; token: string }; nodeDrag?: NodeTemplateDrag;
  source?: SourceRequest; closeSource: () => void;
}) {
  return <main className="pipeline-workspace">
      {props.error && !props.summary.canInitialize
        && <p className="project-error workspace-error">{props.error}</p>}
      {props.documents.map((document) => <div className={documentLayerClass(document, props)}
        key={document.pipelinePath}>
        <PipelineDocumentView active={document.pipelinePath === props.activePath}
          addNodeRequest={document.pipelinePath === props.activePath ? props.addNode : undefined}
          nodeDrag={document.pipelinePath === props.activePath ? props.nodeDrag : undefined}
          document={document} onSaved={props.documentSaved}
          onDraftStatus={props.reportStatus} onSaveReady={props.registerSave}
          sourceRequest={props.source?.pipelinePath === document.pipelinePath ? props.source : undefined}
          onSourceClosed={props.closeSource} />
      </div>)}
      {!props.activePath && <EmptyWorkspace {...props} />}
    </main>;
}

function EmptyWorkspace(props: Parameters<typeof DocumentLayers>[0]) {
  if (props.summary.canInitialize) {
    return <EmptyProjectSetup busy={props.busy} defaultName={props.summary.displayName}
      error={props.error} onInitialize={props.initializeProject} />;
  }
  const message = props.summary.pipelines.length
    ? "Double-click a pipeline to open a graph tab."
    : "No complete pipeline source sets were found in this folder.";
  return <p className="empty-document">{message}</p>;
}

function documentLayerClass(document: PipelineDocument, props: Parameters<typeof DocumentLayers>[0]) {
  if (document.pipelinePath === props.activePath) return "document-layer active";
  if (document.pipelinePath === props.source?.pipelinePath) return "document-layer source-open";
  return "document-layer";
}

function ProjectPanel(props: Props & {
  activeTab: "pipelines" | "nodes";
  onTab: (tab: "pipelines" | "nodes") => void;
  onEditPipeline: (pipeline: PipelineSummary) => void;
  onEditMetadata: (pipeline: PipelineSummary) => void;
  onAddNode: (template: NodeTemplate) => void;
  onBeginNodeDrag: ReturnType<typeof useNodeTemplateDrag>["begin"];
  selectedPipelinePath?: string;
  selectedNodeKey?: string;
  onSelectPipeline: (path: string) => void;
  onSelectNode: (key: string) => void;
}) {
  return <aside className="project-sidebar overlay-panel" data-project-panel="true">
    <ProjectSummaryView summary={props.summary} />
    <div className="sidebar-tabs"><button className={props.activeTab === "pipelines" ? "active" : ""}
      onClick={() => props.onTab("pipelines")} type="button">Pipelines</button>
    <button className={props.activeTab === "nodes" ? "active" : ""}
      onClick={() => props.onTab("nodes")} type="button">Nodes</button></div>
    {props.activeTab === "pipelines" ? <PipelineList activePath={props.activePath}
      busy={props.busy} onEditSource={props.onEditPipeline}
      onSelect={props.onSelectPipeline} selectedPath={props.selectedPipelinePath}
      onOpen={(pipeline) => void props.openPipeline(pipeline)} pipelines={props.summary.pipelines} />
      : <NodeLibrary documents={props.documents} onAddNode={props.onAddNode}
        onBeginDrag={props.onBeginNodeDrag}
        canAdd={Boolean(props.activePath)} loadedPaths={props.openPaths}
        onEditMetadata={props.onEditMetadata}
        onSelect={props.onSelectNode} pipelines={props.summary.pipelines}
        selectedKey={props.selectedNodeKey} />}
  </aside>;
}

function NodePointerGhost({ drag }: { drag?: NodeTemplateDrag }) {
  if (!drag?.moved) return null;
  return <div className={`node-pointer-ghost ${drag.template.kind.toLowerCase()}`}
    style={{ left: drag.client.x, top: drag.client.y }}>
    <span>{drag.template.kind}</span><strong>{drag.template.nodeId}</strong>
  </div>;
}
