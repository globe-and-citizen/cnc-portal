// @ts-check
/**
 * Danger configuration — PR size cap.
 *
 * Large PRs erase the reviewer's bandwidth. This rule caps a PR at
 * MAX_CHANGED_LINES *meaningful* changed lines and, when exceeded, posts a
 * comment suggesting how to split the work.
 *
 * What counts:
 *   - Added + deleted lines across the PR, EXCLUDING generated files,
 *     lockfiles, and test snapshots (see IGNORED_PATTERNS).
 *
 * Override:
 *   - Add the `large-pr-justified` label to the PR.
 *   - The override only takes effect if the PR body contains a non-empty
 *     justification under a "## Large PR justification" heading (or any
 *     non-empty body text following that heading). Without the note the
 *     override is rejected and the size warning still fires.
 *
 * Runs in CI via `.github/workflows/danger.yml` on pull_request events.
 */

const { danger, warn, message, markdown, fail } = require("danger");

/** Maximum number of meaningful changed lines before we warn. */
const MAX_CHANGED_LINES = 400;

/** Label that opts a PR out of the size cap. */
const OVERRIDE_LABEL = "large-pr-justified";

/**
 * Glob-ish patterns for files that should NOT count toward the size budget:
 * lockfiles, generated artifacts, test snapshots, vendored code, etc.
 * Matched against the repo-relative file path.
 */
const IGNORED_PATTERNS = [
  // Lockfiles
  /(^|\/)package-lock\.json$/,
  /(^|\/)yarn\.lock$/,
  /(^|\/)pnpm-lock\.yaml$/,
  /(^|\/)bun\.lockb$/,
  // Test snapshots
  /(^|\/)__snapshots__\//,
  /\.snap$/,
  // Generated type / import declarations and build output
  /(^|\/)auto-imports\.d\.ts$/,
  /(^|\/)components\.d\.ts$/,
  /(^|\/)typed-router\.d\.ts$/,
  /(^|\/)dist\//,
  /(^|\/)coverage\//,
  // Generated changelog
  /(^|\/)CHANGELOG\.md$/,
  // Prisma generated client / migrations are mechanical
  /(^|\/)prisma\/migrations\//,
  // Generated contract artifacts / ABIs / deployed addresses
  /(^|\/)artifacts\//,
  /(^|\/)deployed_addresses\//,
  /(^|\/)typechain(-types)?\//,
  // The Graph / Ponder generated code
  /(^|\/)generated\//,
];

/** True when the file path matches any ignore pattern. */
function isIgnored(filePath) {
  return IGNORED_PATTERNS.some((pattern) => pattern.test(filePath));
}

/**
 * Sum added + deleted lines for the given files using Danger's per-file
 * diff metadata. Returns 0 for files Danger can't diff (e.g. binaries).
 */
async function countChangedLines(files) {
  let total = 0;
  for (const file of files) {
    const diff = await danger.git.diffForFile(file);
    if (!diff) continue;
    total += (diff.added || "")
      .split("\n")
      .filter((l) => l.startsWith("+")).length;
    total += (diff.removed || "")
      .split("\n")
      .filter((l) => l.startsWith("-")).length;
  }
  return total;
}

/**
 * Read the justification note from the PR body. We accept any non-empty text
 * following a "Large PR justification" heading (case-insensitive).
 */
function getJustification(body) {
  if (!body) return "";
  const match = body.match(
    /#+\s*large pr justification\s*\n([\s\S]*?)(?:\n#+\s|$)/i,
  );
  if (!match) return "";
  return match[1].replace(/^\s*[-*]?\s*/, "").trim();
}

async function checkPrSize() {
  const pr = danger.github.pr;
  const allChanged = [
    ...danger.git.modified_files,
    ...danger.git.created_files,
  ];
  const counted = allChanged.filter((f) => !isIgnored(f));
  const ignored = allChanged.filter((f) => isIgnored(f));

  const changedLines = await countChangedLines(counted);

  if (changedLines <= MAX_CHANGED_LINES) {
    message(
      `✅ PR size: ${changedLines} meaningful changed lines (limit ${MAX_CHANGED_LINES}).` +
        (ignored.length
          ? ` ${ignored.length} generated/lockfile/snapshot file(s) excluded.`
          : ""),
    );
    return;
  }

  // Over the cap — check for a justified override.
  const labels = (danger.github.issue.labels || []).map((l) => l.name);
  const hasOverrideLabel = labels.includes(OVERRIDE_LABEL);
  const justification = getJustification(pr.body);

  if (hasOverrideLabel && justification) {
    message(
      `🟡 PR exceeds the ${MAX_CHANGED_LINES}-line cap (${changedLines} lines) but is ` +
        `justified via the \`${OVERRIDE_LABEL}\` label.\n\n> ${justification}`,
    );
    return;
  }

  if (hasOverrideLabel && !justification) {
    fail(
      `The \`${OVERRIDE_LABEL}\` label is set but no justification was found in the PR body. ` +
        "Add a non-empty note under a `## Large PR justification` heading explaining why this " +
        "PR cannot be split, then re-run the check.",
    );
  }

  warn(
    `🚨 This PR changes **${changedLines}** meaningful lines, over the **${MAX_CHANGED_LINES}**-line cap ` +
      `(generated files, lockfiles, and snapshots are already excluded). Large PRs are hard to review well.`,
  );

  markdown(
    [
      "### 📦 This PR is large — consider splitting it",
      "",
      `Reviewer attention is the scarce resource. A PR over **${MAX_CHANGED_LINES}** changed lines ` +
        "is hard to review thoroughly. Some ways to decompose it:",
      "",
      "- **Separate refactors from behavior changes** — land mechanical moves/renames in their own PR.",
      "- **Split by layer** — backend, frontend, and contract changes can usually ship independently.",
      "- **Stack PRs** — open a small base PR and stack follow-ups on top.",
      "- **Extract prep work** — pull out new utils/composables or test scaffolding first.",
      "",
      "#### Need to ship it as-is?",
      "",
      `Add the \`${OVERRIDE_LABEL}\` label **and** a note under a \`## Large PR justification\` ` +
        "heading in the PR description explaining why it cannot be split. The check will then pass.",
    ].join("\n"),
  );
}

checkPrSize().catch((error) => {
  fail(
    `Danger PR-size check failed to run: ${error && error.message ? error.message : error}`,
  );
});
