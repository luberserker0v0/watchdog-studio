import { useState, type FormEvent } from "react";
import type { InitializeProjectRequest } from "../contracts/ProjectSummary";
import {
  initialProjectRequest, projectInitializationError,
} from "../domain/projectInitialization";

interface Props {
  defaultName: string;
  busy: boolean;
  error?: string;
  onInitialize: (request: InitializeProjectRequest) => Promise<void>;
}

export default function EmptyProjectSetup(props: Props) {
  const [request, setRequest] = useState(() => initialProjectRequest(props.defaultName));
  const validation = projectInitializationError(request);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!validation) void props.onInitialize(request);
  };
  return <section className="empty-project-setup">
    <span>Empty project</span><h2>Initialize this WatchDog project</h2>
    <p>Confirm the project identity and create the first Entry → Endpoint pipeline.</p>
    <form onSubmit={submit}>
      <SetupField label="Project name" field="projectName" request={request} update={setRequest} />
      <SetupField label="Project ID" field="projectId" request={request} update={setRequest} />
      <SetupField label="Version" field="version" request={request} update={setRequest} />
      <SetupField label="First pipeline" field="pipelineName" request={request} update={setRequest} />
      {validation && <p className="project-error">{validation}</p>}
      {props.error && <p className="project-error" role="alert">{props.error}</p>}
      <small>No files are written until you confirm.</small>
      <button className="primary" disabled={props.busy || Boolean(validation)} type="submit">
        {props.busy ? "Initializing…" : "Initialize project"}</button>
    </form>
  </section>;
}

function SetupField(props: {
  label: string; field: keyof InitializeProjectRequest; request: InitializeProjectRequest;
  update: React.Dispatch<React.SetStateAction<InitializeProjectRequest>>;
}) {
  return <label><span>{props.label}</span><input value={props.request[props.field]}
    onChange={(event) => props.update((current) => ({
      ...current, [props.field]: event.target.value,
    }))} /></label>;
}
