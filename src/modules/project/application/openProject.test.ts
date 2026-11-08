import { beforeEach, expect, it, vi } from "vitest";
import { chooseAndOpenProject } from "./openProject";

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  open: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({ invoke: mocks.invoke }));
vi.mock("@tauri-apps/plugin-dialog", () => ({ open: mocks.open }));

beforeEach(() => vi.clearAllMocks());

it("returns null when folder selection is cancelled", async () => {
  mocks.open.mockResolvedValue(null);
  await expect(chooseAndOpenProject()).resolves.toBeNull();
  expect(mocks.invoke).not.toHaveBeenCalled();
});

it("opens the directory through the confined backend session", async () => {
  const summary = { rootPath: "C:\\project", pipelines: [], warnings: [] };
  mocks.open.mockResolvedValue("C:\\project");
  mocks.invoke.mockResolvedValue(summary);
  await expect(chooseAndOpenProject()).resolves.toBe(summary);
  expect(mocks.invoke).toHaveBeenCalledWith("open_project", { path: "C:\\project" });
});
