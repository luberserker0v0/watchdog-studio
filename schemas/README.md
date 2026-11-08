# Pinned WatchDog specification

These schemas describe the WatchDog Automation 2.0.0 pipeline source contract.

Studio bundles the schemas for deterministic offline validation. The source set
contains metadata definitions, runtime pipeline instances/routes, and optional
presentation layout. It intentionally has no legacy topology format.

A specification update requires:

1. copying schemas from a released Automation version;
2. updating `watchdog-spec.json` with its release commit;
3. adding or updating compatibility fixtures and tests;
4. reviewing all newly reported diagnostics.
