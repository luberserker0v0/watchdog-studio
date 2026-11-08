# Architecture

## Product boundary

WatchDog Studio owns authoring, visualization, validation presentation, source
diffs, and project packaging. WatchDog Automation owns execution, capture,
recognition, actions, devices, Patrol, and runtime testing.

Studio consumes a pinned WatchDog specification from `schemas/`. Updating that
specification is an explicit compatibility change and requires refreshed
schemas, fixtures, diagnostics review, and a recorded Automation version.
The pinned set includes `watchdog-node-defaults.json`, whose canonical copy is
owned and consumed by the WatchDog runtime.

## Dependency direction

```text
frontend: app shell → feature contracts → application → domain → shared
backend:  Tauri commands → application use cases → domain ← adapters
```

Features may import another feature only through its `contracts/` directory.
Tauri and filesystem types stop at backend boundaries. Filesystem adapters
operate only inside the selected canonical project root and reject traversal
and symbolic-link escapes.

## Source model

Every pipeline consists of:

- `<name>.meta.json`: target, launch settings, and reusable node definitions;
- `<name>.pipeline.json`: runtime instances plus ordered `next` and optional
  single `error` routes;
- `<name>.layout.json`: optional presentation-only node positions.

The pipeline JSON is the only topology source. Layout never affects execution.
A no-change load/save cycle preserves exact source text.

The backend validates each JSON source against Draft 2020-12 schemas, resolves
instance bindings, constructs a normalized graph, and applies semantic checks
for missing routes, endpoint out-routes, multiple entry rules, and cycles.
Frontend forms are authoring conveniences; backend validation is authoritative.

An empty selected root exposes an explicit initialization use case. The backend
rechecks that the canonical root is still empty, validates project and pipeline
identifiers, uses create-new writes, and rolls back files created by a failed
attempt. A successful initialization returns the rescanned project and loaded
first document so the shell can open it without a second user action.

## Draft and save lifecycle

Property and route edits use `jsonc-parser` transformations at exact JSON
paths. Timing and instance fields update the matching object in pipeline JSON.
Behavior edits use copy-on-write: Studio clones a shared metadata definition,
redirects only the selected instance, and edits the clone.

Draft mutations enter a source-snapshot history that supports undo and redo.
The frontend derives a provisional graph locally so editing never performs an
implicit backend Debug. Backend validation runs on load or explicit Debug;
Save requires a non-stale successful Debug result. Save includes the original
source snapshot, so external changes reject the operation. Changed files are
staged beside their destinations and replaced as one guarded operation; a
failed later replacement restores already replaced files.

Project replacement is a shell-owned transition. Every mounted pipeline
document publishes a small session contract containing its dirty/save-ready
state and save operation. Opening or closing a project first evaluates all
sessions, then requires Save all, Discard, or Cancel when any draft is dirty.
The current project is replaced only after the folder picker and backend scan
succeed, so cancellation and load errors cannot erase the active workspace.

## Graph interaction

The SVG canvas consumes the normalized graph and emits typed selection,
connection, movement, marquee, and viewport-pan intents. Next connections
append to an ordered fan-out array. A new Error connection replaces the one
optional error route. Group dragging changes only layout JSON; a missing layout
receives deterministic positions until the first move creates it. Side panels
and the upward-expanding Console overlay the canvas rather than resizing it.
Node Library drag payloads contain a definition snapshot, not only an ID, so a
cross-pipeline drop can copy behavior into the active metadata source. Edge
paths connect typed output ports to a common input port; selected endpoint
handles emit guarded route-replacement intents.

## Automated guardrails

- ESLint `max-lines-per-function`: 30 lines for TypeScript and React.
- Clippy `too_many_lines`: threshold 30 for Rust.
- `scripts/check-architecture.mjs`: reverse dependency and boundary checks.
- CI and local development both run `npm run check`.

Generated schemas and static data are isolated from executable production
logic. Exceptions require a documented rationale rather than disabled checks.
