import { useProjectWorkspace } from "../application/useProjectWorkspace";
import { useProjectTransitions } from "../application/useProjectTransitions";
import ProjectEditor from "./ProjectEditor";
import ProjectLauncher from "./ProjectLauncher";
import ProjectTransitionDialog from "./ProjectTransitionDialog";
import "../styles/project.css";

export default function ProjectWorkspace() {
  const workspace = useProjectWorkspace();
  const transitions = useProjectTransitions({
    hasProject: Boolean(workspace.summary), openProject: workspace.openProject,
    closeProject: workspace.closeProject,
  });
  return <>{workspace.summary
    ? <ProjectEditor {...workspace} {...transitions} summary={workspace.summary} />
    : <ProjectLauncher busy={workspace.busy} error={workspace.error}
      onOpen={() => void workspace.openProject()} />}
    <ProjectTransitionDialog {...transitions} onCancel={transitions.cancel}
      onDiscard={transitions.discard} onSaveAll={transitions.saveAll} />
  </>;
}
