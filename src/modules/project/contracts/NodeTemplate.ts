export interface NodeTemplate {
  nodeId: string;
  kind: "Entry" | "Endpoint" | "Normal";
  definition: Record<string, unknown>;
}
