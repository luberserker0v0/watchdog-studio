export interface WorkspaceDocument { pipelinePath: string }

export interface ClosedWorkspace<T extends WorkspaceDocument> {
  documents: T[];
  openPaths: string[];
  activePath?: string;
}

export function closeWorkspaceTab<T extends WorkspaceDocument>(
  documents: T[], openPaths: string[], activePath: string | undefined, closedPath: string,
): ClosedWorkspace<T> {
  const remaining = openPaths.filter((path) => path !== closedPath);
  return {
    documents: documents.filter((document) => document.pipelinePath !== closedPath),
    openPaths: remaining,
    activePath: activePath === closedPath ? remaining[remaining.length - 1] : activePath,
  };
}
