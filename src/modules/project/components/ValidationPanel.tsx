import type { SourceDiagnostic } from "../contracts/PipelineDocument";

interface Props {
  diagnostics: SourceDiagnostic[];
  draft?: boolean;
  error?: string;
  pending?: boolean;
}

export default function ValidationPanel({ diagnostics, draft, error, pending }: Props) {
  if (pending) return <p className="validation-pending">Validating session draft…</p>;
  if (error) return <p className="validation-errors">Draft validation failed: {error}</p>;
  if (!diagnostics.length) {
    return <p className="validation-ok">{draft
      ? "Session draft matches the pinned schemas and graph."
      : "Metadata and layout match the pinned schemas and graph."}</p>;
  }
  return (
    <section className="validation-errors">
      <strong>{diagnostics.length} schema or graph issue(s)</strong>
      <ul>{diagnostics.map((item, index) => (
        <li key={`${item.file}-${item.path}-${index}`}>
          <code>{item.file} {item.path}</code><span>{item.message}</span>
        </li>
      ))}</ul>
    </section>
  );
}
