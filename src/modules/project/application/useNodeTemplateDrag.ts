import { useEffect, useState } from "react";
import type { NodeTemplate } from "../contracts/NodeTemplate";
import type { NodePosition } from "../domain/layoutDraft";

export interface NodeTemplateDrag {
  template: NodeTemplate;
  origin: NodePosition;
  client: NodePosition;
  moved: boolean;
}

export function useNodeTemplateDrag() {
  const [drag, setDrag] = useState<NodeTemplateDrag>();
  useEffect(() => installPointerTracking(setDrag), []);
  const begin = (template: NodeTemplate, client: NodePosition) => {
    setDrag({ template, origin: client, client, moved: false });
  };
  return { drag, begin };
}

export function advanceNodeTemplateDrag(
  drag: NodeTemplateDrag, client: NodePosition,
): NodeTemplateDrag {
  const distance = Math.hypot(client.x - drag.origin.x, client.y - drag.origin.y);
  return { ...drag, client, moved: drag.moved || distance >= 4 };
}

export function clearNodeTemplateSelection(
  selection: Pick<Selection, "removeAllRanges"> | null = window.getSelection(),
): void {
  selection?.removeAllRanges();
}

function installPointerTracking(update: React.Dispatch<React.SetStateAction<NodeTemplateDrag | undefined>>) {
  const move = (event: PointerEvent) => update((drag) => drag
    ? advanceNodeTemplateDrag(drag, { x: event.clientX, y: event.clientY }) : drag);
  const finish = () => update(undefined);
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", finish);
  window.addEventListener("pointercancel", finish);
  return () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", finish);
    window.removeEventListener("pointercancel", finish);
  };
}
