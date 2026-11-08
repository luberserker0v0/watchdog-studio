import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import NodeLibrary from "./NodeLibrary";
import PipelineList from "./PipelineList";

it("renders a distinct selected pipeline card", () => {
  const pipeline = { name: "Login", pipelinePath: "Login.pipeline.json",
    metadataPath: "Login.meta.json" };
  const html = renderToStaticMarkup(<PipelineList activePath={pipeline.pipelinePath}
    busy={false} onEditSource={vi.fn()} onOpen={vi.fn()} onSelect={vi.fn()}
    pipelines={[pipeline]} selectedPath={pipeline.pipelinePath} />);

  expect(html).toContain('class="selected open"');
});

it("renders the selected node card inside its pipeline group", () => {
  const pipeline = { name: "Login", pipelinePath: "Login.pipeline.json",
    metadataPath: "Login.meta.json" };
  const document = { ...pipeline, pipelineSource: '{"instances":{}}',
    metadataSource: '{"nodes":{"ClickLogin":{}}}', diagnostics: [],
    specification: { automationVersion: "2.0.0", automationCommit: "test",
      jsonSchemaDraft: "2020-12" } };
  const html = renderToStaticMarkup(<NodeLibrary canAdd documents={[document]}
    loadedPaths={[pipeline.pipelinePath]} onAddNode={vi.fn()} onEditMetadata={vi.fn()} onSelect={vi.fn()}
    onBeginDrag={vi.fn()}
    pipelines={[pipeline]} selectedKey="Login.pipeline.json:ClickLogin" />);

  expect(html).toContain("node-card normal selected");
  expect(html).toContain("Double-click or drag to the active pipeline");
});

it("does not expose nodes from a pipeline without an open workspace tab", () => {
  const pipeline = { name: "Login", pipelinePath: "Login.pipeline.json",
    metadataPath: "Login.meta.json" };
  const document = { ...pipeline, pipelineSource: '{"instances":{}}',
    metadataSource: '{"nodes":{"ClickLogin":{}}}', diagnostics: [],
    specification: { automationVersion: "2.0.0", automationCommit: "test",
      jsonSchemaDraft: "2020-12" } };
  const html = renderToStaticMarkup(<NodeLibrary canAdd={false} documents={[document]} loadedPaths={[]}
    onAddNode={vi.fn()} onBeginDrag={vi.fn()} onEditMetadata={vi.fn()} onSelect={vi.fn()}
    pipelines={[pipeline]} />);

  expect(html).not.toContain("ClickLogin");
  expect(html).toContain("Open this pipeline to load its nodes.");
});
