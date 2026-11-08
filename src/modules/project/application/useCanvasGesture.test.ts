import { expect, it, vi } from "vitest";
import { advanceCanvasGesture, type CanvasGesture } from "./useCanvasGesture";

it("advances a gesture from captured pointer values without retaining an event", () => {
  const gesture: CanvasGesture = {
    type: "route", sourceId: "A", kind: "Next", point: { x: 1, y: 2 },
  };
  const moved = advanceCanvasGesture(gesture, {
    canvas: { x: 80, y: 90 }, client: { x: 800, y: 900 },
  }, vi.fn());

  expect(moved).toMatchObject({ type: "route", point: { x: 80, y: 90 } });
});

it("pans using captured client coordinates", () => {
  const pan = vi.fn();
  const gesture: CanvasGesture = { type: "pan", client: { x: 20, y: 30 } };
  const moved = advanceCanvasGesture(gesture, {
    canvas: { x: 0, y: 0 }, client: { x: 25, y: 21 },
  }, pan);

  expect(pan).toHaveBeenCalledWith({ x: 5, y: -9 });
  expect(moved).toEqual({ type: "pan", client: { x: 25, y: 21 } });
});

it("moves an existing edge handle from captured canvas coordinates", () => {
  const edge = { from: "A", to: "B", kind: "Next" as const };
  const gesture: CanvasGesture = {
    type: "edge-adjust", edge, endpoint: "target", point: { x: 1, y: 2 },
  };
  const moved = advanceCanvasGesture(gesture, {
    canvas: { x: 420, y: 260 }, client: { x: 0, y: 0 },
  }, vi.fn());

  expect(moved).toEqual({ ...gesture, point: { x: 420, y: 260 } });
});
