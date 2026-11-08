interface ProjectLauncherProps {
  busy: boolean;
  error?: string;
  onOpen: () => void;
}

export default function ProjectLauncher({ busy, error, onOpen }: ProjectLauncherProps) {
  return (
    <section className="project-launcher">
      <span className="welcome-badge">Authoring workspace</span>
      <h2>Open a WatchDog project.</h2>
      <p>Select a project root containing complete WatchDog pipeline source sets.</p>
      <button type="button" onClick={onOpen} disabled={busy}>
        {busy ? "Opening…" : "Open project folder"}
      </button>
      {error && <p className="project-error" role="alert">{error}</p>}
    </section>
  );
}
