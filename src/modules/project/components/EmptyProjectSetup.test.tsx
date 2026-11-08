import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import EmptyProjectSetup from "./EmptyProjectSetup";

it("renders explicit project and first-pipeline defaults before writing files", () => {
  const html = renderToStaticMarkup(<EmptyProjectSetup busy={false}
    defaultName="My Automation" onInitialize={vi.fn()} />);

  expect(html).toContain('value="My Automation"');
  expect(html).toContain('value="my-automation"');
  expect(html).toContain('value="0.1.0"');
  expect(html).toContain('value="main"');
  expect(html).toContain("No files are written until you confirm.");
});
