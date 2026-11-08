# Repository instructions

- Preserve high cohesion and low coupling. Each module owns one domain or
  application responsibility and exposes a narrow public contract.
- Keep every production function at or below 30 non-blank, non-comment lines.
- Do not bypass ESLint, Clippy, or architecture checks to land a change.
- Cross-feature imports must target the other feature's `contracts/` directory.
- Keep Tauri APIs at shell or infrastructure boundaries; domain code stays
  platform-independent.
- Keep WatchDog source formats and schemas compatible and source-preserving.
- Add focused tests with behavior changes and run `npm run check` before handoff.
