import { expect, it } from "vitest";
import { closeWorkspaceTab } from "./workspaceTabs";

it("unloads a closed tab and activates the most recent remaining tab", () => {
  const documents = [{ pipelinePath: "A" }, { pipelinePath: "B" }, { pipelinePath: "cached" }];
  const closed = closeWorkspaceTab(documents, ["A", "B"], "B", "B");

  expect(closed.documents).toEqual([{ pipelinePath: "A" }, { pipelinePath: "cached" }]);
  expect(closed.openPaths).toEqual(["A"]);
  expect(closed.activePath).toBe("A");
});

it("keeps the active tab when a background tab closes", () => {
  const closed = closeWorkspaceTab([{ pipelinePath: "A" }, { pipelinePath: "B" }],
    ["A", "B"], "B", "A");

  expect(closed.activePath).toBe("B");
  expect(closed.documents).toEqual([{ pipelinePath: "B" }]);
});
