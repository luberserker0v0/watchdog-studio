import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import ProjectTransitionDialog from "./ProjectTransitionDialog";

it("lists every dirty pipeline and keeps unsafe Save all disabled", () => {
  const html = renderToStaticMarkup(<ProjectTransitionDialog pending="open"
    dirty={[{ path: "main", name: "Main", dirty: true, canSave: true, saving: false },
      { path: "login", name: "Login", dirty: true, canSave: false, saving: false }]}
    canSaveAll={false} saving={false} onCancel={vi.fn()}
    onDiscard={vi.fn()} onSaveAll={vi.fn()} />);

  expect(html).toContain("Save before you open another project?");
  expect(html).toContain("Main");
  expect(html).toContain("Login");
  expect(html).toContain("Debug required");
  expect(html).toContain("disabled");
});

it("does not render without a pending project transition", () => {
  const html = renderToStaticMarkup(<ProjectTransitionDialog dirty={[]}
    canSaveAll={false} saving={false} onCancel={vi.fn()}
    onDiscard={vi.fn()} onSaveAll={vi.fn()} />);

  expect(html).toBe("");
});
