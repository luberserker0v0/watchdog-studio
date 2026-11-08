import type { EditableNodePath } from "../domain/metadataDraft";

interface Props {
  keys: unknown;
  path: EditableNodePath;
  onChange: (path: EditableNodePath, value: unknown) => void;
}

interface RowProps {
  index: number;
  path: EditableNodePath;
  value: unknown;
  values: unknown[];
  onChange: Props["onChange"];
}

export default function KeySequenceField({ keys, path, onChange }: Props) {
  const values = Array.isArray(keys) ? keys : [0];
  return <fieldset className="key-sequence"><legend>Key sequence</legend>
    {values.map((value, index) => <KeyRow key={index} index={index} path={path}
      values={values} value={value} onChange={onChange} />)}
    <button type="button" onClick={() => onChange(path, [...values, 0])}>Add key</button>
  </fieldset>;
}

function KeyRow(props: RowProps) {
  const { index, path, values, onChange } = props;
  return <div className="key-row"><input aria-label={`Key ${index + 1}`} value={text(props.value)}
    onChange={(event) => onChange([...path, index], keyValue(event.target.value))} />
    <button disabled={index === 0} type="button" onClick={() => move(props, -1)}>↑</button>
    <button disabled={index === values.length - 1} type="button" onClick={() => move(props, 1)}>↓</button>
    <button type="button" onClick={() => onChange(path, removeAt(values, index))}>Remove</button>
  </div>;
}

function move(props: RowProps, offset: number) {
  const next = [...props.values];
  const destination = props.index + offset;
  [next[props.index], next[destination]] = [next[destination], next[props.index]];
  props.onChange(props.path, next);
}

function removeAt(values: unknown[], index: number): unknown[] {
  return values.filter((_, candidate) => candidate !== index);
}

function keyValue(value: string): number | string {
  return /^\d+$/.test(value) ? Number(value) : value;
}

function text(value: unknown): string {
  return typeof value === "number" || typeof value === "string" ? String(value) : "";
}
