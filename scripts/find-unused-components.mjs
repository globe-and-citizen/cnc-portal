#!/usr/bin/env node
/**
 * find-unused-components.mjs
 *
 * Lists all Vue components under app/src/components and reports
 * which ones are not imported or referenced anywhere in the source.
 *
 * Usage:
 *   node scripts/find-unused-components.mjs
 *   node scripts/find-unused-components.mjs --verbose   (show where used components are referenced)
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative, basename, extname } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const COMPONENTS_DIR = join(ROOT, "app/src/components");
const SEARCH_DIR = join(ROOT, "app/src");

const VERBOSE = process.argv.includes("--verbose");

// ── Helpers ──────────────────────────────────────────────────────────────────

function walkDir(dir, exts = [".vue", ".ts", ".js"]) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      // Skip test directories
      if (["__tests__", "tests"].includes(entry)) continue;
      results.push(...walkDir(full, exts));
    } else if (exts.includes(extname(entry))) {
      results.push(full);
    }
  }
  return results;
}

/** Convert a file path to the PascalCase component name used in templates. */
function toPascalCase(name) {
  return name
    .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (_, c) => c.toUpperCase());
}

/** Convert a PascalCase name to kebab-case for template tag matching. */
function toKebabCase(name) {
  return name.replace(/([A-Z])/g, (_, c, i) =>
    i === 0 ? c.toLowerCase() : "-" + c.toLowerCase(),
  );
}

function countMatches(content, regex) {
  const matches = content.match(regex);
  return matches ? matches.length : 0;
}

function printCheckedFilesTable(rows) {
  if (rows.length === 0) return;

  const headers = ["Checked file", "Imports", "Included in (top 3)"];
  const sortedRows = [...rows].sort(
    (a, b) => b.importCount - a.importCount || a.path.localeCompare(b.path),
  );
  const fileWidth = Math.max(
    headers[0].length,
    ...sortedRows.map((row) => row.path.length),
  );
  const importsWidth = Math.max(
    headers[1].length,
    ...sortedRows.map((row) => String(row.importCount).length),
  );
  const includedWidth = Math.max(
    headers[2].length,
    ...sortedRows.map((row) => row.topReferences.join(", ").length),
  );

  const separator = `+-${"-".repeat(fileWidth)}-+-${"-".repeat(importsWidth)}-+-${"-".repeat(includedWidth)}-+`;
  const formatRow = (file, imports, includedIn) =>
    `| ${file.padEnd(fileWidth)} | ${String(imports).padStart(importsWidth)} | ${includedIn.padEnd(includedWidth)} |`;

  console.log("\nCHECKED FILES (IMPORT COUNT):\n");
  console.log(separator);
  console.log(formatRow(headers[0], headers[1], headers[2]));
  console.log(separator);

  for (const row of sortedRows) {
    const includedIn = row.topReferences.length
      ? row.topReferences.join(", ")
      : "-";
    console.log(formatRow(row.path, row.importCount, includedIn));
  }

  console.log(separator);
  console.log();
}

// ── 1. Collect all components ─────────────────────────────────────────────────

const allComponents = walkDir(COMPONENTS_DIR, [".vue"]);

// ── 2. Collect all source files to search in ─────────────────────────────────

const allSourceFiles = walkDir(SEARCH_DIR, [".vue", ".ts", ".js"]);

// ── 3. Build a searchable corpus (file path → content) ───────────────────────

console.log(`Scanning ${allSourceFiles.length} source files for references…\n`);

const corpus = new Map();
for (const file of allSourceFiles) {
  corpus.set(file, readFileSync(file, "utf8"));
}

// ── 4. Check each component ───────────────────────────────────────────────────

const unused = [];
const used = [];
const checkedFiles = [];

for (const componentPath of allComponents) {
  const name = basename(componentPath, ".vue"); // e.g. "NavBar"
  const pascal = toPascalCase(name); // e.g. "NavBar"
  const kebab = toKebabCase(pascal); // e.g. "nav-bar"

  // Patterns to look for:
  //   import ... from '...NavBar.vue'   → file name match
  //   <NavBar                           → PascalCase template tag
  //   <nav-bar                          → kebab-case template tag
  const importPattern = new RegExp(`['"\`/]${name}\\.vue`, "g");
  const patterns = [
    new RegExp(`['"\`/]${name}\\.vue`), // import path ending in ComponentName.vue
    new RegExp(`<${pascal}[\\s/>]`), // PascalCase tag
    new RegExp(`<${kebab}[\\s/>]`), // kebab-case tag
  ];

  const references = [];
  let importCount = 0;

  for (const [filePath, content] of corpus) {
    // Don't count a component as "using itself"
    if (filePath === componentPath) continue;

    importCount += countMatches(content, importPattern);

    if (patterns.some((re) => re.test(content))) {
      references.push(relative(ROOT, filePath));
    }
  }

  checkedFiles.push({
    name,
    path: relative(ROOT, componentPath),
    importCount,
    topReferences: references.slice(0, 1),
    referenceCount: references.length,
  });

  if (references.length === 0) {
    unused.push({ name, path: relative(ROOT, componentPath) });
  } else {
    used.push({ name, path: relative(ROOT, componentPath), references });
  }
}

// ── 5. Report ─────────────────────────────────────────────────────────────────

console.log("━".repeat(60));
console.log(`  Total components : ${allComponents.length}`);
console.log(`  Used             : ${used.length}`);
console.log(`  Unused           : ${unused.length}`);
console.log("━".repeat(60));

printCheckedFilesTable(checkedFiles);

if (unused.length === 0) {
  console.log("\n✓ All components are referenced somewhere.\n");
} else {
  console.log("\nUNUSED COMPONENTS:\n");
  for (const { name, path } of unused) {
    console.log(`  ✗  ${name.padEnd(45)} ${path}`);
  }
  console.log();
}

if (VERBOSE && used.length > 0) {
  console.log("\nUSED COMPONENTS:\n");
  for (const { name, path, references } of used) {
    console.log(`  ✓  ${name}  (${path})`);
    for (const ref of references) {
      console.log(`       referenced in: ${ref}`);
    }
  }
  console.log();
}
