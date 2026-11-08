import { applyEdits, modify, type FormattingOptions } from "jsonc-parser";
import type { GraphNode } from "../contracts/PipelineDocument";

export type EditableNodeField =
  | "label" | "kind" | "desc" | "enabled" | "inverse" | "timeout"
  | "error_timeout" | "rate_limit" | "pre_delay" | "pre_wait_freezes"
  | "post_delay" | "post_wait_freezes" | "max_hit" | "repeat" | "repeat_delay";

export type EditableNodeValue = string | number | boolean | Record<string, unknown> | undefined;
export type EditableNodePath = readonly (string | number)[];

export interface BehaviorDraftSources {
  metadata: string;
  pipeline: string;
}

export interface PipelineDraftSources extends BehaviorDraftSources {
  layout?: string;
}

export function updateInstanceField<T extends BehaviorDraftSources>(
  sources: T,
  node: GraphNode,
  field: EditableNodeField,
  value: EditableNodeValue,
): T {
  return {
    ...sources,
    pipeline: modifySource(sources.pipeline, ["instances", node.id, field], value),
  };
}

export function updateBehaviorSources<T extends BehaviorDraftSources>(
  sources: T,
  node: GraphNode,
  path: EditableNodePath,
  value: unknown,
): T {
  const instances = parseMetadata(sources.pipeline);
  const instance = objectValue(objectValue(instances.instances)?.[node.id]);
  const templateName = typeof instance?.node === "string" ? instance.node : node.metadataKey;
  const metadata = parseMetadata(sources.metadata);
  const owned = ownedTemplateName(templateName, node.id);
  const target = owned ?? uniqueTemplateName(metadata, templateName, node.id);
  const nextMetadata = owned ? sources.metadata
    : forkTemplate(sources.metadata, metadata, templateName, target);
  return {
    ...sources,
    metadata: modifySource(nextMetadata, ["nodes", target, ...path], value),
    pipeline: owned ? sources.pipeline
      : modifySource(sources.pipeline, ["instances", node.id, "node"], target),
  };
}

export function resolvePipelineDraftConfig(
  sources: BehaviorDraftSources,
  node: GraphNode,
): Record<string, unknown> {
  try {
    const metadata = parseMetadata(sources.metadata);
    const instances = parseMetadata(sources.pipeline);
    const instance = objectValue(objectValue(instances.instances)?.[node.id]) ?? {};
    const templateName = typeof instance.node === "string" ? instance.node : node.metadataKey;
    const template = objectValue(objectValue(metadata.nodes)?.[templateName ?? ""]) ?? {};
    return { ...template, ...editableOverrides(instance) };
  } catch {
    return node.effectiveConfig;
  }
}

export function ensureNodeDefinition(
  source: string, nodeId: string, kind: "Entry" | "Endpoint" | "Normal" = "Normal",
  definition?: Record<string, unknown>,
): string {
  const metadata = parseMetadata(source);
  const nodes = objectValue(metadata.nodes) ?? {};
  if (nodeId in nodes) return source;
  const fallback = kind === "Normal" ? {} : { kind };
  return modifySource(source, ["nodes", nodeId], definition ?? fallback);
}

export function resolveNodeDefinitionId(
  source: string, nodeId: string, definition: Record<string, unknown>,
): string {
  const metadata = parseMetadata(source);
  const nodes = objectValue(metadata.nodes) ?? {};
  if (!(nodeId in nodes) || sameJson(nodes[nodeId], definition)) return nodeId;
  let index = 2;
  while (`${nodeId}_${index}` in nodes) {
    if (sameJson(nodes[`${nodeId}_${index}`], definition)) return `${nodeId}_${index}`;
    index += 1;
  }
  return `${nodeId}_${index}`;
}

function forkTemplate(
  source: string,
  metadata: Record<string, unknown>,
  templateName: string | undefined,
  targetName: string,
): string {
  const template = objectValue(objectValue(metadata.nodes)?.[templateName ?? ""]) ?? {};
  return modifySource(source, ["nodes", targetName], template);
}

function uniqueTemplateName(
  metadata: Record<string, unknown>,
  templateName: string | undefined,
  nodeId: string,
): string {
  const nodes = objectValue(metadata.nodes) ?? {};
  const base = `${templateName ?? "Node"}__${safeName(nodeId)}`;
  if (!(base in nodes)) return base;
  let index = 2;
  while (`${base}__${index}` in nodes) index += 1;
  return `${base}__${index}`;
}

function ownedTemplateName(templateName: string | undefined, nodeId: string): string | undefined {
  const marker = `__${safeName(nodeId)}`;
  const ownedPattern = new RegExp(`${marker}(?:__\\d+)?$`);
  return templateName && ownedPattern.test(templateName) ? templateName : undefined;
}

function safeName(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]/g, "_");
}

function editableOverrides(instance: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(instance).filter(([key]) => !["node", "params", "param_values"].includes(key)),
  );
}

function parseMetadata(source: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(source);
  const metadata = objectValue(parsed);
  if (!metadata) throw new Error("Metadata root must be a JSON object");
  return metadata;
}

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function formatting(source: string): FormattingOptions {
  return {
    eol: source.includes("\r\n") ? "\r\n" : "\n",
    insertSpaces: !/^\t+/m.test(source),
    tabSize: detectIndent(source),
  };
}

function modifySource(source: string, path: (string | number)[], value: unknown): string {
  const edits = modify(source, path, value, { formattingOptions: formatting(source) });
  return applyEdits(source, edits);
}

function detectIndent(source: string): number {
  const match = source.match(/^( +)\S/m);
  return match?.[1]?.length ?? 2;
}
