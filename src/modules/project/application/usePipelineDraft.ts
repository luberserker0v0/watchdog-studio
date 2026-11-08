import { useReducer, useState } from "react";
import type { GraphEdge, GraphNode } from "../contracts/PipelineDocument";
import {
  updateBehaviorSources, updateInstanceField, type EditableNodeField,
  type EditableNodePath, type EditableNodeValue, type PipelineDraftSources,
  ensureNodeDefinition,
} from "../domain/metadataDraft";
import {
  addPipelineEdge, addPipelineInstance, removePipelineEdge, removePipelineNodes,
  removePipelineEdges, replacePipelineEdge, type NewPipelineInstance,
} from "../domain/pipelineDraft";
import {
  removeLayoutNodes, updateNodePositions, type NodePosition, type NodePositions,
} from "../domain/layoutDraft";

interface History {
  baseline: PipelineDraftSources;
  past: PipelineDraftSources[];
  present: PipelineDraftSources;
  future: PipelineDraftSources[];
}

type HistoryAction =
  | { type: "apply"; sources: PipelineDraftSources }
  | { type: "undo" } | { type: "redo" } | { type: "reset" }
  | { type: "saved"; sources: PipelineDraftSources };

export function usePipelineDraft(pipeline: string, metadata: string, layout?: string) {
  const initial = { pipeline, metadata, layout };
  const [history, dispatch] = useReducer(historyReducer, initial, createHistory);
  const [error, setError] = useState<string>();
  const context = { sources: history.present, dispatch, setError };
  return {
    pipelineSource: history.present.pipeline, metadataSource: history.present.metadata,
    layoutSource: history.present.layout, error,
    dirty: !sameSources(history.present, history.baseline),
    canUndo: history.past.length > 0, canRedo: history.future.length > 0,
    ...draftOperations(context),
    undo: () => dispatch({ type: "undo" }), redo: () => dispatch({ type: "redo" }),
    reset: () => { dispatch({ type: "reset" }); setError(undefined); },
    acceptSaved: (document: SavedSources) => dispatch({ type: "saved", sources: savedSources(document) }),
  };
}

function draftOperations(context: DraftContext) {
  return {
    update: (node: GraphNode, field: EditableNodeField, value: EditableNodeValue) =>
      apply(context, () => updateInstanceField(context.sources, node, field, value)),
    updateBehavior: (node: GraphNode, path: EditableNodePath, value: unknown) =>
      apply(context, () => updateBehaviorSources(context.sources, node, path, value)),
    ...routeOperations(context), ...structureOperations(context),
    replaceSource: (kind: SourceKind, source: string) =>
      apply(context, () => ({ ...context.sources, [kind]: source })),
  };
}

function routeOperations(context: DraftContext) {
  const pipeline = (operation: () => string, positions?: NodePositions) => apply(context, () =>
    routeDraftSources(context.sources, operation(), positions));
  return {
    addRoute: (edge: GraphEdge, positions?: NodePositions) =>
      pipeline(() => addPipelineEdge(context.sources.pipeline, edge), positions),
    removeRoute: (edge: GraphEdge, positions?: NodePositions) =>
      pipeline(() => removePipelineEdge(context.sources.pipeline, edge), positions),
    removeRoutes: (edges: GraphEdge[], positions?: NodePositions) =>
      pipeline(() => removePipelineEdges(context.sources.pipeline, edges), positions),
    replaceRoute: (edge: GraphEdge, next: GraphEdge, positions?: NodePositions) =>
      pipeline(() => replacePipelineEdge(context.sources.pipeline, edge, next), positions),
  };
}

export function routeDraftSources(
  sources: PipelineDraftSources, pipeline: string, positions?: NodePositions,
): PipelineDraftSources {
  return {
    ...sources, pipeline,
    layout: positions ? updateNodePositions(sources.layout, positions) : sources.layout,
  };
}

function structureOperations(context: DraftContext) {
  return {
    addInstance: (instance: NewPipelineInstance, kind: "Entry" | "Endpoint" | "Normal" = "Normal",
      definition?: Record<string, unknown>, position?: NodePosition) =>
      apply(context, () => ({
        ...context.sources,
        pipeline: addPipelineInstance(context.sources.pipeline, instance),
        metadata: ensureNodeDefinition(context.sources.metadata, instance.nodeId, kind, definition),
        layout: position ? updateNodePositions(context.sources.layout,
          { [instance.instanceId]: position }) : context.sources.layout,
      })),
    removeNodes: (ids: string[]) => apply(context, () => removeNodes(context.sources, ids)),
    moveNodes: (positions: NodePositions) => apply(context, () => ({
      ...context.sources, layout: updateNodePositions(context.sources.layout, positions),
    })),
  };
}

function removeNodes(sources: PipelineDraftSources, ids: string[]): PipelineDraftSources {
  return {
    ...sources, pipeline: removePipelineNodes(sources.pipeline, ids),
    layout: removeLayoutNodes(sources.layout, ids),
  };
}

function historyReducer(state: History, action: HistoryAction): History {
  if (action.type === "undo" && state.past.length) return undoState(state);
  if (action.type === "redo" && state.future.length) return redoState(state);
  if (action.type === "reset") return { ...state, past: [], present: state.baseline, future: [] };
  if (action.type === "saved") return createHistory(action.sources);
  if (action.type === "apply" && !sameSources(state.present, action.sources)) {
    return { ...state, past: [...state.past, state.present], present: action.sources, future: [] };
  }
  return state;
}

function undoState(state: History): History {
  const present = state.past[state.past.length - 1] ?? state.present;
  return { ...state, past: state.past.slice(0, -1), present, future: [state.present, ...state.future] };
}

function redoState(state: History): History {
  const [present, ...future] = state.future;
  return { ...state, past: [...state.past, state.present], present, future };
}

function apply(context: DraftContext, operation: () => PipelineDraftSources) {
  try { context.dispatch({ type: "apply", sources: operation() }); context.setError(undefined); }
  catch (reason) { context.setError(String(reason)); }
}

function createHistory(sources: PipelineDraftSources): History {
  return { baseline: sources, past: [], present: sources, future: [] };
}

function sameSources(left: PipelineDraftSources, right: PipelineDraftSources): boolean {
  return left.pipeline === right.pipeline && left.metadata === right.metadata && left.layout === right.layout;
}

function savedSources(document: SavedSources): PipelineDraftSources {
  return { pipeline: document.pipelineSource, metadata: document.metadataSource, layout: document.layoutSource };
}

type SourceKind = keyof PipelineDraftSources;
interface SavedSources { pipelineSource: string; metadataSource: string; layoutSource?: string }
interface DraftContext {
  sources: PipelineDraftSources;
  dispatch: React.Dispatch<HistoryAction>;
  setError: React.Dispatch<React.SetStateAction<string | undefined>>;
}
