import { posix } from "node:path";
import ts from "typescript";

const STORY_HEADING = /^## (US-[A-Z0-9-]+):\s+/;
const SECTION_HEADING = /^### (.+)$/;
const CRITERION = /^- \[([ xX])\] (?:`(AC-US-[A-Z0-9-]+-\d{2,})`\s+)?(.+)$/;
const ACCEPTANCE_ID_REFERENCE = /\[(AC-US-[A-Z0-9-]+-\d{2,})\]/g;
const TRACEABILITY_ID_REFERENCE = /\[((?:AC-)?US-[A-Z0-9-]+)\]/g;

export const TEST_COVERAGE_LAYERS = [
  "frontend",
  "backend",
  "contract",
  "dashboard",
  "e2e",
  "other",
];
export const E2E_COVERAGE_MODES = ["integrated", "mocked", "unclassified"];
export const ACCEPTANCE_COVERAGE_LABELS = [
  "Integrated E2E",
  "Mocked browser",
  "Frontend",
  "Backend",
  "Contract",
  "Dashboard",
];
export const ACCEPTANCE_RESPONSIBILITY_LABELS = [
  "Frontend",
  "Backend",
  "Contract",
  "Dashboard",
];

export function classifyE2eCoverageMode(document) {
  if (!/^app\/test\/e2e\//.test(document.path)) return null;

  const integrated = document.content.includes("@integrated");
  const mocked = document.content.includes("@mocked");

  if (integrated && !mocked) return "integrated";
  if (mocked && !integrated) return "mocked";
  return "unclassified";
}

export function parseAcceptanceCriteria(document) {
  const criteria = [];
  let storyId = null;
  let inAcceptanceCriteria = false;

  for (const [index, line] of document.content.split("\n").entries()) {
    const story = line.match(STORY_HEADING);
    if (story) {
      storyId = story[1];
      inAcceptanceCriteria = false;
      continue;
    }

    if (line.startsWith("## ")) {
      storyId = null;
      inAcceptanceCriteria = false;
      continue;
    }

    const section = line.match(SECTION_HEADING);
    if (section) {
      inAcceptanceCriteria =
        storyId !== null && section[1] === "Acceptance Criteria";
      continue;
    }

    if (!storyId || !inAcceptanceCriteria) continue;

    const criterion = line.match(CRITERION);
    if (criterion) {
      criteria.push({
        documentPath: document.path,
        line: index + 1,
        storyId,
        checked: criterion[1].toLowerCase() === "x",
        id: criterion[2] ?? null,
        outcome: criterion[3],
      });
    }
  }

  return criteria;
}

export function parseProofStrategies(document) {
  const strategies = [];
  let inProofStrategyReference = false;

  for (const [index, line] of document.content.split("\n").entries()) {
    if (line.startsWith("## ")) {
      inProofStrategyReference = line === "## Proof Strategy Reference";
      continue;
    }

    if (!inProofStrategyReference || !line.startsWith("|")) continue;

    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.length !== 4) continue;

    const id = cells[0].replaceAll("`", "");
    if (!/^PS-[A-Z0-9-]+$/.test(id)) continue;

    strategies.push({
      documentPath: document.path,
      line: index + 1,
      id,
      responsibilities: cells[1],
      expected: cells[2],
      rationale: cells[3],
    });
  }

  return strategies;
}

export function parseAcceptanceCoverageRows(document) {
  const rows = [];
  let storyId = null;
  let inTestCoverage = false;

  for (const [index, line] of document.content.split("\n").entries()) {
    const story = line.match(STORY_HEADING);
    if (story) {
      storyId = story[1];
      inTestCoverage = false;
      continue;
    }

    if (line.startsWith("## ")) {
      storyId = null;
      inTestCoverage = false;
      continue;
    }

    const section = line.match(SECTION_HEADING);
    if (section) {
      inTestCoverage = storyId !== null && section[1] === "Test Coverage";
      continue;
    }

    if (!storyId || !inTestCoverage || !line.startsWith("|")) continue;

    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.length !== 4 && cells.length !== 6) continue;

    const id = cells[0].replaceAll("`", "");
    if (!/^AC-US-[A-Z0-9-]+-\d{2,}$/.test(id)) continue;

    const responsibilityBased = cells.length === 6;
    const strategyId =
      cells.length === 4 && /^PS-[A-Z0-9-]+$/.test(cells[1].replaceAll("`", ""))
        ? cells[1].replaceAll("`", "")
        : null;

    rows.push({
      documentPath: document.path,
      line: index + 1,
      storyId,
      id,
      strategyId,
      responsibilities: responsibilityBased ? cells[1] : null,
      expected: strategyId ? null : cells[responsibilityBased ? 2 : 1],
      rationale: responsibilityBased ? cells[3] : null,
      current: cells[strategyId ? 2 : responsibilityBased ? 4 : 2],
      status: cells[strategyId ? 3 : responsibilityBased ? 5 : 3],
    });
  }

  return rows;
}

