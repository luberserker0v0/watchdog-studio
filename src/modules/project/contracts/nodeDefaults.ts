import defaults from "../../../../schemas/watchdog-node-defaults.json";

if (defaults.contract_version !== 1) throw new Error("Unsupported WatchDog node-default contract");

export const WATCHDOG_NODE_DEFAULTS: Readonly<Record<string, unknown>> = defaults;

export const OPTIONAL_NODE_FIELDS = [
  "kind", "enabled", "inverse", "timeout", "error_timeout", "rate_limit",
  "pre_delay", "pre_wait_freezes", "post_delay", "post_wait_freezes",
  "max_hit", "repeat", "repeat_delay",
] as const;

export type OptionalNodeField = typeof OPTIONAL_NODE_FIELDS[number];

export function nodeDefault(field: OptionalNodeField): unknown {
  return WATCHDOG_NODE_DEFAULTS[field];
}
