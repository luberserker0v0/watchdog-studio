import type { EditableNodePath } from "../domain/metadataDraft";
import JsonValueField from "./JsonValueField";

interface Props {
  recognition: Record<string, unknown>;
  onChange: (path: EditableNodePath, value: unknown) => void;
}

export default function CustomRecognitionFields({ recognition, onChange }: Props) {
  const param = object(recognition.param);
  const mode = typeof param?.custom_recognition === "string" ? "maa" : "legacy";
  const name = mode === "maa" ? param?.custom_recognition : recognition.recognition;
  const customParam = mode === "maa" ? param?.custom_recognition_param : recognition.param;
  return <div className="custom-recognition-fields">
    <label>Format<select value={mode} onChange={(event) => {
      onChange(["recognition"], customDefault(event.target.value));
    }}><option value="maa">Maa-compatible</option><option value="legacy">Legacy WatchDog</option>
    </select></label>
    <label>Registered recognizer<input value={text(name)} onChange={(event) => {
      onChange(namePath(mode), event.target.value);
    }} /></label>
    <JsonValueField label="Recognizer parameter" value={customParam}
      onChange={(value) => onChange(parameterPath(mode), value)} />
  </div>;
}

function customDefault(mode: string): Record<string, unknown> {
  if (mode === "legacy") return { type: "Custom", recognition: "", param: null };
  return { type: "Custom", param: { custom_recognition: "", custom_recognition_param: null } };
}

function namePath(mode: string): EditableNodePath {
  return mode === "maa"
    ? ["recognition", "param", "custom_recognition"] : ["recognition", "recognition"];
}

function parameterPath(mode: string): EditableNodePath {
  return mode === "maa"
    ? ["recognition", "param", "custom_recognition_param"] : ["recognition", "param"];
}

function object(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : undefined;
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}
