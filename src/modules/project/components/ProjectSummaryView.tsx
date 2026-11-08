import type { ProjectSummary } from "../contracts/ProjectSummary";

export default function ProjectSummaryView({ summary }: { summary: ProjectSummary }) {
  return (
    <section className="project-summary">
      <div className="project-title-row">
        <div><span>OPEN PROJECT</span><h2>{summary.displayName}</h2></div>
        <strong>{summary.pipelines.length} pipeline(s)</strong>
      </div>
      <code className="project-root">{summary.rootPath}</code>
      {summary.manifest && (
        <p className="manifest-summary">
          {summary.manifest.id} · v{summary.manifest.version}
          {summary.manifest.hasAgent ? " · Agent declared" : ""}
        </p>
      )}
      {summary.warnings.map((warning) => <p className="project-warning" key={warning}>{warning}</p>)}
    </section>
  );
}
