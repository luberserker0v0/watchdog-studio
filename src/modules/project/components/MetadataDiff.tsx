import { diffLines, type Change } from "diff";

interface Props {
  before: string;
  after: string;
  error?: string;
  onReset: () => void;
  title?: string;
}

export default function MetadataDiff({ before, after, error, onReset, title = "Metadata source diff" }: Props) {
  if (before === after && !error) return null;
  return (
    <section className="metadata-diff">
      <header><div><span>UNSAVED SESSION DRAFT</span><h3>{title}</h3></div>
        <button onClick={onReset} type="button">Reset draft</button>
      </header>
      {error && <p className="project-error">{error}</p>}
      <div className="diff-lines">{diffLines(before, after).map((change, index) => (
        <DiffChunk change={change} index={index} key={index} />
      ))}</div>
    </section>
  );
}

function DiffChunk({ change, index }: { change: Change; index: number }) {
  const marker = change.added ? "+" : change.removed ? "−" : " ";
  const kind = change.added ? "added" : change.removed ? "removed" : "context";
  return <pre className={kind} data-index={index}>{prefixLines(visibleValue(change), marker)}</pre>;
}

function visibleValue(change: Change): string {
  const lines = change.value.split("\n");
  if (change.added || change.removed || lines.length <= 8) return change.value;
  return [...lines.slice(0, 3), "… unchanged lines …", ...lines.slice(-3)].join("\n");
}

function prefixLines(value: string, marker: string): string {
  return value.split("\n").map((line) => `${marker} ${line}`).join("\n");
}
