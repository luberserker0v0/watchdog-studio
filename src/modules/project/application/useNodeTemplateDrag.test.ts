import { expect, it, vi } from "vitest";
import {
  advanceNodeTemplateDrag, clearNodeTemplateSelection, type NodeTemplateDrag,
} from "./useNodeTemplateDrag";

it("starts moving a node template only after the pointer crosses the drag threshold", () => {
  const drag: NodeTemplateDrag = {
    template: { nodeId: "Click", kind: "Normal", definition: {} },
    origin: { x: 10, y: 10 }, client: { x: 10, y: 10 }, moved: false,
  };

  expect(advanceNodeTemplateDrag(drag, { x: 12, y: 12 }).moved).toBe(false);
  expect(advanceNodeTemplateDrag(drag, { x: 14, y: 10 }).moved).toBe(true);
});

it("clears native WebView selection before starting a node drag", () => {
  const removeAllRanges = vi.fn();

  clearNodeTemplateSelection({ removeAllRanges });

  expect(removeAllRanges).toHaveBeenCalledOnce();
});