export function acceptanceCriterionReferences(document) {
  const e2eMode = classifyE2eCoverageMode(document);

  return [...document.content.matchAll(ACCEPTANCE_ID_REFERENCE)].map(
    (match) => ({
      documentPath: document.path,
      id: match[1],
      e2eMode,
    }),
  );
}

export function singleIdCoverageComments(document) {
  const comments = [];

  for (const match of document.content.matchAll(/\/\*\*[\s\S]*?\*\//g)) {
    if (!/\bCovers\s*:/.test(match[0])) continue;

    const ids = [
      ...new Set(
        [...match[0].matchAll(TRACEABILITY_ID_REFERENCE)].map(
          (reference) => reference[1],
        ),
      ),
    ];
    if (ids.length !== 1) continue;

    comments.push({
      documentPath: document.path,
      line: document.content.slice(0, match.index).split("\n").length,
      id: ids[0],
    });
  }

  return comments;
}

export function classifyTestCoverageLayer(documentPath) {
  if (/^app\/test\/e2e\//.test(documentPath)) return "e2e";
  if (/^app\//.test(documentPath)) return "frontend";
  if (/^backend\//.test(documentPath)) return "backend";
  if (/^contract\//.test(documentPath)) return "contract";
  if (/^dashboard\//.test(documentPath)) return "dashboard";
  return "other";
}

export function countStaticTestDeclarations(document) {
  const directTests =
    document.content.match(
      /\b(?:it|test)(?:\.(?:only|skip|todo|fixme))?\s*\(/g,
    ) ?? [];
  const parameterizedTests =
    document.content.match(/\b(?:it|test)\.each\s*\(/g) ?? [];
  return directTests.length + parameterizedTests.length;
}

function baseTestCallName(expression) {
  if (ts.isIdentifier(expression) && ["it", "test"].includes(expression.text))
    return expression.text;
  if (
    ts.isPropertyAccessExpression(expression) &&
    ts.isIdentifier(expression.expression) &&
    ["it", "test"].includes(expression.expression.text) &&
    ["only", "skip", "todo", "fixme"].includes(expression.name.text)
  ) {
    return expression.expression.text;
  }
  return null;
}

function isParameterizedTestFactory(expression) {
  const factory = ts.isCallExpression(expression)
    ? expression.expression
    : ts.isTaggedTemplateExpression(expression)
      ? expression.tag
      : expression;
  return (
    (ts.isPropertyAccessExpression(factory) ||
      ts.isPropertyAccessChain(factory)) &&
    factory.name.text === "each" &&
    ts.isIdentifier(factory.expression) &&
    ["it", "test"].includes(factory.expression.text)
  );
}

function staticTitle(argument) {
  if (
    ts.isStringLiteral(argument) ||
    ts.isNoSubstitutionTemplateLiteral(argument)
  )
    return argument.text;
  return null;
}

export function extractStaticTestTitles(document) {
  const source = ts.createSourceFile(
    document.path,
    document.content,
    ts.ScriptTarget.Latest,
    true,
    document.path.endsWith(".tsx") || document.path.endsWith(".jsx")
      ? ts.ScriptKind.TSX
      : ts.ScriptKind.TS,
  );
  const titles = [];

  function visit(node) {
    if (ts.isCallExpression(node) && node.arguments.length > 0) {
      const directTest = baseTestCallName(node.expression);
      const parameterizedTest =
        ts.isCallExpression(node.expression) ||
        ts.isTaggedTemplateExpression(node.expression)
          ? isParameterizedTestFactory(node.expression)
          : false;

      if (directTest || parameterizedTest) {
        const title = staticTitle(node.arguments[0]);
        if (title) titles.push(title);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(source);
  return titles;
}

function repositoryLinks(document) {
  const links = new Set();

  for (const match of document.content.matchAll(/!?\[[^\]]*]\(([^)]+)\)/g)) {
    let reference = match[1].trim();
    if (!reference || /^(?:[A-Za-z][A-Za-z0-9+.-]*:|#)/.test(reference))
      continue;

    if (reference.startsWith("<") && reference.endsWith(">")) {
      reference = reference.slice(1, -1);
    } else {
      reference = reference.split(/\s+['"]/)[0];
    }

    reference = reference.split("#", 1)[0];
    if (!reference) continue;

    try {
      const target = posix.normalize(
        posix.join(posix.dirname(document.path), decodeURIComponent(reference)),
      );
      if (target && !target.startsWith("../") && !target.startsWith("/")) {
        links.add(target.replace(/\/$/, ""));
      }
    } catch {
      // Other documentation checks report malformed Markdown references.
    }
  }

  return [...links];
}

function canonicalFeatureOwners(documentPath, featureDocuments) {
  return featureDocuments
    .filter((document) =>
      repositoryLinks(document).some(
        (evidencePath) =>
          documentPath === evidencePath ||
          documentPath.startsWith(`${evidencePath}/`),
      ),
    )
    .map((document) => document.path);
}

export function summarizeTestFileInventory(
  criteria,
  testDocuments,
  featureDocuments = [],
  technicalDocuments = [],
) {
  const criterionIds = new Set(criteria.map((criterion) => criterion.id));
  const criterionOwnerById = new Map(
    criteria.map((criterion) => [
      criterion.id,
      { documentPath: criterion.documentPath, storyId: criterion.storyId },
    ]),
  );
  const storyOwnerById = new Map(
    criteria.map((criterion) => [criterion.storyId, criterion.documentPath]),
  );

  return testDocuments.flatMap((document) => {
    const declarations = countStaticTestDeclarations(document);
    if (declarations === 0) return [];

    const acceptanceIds = [
      ...new Set(
        acceptanceCriterionReferences(document)
          .map((reference) => reference.id)
          .filter((id) => criterionIds.has(id)),
      ),
    ];
    const storyIds = new Set(
      acceptanceIds.map((id) => criterionOwnerById.get(id).storyId),
    );

    for (const storyId of storyOwnerById.keys()) {
      if (document.content.includes(storyId)) storyIds.add(storyId);
    }

    const markerFeatureDocuments = [...storyIds]
      .map((storyId) => storyOwnerById.get(storyId))
      .filter(Boolean);
    const evidenceFeatureDocuments = canonicalFeatureOwners(
      document.path,
      featureDocuments,
    );
    const technicalOwners = canonicalFeatureOwners(
      document.path,
      technicalDocuments,
    );
    const ownedFeatureDocuments = [
      ...new Set([...markerFeatureDocuments, ...evidenceFeatureDocuments]),
    ].sort();
    const mappingSources = [];
    if (markerFeatureDocuments.length > 0) mappingSources.push("US/AC marker");
    if (evidenceFeatureDocuments.length > 0)
      mappingSources.push("canonical evidence");
    if (technicalOwners.length > 0) mappingSources.push("technical evidence");

    return [
      {
        path: document.path,
        layer: classifyTestCoverageLayer(document.path),
        e2eMode: classifyE2eCoverageMode(document),
        declarations,
        titles: extractStaticTestTitles(document),
        acceptanceIds,
        storyIds: [...storyIds].sort(),
        featureDocuments: ownedFeatureDocuments,
        technicalDocuments: technicalOwners.sort(),
        mappingSources,
      },
    ];
  });
}

export function summarizeAcceptanceCriterionCoverage(criteria, references) {
  const referencesById = new Map();
  const e2eReferencesById = new Map();

  for (const reference of references) {
    const layer = classifyTestCoverageLayer(reference.documentPath);
    const layers = referencesById.get(reference.id) ?? new Map();
    const paths = layers.get(layer) ?? new Set();
    paths.add(reference.documentPath);
    layers.set(layer, paths);
    referencesById.set(reference.id, layers);

    if (layer === "e2e") {
      const modes = e2eReferencesById.get(reference.id) ?? new Map();
      const mode = E2E_COVERAGE_MODES.includes(reference.e2eMode)
        ? reference.e2eMode
        : "unclassified";
      const modePaths = modes.get(mode) ?? new Set();
      modePaths.add(reference.documentPath);
      modes.set(mode, modePaths);
      e2eReferencesById.set(reference.id, modes);
    }
  }

  return criteria.map((criterion) => {
    const referencesForCriterion =
      referencesById.get(criterion.id) ?? new Map();
    const layers = Object.fromEntries(
      TEST_COVERAGE_LAYERS.map((layer) => [
        layer,
        [...(referencesForCriterion.get(layer) ?? [])],
      ]),
    );
    const e2eReferencesForCriterion =
      e2eReferencesById.get(criterion.id) ?? new Map();
    const e2eModes = Object.fromEntries(
      E2E_COVERAGE_MODES.map((mode) => [
        mode,
        [...(e2eReferencesForCriterion.get(mode) ?? [])],
      ]),
    );

    return { ...criterion, layers, e2eModes };
  });
}

export function acceptanceCoverageLabels(criterion) {
  const labels = [];
  if (criterion.e2eModes.integrated.length > 0) labels.push("Integrated E2E");
  if (criterion.e2eModes.mocked.length > 0) labels.push("Mocked browser");
  if (criterion.layers.frontend.length > 0) labels.push("Frontend");
  if (criterion.layers.backend.length > 0) labels.push("Backend");
  if (criterion.layers.contract.length > 0) labels.push("Contract");
  if (criterion.layers.dashboard.length > 0) labels.push("Dashboard");
  if (criterion.e2eModes.unclassified.length > 0)
    labels.push("Unclassified E2E");
  if (criterion.layers.other.length > 0) labels.push("Other");
  return labels;
}

function validateAcceptanceCoverageRows({
  featureDocuments,
  criteria,
  references,
}) {
  const errors = [];
  const criteriaById = new Map(
    criteria.map((criterion) => [criterion.id, criterion]),
  );
  const coverageById = new Map(
    summarizeAcceptanceCriterionCoverage(criteria, references).map(
      (criterion) => [criterion.id, criterion],
    ),
  );

  for (const document of featureDocuments) {
    const strategies = parseProofStrategies(document);
    const strategiesById = new Map();

    for (const strategy of strategies) {
      const location = `${strategy.documentPath}:${strategy.line}`;
      if (strategiesById.has(strategy.id)) {
        errors.push(`${location} duplicates proof strategy ${strategy.id}.`);
        continue;
      }
      strategiesById.set(strategy.id, strategy);

      const responsibilityLabels = strategy.responsibilities
        .split(" + ")
        .map((label) => label.trim());
      const invalidResponsibilities = responsibilityLabels.filter(
        (label) => !ACCEPTANCE_RESPONSIBILITY_LABELS.includes(label),
      );
      if (invalidResponsibilities.length > 0) {
        errors.push(
          `${location} uses unsupported responsibilities ${invalidResponsibilities.join(", ")} for ${strategy.id}.`,
        );
      }

      const expectedLabels = strategy.expected
        .split(" + ")
        .map((label) => label.trim());
      const invalidExpected = expectedLabels.filter(
        (label) => !ACCEPTANCE_COVERAGE_LABELS.includes(label),
      );
      if (invalidExpected.length > 0) {
        errors.push(
          `${location} uses unsupported required evidence ${invalidExpected.join(", ")} for ${strategy.id}.`,
        );
      }

      if (!strategy.rationale) {
        errors.push(
          `${location} is missing a proof rationale for ${strategy.id}.`,
        );
      }
    }

    const rows = parseAcceptanceCoverageRows(document);
    const coveredStories = new Set(rows.map((row) => row.storyId));
    const rowsById = new Map();

    for (const row of rows) {
      const location = `${row.documentPath}:${row.line}`;
      const criterion = criteriaById.get(row.id);
      if (!criterion) {
        errors.push(
          `${location} declares coverage for unknown acceptance criterion ${row.id}.`,
        );
        continue;
      }
      if (criterion.storyId !== row.storyId) {
        errors.push(
          `${location} declares ${row.id} under ${row.storyId}, but it belongs to ${criterion.storyId}.`,
        );
      }
      if (rowsById.has(row.id)) {
        errors.push(
          `${location} duplicates the test-coverage row for ${row.id}.`,
        );
        continue;
      }
      rowsById.set(row.id, row);

      const strategy = row.strategyId
        ? strategiesById.get(row.strategyId)
        : null;
      if (row.strategyId && !strategy) {
        errors.push(
          `${location} references unknown proof strategy ${row.strategyId} for ${row.id}.`,
        );
        continue;
      }

      if (row.responsibilities !== null) {
        const responsibilityLabels = row.responsibilities
          .split(" + ")
          .map((label) => label.trim());
        const invalidResponsibilities = responsibilityLabels.filter(
          (label) => !ACCEPTANCE_RESPONSIBILITY_LABELS.includes(label),
        );
        if (invalidResponsibilities.length > 0) {
          errors.push(
            `${location} uses unsupported responsibilities ${invalidResponsibilities.join(", ")} for ${row.id}.`,
          );
        }
        if (!row.rationale) {
          errors.push(
            `${location} is missing a proof rationale for ${row.id}.`,
          );
        }
      }

      const expected = strategy?.expected ?? row.expected;
      const expectedLabels = expected.split(" + ").map((label) => label.trim());
      const invalidExpected = expectedLabels.filter(
        (label) => !ACCEPTANCE_COVERAGE_LABELS.includes(label),
      );
      if (invalidExpected.length > 0) {
        errors.push(
          `${location} uses unsupported expected coverage ${invalidExpected.join(", ")} for ${row.id}.`,
        );
        continue;
      }

      const currentLabels = acceptanceCoverageLabels(coverageById.get(row.id));
      const expectedCurrent =
        currentLabels.length > 0 ? currentLabels.join(" + ") : "None linked";
      if (row.current !== expectedCurrent) {
        errors.push(
          `${location} reports ${row.current} for ${row.id}; current representative coverage is ${expectedCurrent}.`,
        );
      }

      const hasExpectedCoverage = expectedLabels.every((label) =>
        currentLabels.includes(label),
      );
      const expectedStatus = hasExpectedCoverage
        ? "✅ Met"
        : currentLabels.length > 0
          ? "⚠️ Insufficient"
          : "❌ Missing";
      if (row.status !== expectedStatus) {
        errors.push(
          `${location} reports ${row.status} for ${row.id}; expected ${expectedStatus}.`,
        );
      }
    }

    for (const criterion of criteria.filter(
      (candidate) =>
        candidate.documentPath === document.path &&
        coveredStories.has(candidate.storyId),
    )) {
      if (!rowsById.has(criterion.id)) {
        errors.push(
          `${document.path} is missing a test-coverage row for ${criterion.id} under ${criterion.storyId}.`,
        );
      }
    }
  }

  return errors;
}

export function validateAcceptanceCriteriaTraceability({
  featureDocuments,
  testDocuments,
}) {
  const errors = [];
  const criteria = featureDocuments.flatMap(parseAcceptanceCriteria);
  const criteriaById = new Map();
  const criteriaByStory = new Map();

  for (const criterion of criteria) {
    const location = `${criterion.documentPath}:${criterion.line}`;
    if (!criterion.id) {
      errors.push(
        `${location} is missing an acceptance-criterion ID for ${criterion.storyId}.`,
      );
      continue;
    }

    const prefix = `AC-${criterion.storyId}-`;
    if (!criterion.id.startsWith(prefix)) {
      errors.push(
        `${location} uses ${criterion.id}, which does not belong to ${criterion.storyId}.`,
      );
      continue;
    }

    const known = criteriaById.get(criterion.id);
    if (known) {
      errors.push(
        `${location} duplicates ${criterion.id}, already used at ${known.documentPath}:${known.line}.`,
      );
      continue;
    }

    criteriaById.set(criterion.id, criterion);
    const storyCriteria = criteriaByStory.get(criterion.storyId) ?? [];
    storyCriteria.push(criterion);
    criteriaByStory.set(criterion.storyId, storyCriteria);
  }

  for (const [storyId, storyCriteria] of criteriaByStory) {
    const actual = storyCriteria
      .map((criterion) => Number(criterion.id.slice(`AC-${storyId}-`.length)))
      .sort((left, right) => left - right);
    const expected = Array.from(
      { length: storyCriteria.length },
      (_, index) => index + 1,
    );
    if (actual.some((value, index) => value !== expected[index])) {
      errors.push(
        `${storyId} must use each acceptance-criterion sequence from 01 through ${String(storyCriteria.length).padStart(2, "0")} exactly once; found ${actual.map((value) => String(value).padStart(2, "0")).join(", ")}.`,
      );
    }
  }

  const references = testDocuments.flatMap(acceptanceCriterionReferences);

  for (const comment of testDocuments.flatMap(singleIdCoverageComments)) {
    errors.push(
      `${comment.documentPath}:${comment.line} uses a Covers block for only ${comment.id}; put the ID in the representative test or suite title instead.`,
    );
  }

  for (const reference of references) {
    const criterion = criteriaById.get(reference.id);
    if (!criterion) {
      errors.push(
        `${reference.documentPath} references unknown acceptance criterion ${reference.id}.`,
      );
    } else if (!criterion.checked) {
      errors.push(
        `${reference.documentPath} references unchecked acceptance criterion ${reference.id} at ${criterion.documentPath}:${criterion.line}.`,
      );
    }
  }

  errors.push(
    ...validateAcceptanceCoverageRows({
      featureDocuments,
      criteria,
      references,
    }),
  );

  return { errors, criteria, references };
}
