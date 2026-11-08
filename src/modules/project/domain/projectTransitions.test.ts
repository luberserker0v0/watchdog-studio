import { expect, it } from "vitest";
import type { PipelineDraftStatus } from "../contracts/ProjectDocumentSession";
import { canSaveAllDrafts, dirtyDrafts, draftCanSave } from "./projectTransitions";

const ready: PipelineDraftStatus = {
  path: "main.pipeline.json", name: "Main", dirty: true, canSave: true, saving: false,
};

it("finds dirty documents across all open pipeline sessions", () => {
  const clean = { ...ready, path: "clean.pipeline.json", dirty: false };

  expect(dirtyDrafts({ clean, ready })).toEqual([ready]);
});

it("allows Save all only when every dirty pipeline is ready", () => {
  expect(canSaveAllDrafts([ready])).toBe(true);
  expect(canSaveAllDrafts([{ ...ready, canSave: false }])).toBe(false);
  expect(canSaveAllDrafts([{ ...ready, saving: true }])).toBe(false);
  expect(canSaveAllDrafts([])).toBe(false);
});

it("requires a current successful debug result before saving a draft", () => {
  expect(draftCanSave({ dirty: true, saving: false, debugPending: false,
    debugStale: false, diagnosticCount: 0 })).toBe(true);
  expect(draftCanSave({ dirty: true, saving: false, debugPending: false,
    debugStale: true, diagnosticCount: 0 })).toBe(false);
});
