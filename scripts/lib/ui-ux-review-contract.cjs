const fs = require("node:fs");
const path = require("node:path");

const IMPACT_LEVELS = new Set(["none", "visual", "journey"]);

const LIKELY_UI_PATHS = [
  /^app\/src\/(?:components|views|router|widget|assets)\//,
  /^app\/src\/App\.vue$/,
  /^dashboard\/app\/(?:components|pages|layouts|assets)\//,
  /\.(?:css|scss|sass|less)$/i,
];

const TEST_PATH =
  /(^|\/)(?:__tests__|tests?|e2e)(\/|$)|\.(?:spec|test|e2e)\.[cm]?[jt]sx?$/;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sectionForHeading(body, heading, level = 2) {
  const headingPrefix = "#".repeat(level);
  const headingExpression = new RegExp(
    `^${headingPrefix}\\s+${escapeRegExp(heading)}\\s*$`,
    "im",
  );
  const match = headingExpression.exec(body || "");

  if (!match) return "";

  const start = match.index + match[0].length;
  const remaining = body.slice(start);
  const nextHeading = new RegExp(`^#{1,${level}}\\s+`, "m").exec(remaining);

  return nextHeading ? remaining.slice(0, nextHeading.index) : remaining;
}

function fieldValue(section, label) {
  const expression = new RegExp(
    `\\*\\*${escapeRegExp(label)}:\\*\\*\\s*([^\\n]+)`,
    "i",
  );
  const match = expression.exec(section);

  return match ? match[1].trim() : "";
}

function isMeaningful(value) {
  const normalized = value.replace(/`/g, "").trim();

  return (
    normalized.length > 0 &&
    !/^<[^>]+>$/.test(normalized) &&
    !/\b(?:fill in|todo|tbd|replace me)\b/i.test(normalized) &&
    !/^(?:n\/a|not applicable)$/i.test(normalized)
  );
}

function selectedImpactLevels(section) {
  return [
    ...section.matchAll(/^\s*-\s*\[([ xX])\]\s*`(none|visual|journey)`/gim),
  ]
    .filter((match) => match[1].toLowerCase() === "x")
    .map((match) => match[2].toLowerCase());
}

function storyIdsFrom(value) {
  return [
    ...new Set(value.match(/\bUS-[A-Z0-9]+(?:-[A-Z0-9]+)*-\d+\b/g) || []),
  ];
}

function reviewerJourneyRows(section) {
  const lines = section.split("\n");
  const headerIndex = lines.findIndex(
    (line) =>
      /^\s*\|\s*step\s*\|/i.test(line) &&
      /\|\s*actor(?:\(s\))?\s*\|/i.test(line) &&
      /\|\s*action\s*\|/i.test(line) &&
      /\|\s*expected result\s*\|/i.test(line),
  );

  if (headerIndex === -1) return [];

  const rows = [];
  for (let index = headerIndex + 2; index < lines.length; index += 1) {
    const line = lines[index];
    if (!/^\s*\|/.test(line)) break;

    const cells = line
      .trim()
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());

    if (cells.length >= 4) rows.push(cells);
  }

  return rows;
}

function isLikelyUiPath(filePath) {
  return (
    !TEST_PATH.test(filePath) &&
    LIKELY_UI_PATHS.some((pattern) => pattern.test(filePath))
  );
}

function validateUiUxReview({
  body = "",
  changedFiles = [],
  canonicalStoryIds = [],
}) {
  const errors = [];
  const warnings = [];
  const section = sectionForHeading(body, "UI/UX Reviewer Journey");

  if (!section) {
    return {
      impact: null,
      errors: [
        "Add a `## UI/UX Reviewer Journey` section and select exactly one impact level.",
      ],
      warnings,
      storyIds: [],
    };
  }

  const selectedLevels = selectedImpactLevels(section);
  if (selectedLevels.length !== 1 || !IMPACT_LEVELS.has(selectedLevels[0])) {
    return {
      impact: null,
      errors: [
        "Select exactly one UI/UX impact level: `none`, `visual`, or `journey`.",
      ],
      warnings,
      storyIds: [],
    };
  }

  const impact = selectedLevels[0];
  const likelyUiFiles = changedFiles.filter(isLikelyUiPath);
  const visualReview = sectionForHeading(section, "Visual review", 3);
  const journeyReview = sectionForHeading(section, "Journey review", 3);

  if (impact === "none" && likelyUiFiles.length > 0) {
    warnings.push(
      `UI/UX impact is \`none\` but likely UI files changed: ${likelyUiFiles.map((file) => `\`${file}\``).join(", ")}. Confirm the classification during review.`,
    );
  }

  if (impact === "visual") {
    for (const label of [
      "Surface / entry point",
      "Review scope",
      "Expected result",
      "Evidence",
    ]) {
      if (!isMeaningful(fieldValue(visualReview, label))) {
        errors.push(
          `Add a meaningful **${label}:** value for the visual review.`,
        );
      }
    }
  }

  const storiesField = fieldValue(
    journeyReview,
    "Canonical stories / use cases",
  );
  const storyIds = storyIdsFrom(storiesField);

  if (impact === "journey") {
    for (const label of [
      "Canonical stories / use cases",
      "Entry point",
      "Prerequisites",
      "Actors",
      "Evidence",
    ]) {
      if (!isMeaningful(fieldValue(journeyReview, label))) {
        errors.push(
          `Add a meaningful **${label}:** value for the reviewer journey.`,
        );
      }
    }

    if (storyIds.length === 0) {
      errors.push(
        "Reference at least one canonical `US-*` identifier in **Canonical stories / use cases:**.",
      );
    }

    const knownStoryIds = new Set(canonicalStoryIds);
    const unknownStoryIds = storyIds.filter(
      (storyId) => !knownStoryIds.has(storyId),
    );
    if (unknownStoryIds.length > 0) {
      errors.push(
        `Unknown canonical user story identifier(s): ${unknownStoryIds.map((storyId) => `\`${storyId}\``).join(", ")}.`,
      );
    }

    const rows = reviewerJourneyRows(journeyReview);
    if (rows.length === 0) {
      errors.push(
        "Add at least one `Step | Actor | Action | Expected result` row to the reviewer journey.",
      );
    } else if (
      rows.some((row) => row.slice(0, 4).some((cell) => !isMeaningful(cell)))
    ) {
      errors.push(
        "Every reviewer-journey row needs meaningful Step, Actor, Action, and Expected result values.",
      );
    }
  }

  return { impact, errors, warnings, storyIds };
}

function canonicalStoryIdsFrom(directory) {
  const storyIds = new Set();

  if (!fs.existsSync(directory)) return storyIds;

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      for (const storyId of canonicalStoryIdsFrom(entryPath))
        storyIds.add(storyId);
    } else if (entry.name === "README.md") {
      const content = fs.readFileSync(entryPath, "utf8");
      for (const match of content.matchAll(
        /^##\s+(US-[A-Z0-9]+(?:-[A-Z0-9]+)*-\d+):/gm,
      )) {
        storyIds.add(match[1]);
      }
    }
  }

  return storyIds;
}

module.exports = {
  canonicalStoryIdsFrom,
  isLikelyUiPath,
  reviewerJourneyRows,
  validateUiUxReview,
};
