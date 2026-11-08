# WatchDog Studio

Visual pipeline authoring studio for
[WatchDog Automation](https://github.com/luberserker0v0/watchdog-automation).

WatchDog Studio is a Tauri 2 desktop application. It edits WatchDog project
sources but does not duplicate capture, recognition, input, Patrol, or runtime
execution behavior.

## Current milestone

The editor can:

1. open and safely scan a WatchDog project without following symbolic links;
2. initialize an empty folder with a manifest and valid Entry → Endpoint pipeline;
3. discover `.pipeline.json`, `.meta.json`, and optional `.layout.json` source sets;
4. validate source drafts against pinned Draft 2020-12 schemas and graph rules;
5. open pipelines by double-click into independent graph tabs;
6. pan, marquee-select, group-drag, connect, and delete nodes and routes;
7. undo and redo source-preserving graph and property operations;
8. edit pipeline/meta JSON in focused source modals instead of raw page blocks;
9. inspect node fields, recognition, actions, and routes in an overlay panel;
10. run validation only on load or explicit Debug and review it in a resizable console;
11. save guarded drafts with conflict detection and grid-snapped layout positions.
12. open or close projects without restarting, with Save all / Discard / Cancel
    protection for every dirty pipeline tab.

Graph cards display the editable instance `label` as **Node Name**. Instance
IDs remain system-owned routing identities (`NodeID_UUID`) and appear only in
Inspector system information. Missing names fall back to the definition ID.

Runtime instances and their routes are one source of truth in
`<name>.pipeline.json`. Reusable behavior, target, and launch definitions live
in `<name>.meta.json`. `<name>.layout.json` contains positions only.

WatchDog owns the canonical node-field defaults in
`schemas/watchdog-node-defaults.json`. Studio carries a pinned copy beside its
schemas and uses it to populate optional Inspector fields.

## Workspace gestures

- Double-click a pipeline card to open its graph tab.
- Double-click a Node card or drag it onto the active graph to create an instance
  at the drop position. Cross-pipeline drops copy the reusable definition.
- Drag empty graph space to pan; hold Shift while dragging to marquee-select.
- Ctrl/Cmd-click adds or removes nodes and routes from the selection.
- Drag one selected node to move the selected group.
- Delete or Backspace removes selected nodes/routes; Ctrl/Cmd+Z and
  Ctrl/Cmd+Y restore or reapply source operations.
- Source-file buttons open JSON modals. Editing marks Debug stale; run Debug
  before Save.
- Edges leave the colored Next/Error output ports and enter the left input port.
  Select an edge, then drag either endpoint handle to reconnect it.

## Starting an empty project

Open a truly empty folder and confirm the initialization form. Studio creates
`watchdog.project.json` plus a first pipeline under
`pipelines/<name>/`. The initial graph is `Entry → Endpoint`, so it is valid and
editable immediately. Initialization never overwrites a non-empty folder.

## Switching projects

Use the header menu to choose **Open Project…** or **Close Project**. Opening an
empty folder starts the same explicit initialization flow. If any loaded
pipeline contains unsaved changes, Studio lists every dirty pipeline before the
workspace changes. **Save all** is enabled only after Debug succeeds for each
draft; **Discard and continue** leaves the files unchanged; **Cancel** keeps the
current workspace exactly as it is. A cancelled folder picker or failed project
scan never unloads the current project.

## Development

```powershell
npm install
npm run tauri dev
```

Run every local quality gate:

```powershell
npm run check
```

The check enforces the 30-line production-function limit, architecture
boundaries, frontend and Rust tests, the production build, and Clippy.

## Design constraints

- Production functions contain at most 30 non-blank, non-comment lines.
- Features own cohesive domain, application, and UI code.
- Cross-feature access targets explicit `contracts/` modules.
- Shared code never imports feature or application-shell code.
- JSON transformations preserve unrelated content and formatting.
- WatchDog remains the only automation runtime.

See [Architecture](docs/architecture.md) for dependency rules and ownership.
