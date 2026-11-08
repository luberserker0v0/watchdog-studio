import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const SOURCE_ROOT = path.resolve("src");
const IMPORT_PATTERN = /(?:import|export)\s+(?:[^"']+?\s+from\s+)?["']([^"']+)["']/g;

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(target);
    return /\.(ts|tsx)$/.test(entry.name) ? [target] : [];
  });
}

function importedPaths(file) {
  const source = fs.readFileSync(file, "utf8");
  return [...source.matchAll(IMPORT_PATTERN)].map((match) => match[1]);
}

function featureName(file) {
  const relative = path.relative(SOURCE_ROOT, file).split(path.sep);
  return relative[0] === "modules" ? relative[1] : undefined;
}

function resolveImport(file, imported) {
  if (!imported.startsWith(".")) return undefined;
  return path.resolve(path.dirname(file), imported);
}

function violationFor(file, target) {
  const sourceFeature = featureName(file);
  const targetFeature = featureName(target);
  if (file.includes(`${path.sep}shared${path.sep}`) && target.includes(`${path.sep}modules${path.sep}`)) {
    return "shared code cannot depend on a feature";
  }
  if (sourceFeature && target.includes(`${path.sep}app${path.sep}`)) {
    return "features cannot depend on the application shell";
  }
  if (sourceFeature && targetFeature && sourceFeature !== targetFeature && !target.includes(`${path.sep}contracts${path.sep}`)) {
    return "cross-feature imports must target a contracts directory";
  }
  return undefined;
}

function findViolations() {
  return sourceFiles(SOURCE_ROOT).flatMap((file) => importedPaths(file).flatMap((imported) => {
    const target = resolveImport(file, imported);
    const reason = target && violationFor(file, target);
    return reason ? [`${path.relative(SOURCE_ROOT, file)}: ${reason} (${imported})`] : [];
  }));
}

const violations = findViolations();
if (violations.length) {
  console.error(violations.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Architecture boundaries passed.");
}
