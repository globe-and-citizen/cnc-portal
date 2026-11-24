import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const entryPoints = [
  new URL("../README.md", import.meta.url),
  new URL("../CONTRIBUTION.md", import.meta.url),
  new URL("../AGENTS.md", import.meta.url),
  new URL("../docs/README.md", import.meta.url),
  new URL("../.github/copilot-instructions/README.md", import.meta.url),
  new URL("../docs/platform/documentation-freshness-policy.md", import.meta.url),
];

const stackOverviewPaths = [
  ["README.md", new URL("../README.md", import.meta.url)],
  ["docs/01_PROJECT_CHARTER.md", new URL("../docs/01_PROJECT_CHARTER.md", import.meta.url)],
  ["docs/platform/architecture.md", new URL("../docs/platform/architecture.md", import.meta.url)],
  ["docs/platform/deployment.md", new URL("../docs/platform/deployment.md", import.meta.url)],
  ["docs/platform/development-standards.md", new URL("../docs/platform/development-standards.md", import.meta.url)],
  ["docs/development-guide/README.md", new URL("../docs/development-guide/README.md", import.meta.url)],
  [".github/copilot-instructions/README.md", new URL("../.github/copilot-instructions/README.md", import.meta.url)],
];

const versionClaims = [
  /\bNode(?:\.js)?\s+(?:v)?\d+(?:\.\d+)*(?:\+)?/i,
  /\bVue(?:\.js)?\s+(?:v)?\d+(?:\.x)?/i,
  /\bVite\s+(?:v)?\d+(?:\.x)?/i,
  /\bTypeScript\s+(?:v)?\d+(?:\.x)?/i,
  /\bNuxt\s+(?:v)?\d+(?:\.x)?/i,
  /\bNuxt UI\s+(?:v)?\d+(?:\.x)?/i,
  /\bExpress(?:\.js)?\s+(?:v)?\d+(?:\.x)?/i,
  /\bPrisma(?:\s+ORM)?\s+(?:v)?\d+(?:\.x)?/i,
  /\bZod\s+(?:v)?\d+(?:\.x)?/i,
  /\bHardhat\s+(?:v)?\d+(?:\.x)?/i,
  /\bTailwind(?:\s+CSS)?\s+(?:v)?\d+(?:\.x)?/i,
  /\bPostgreSQL\s+(?:v)?\d+(?:\.x)?/i,
  /\bSolidity\s+(?:v)?\d+(?:\.x)?/i,
];

test("documentation maintenance policy is linked from contributor entry points", async () => {
  for (const path of entryPoints) {
    const content = await readFile(path, "utf8");
    assert.match(content, /documentation-maintenance\.md/, `${path.pathname} must link to the policy`);
  }
});

test("stack overviews defer tool versions to package manifests", async () => {
  for (const [label, path] of stackOverviewPaths) {
    const content = await readFile(path, "utf8");
    for (const pattern of versionClaims) {
      assert.doesNotMatch(content, pattern, `${label} must link to the package manifest instead of copying a version claim`);
    }
    assert.doesNotMatch(content, /\b\d{2,}\+?\s+tests?\b/i, `${label} must not copy a drift-prone test count`);
  }
});
