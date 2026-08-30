import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import reviewContract from "./lib/ui-ux-review-contract.cjs";

const { canonicalStoryIdsFrom, validateUiUxReview } = reviewContract;

const canonicalStoryIds = ["US-COMPANIES-001", "US-COMPANIES-005"];
const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function journeyBody({ storyId = "US-COMPANIES-001", rows } = {}) {
  return `## UI/UX Reviewer Journey

- [ ] \`none\`
- [ ] \`visual\`
- [x] \`journey\`

### Visual review

**Surface / entry point:** <route, modal, or product surface>
**Review scope:** <viewports, keyboard path, or assistive interaction to review>
**Expected result:** <what the reviewer should observe>
**Evidence:** <screenshots, recording, or repeatable manual check>

### Journey review

**Canonical stories / use cases:** \`${storyId}\`
**Entry point:** \`/companies/new\`
**Prerequisites:** Two test accounts are available.
**Actors:** Company owner A → company member B
**Evidence:** A short recording and an automated test.

| Step | Actor | Action | Expected result |
| --- | --- | --- | --- |
${rows === undefined ? "| 1 | Company owner A | Create a company | Member B can open the company with the assigned role. |" : rows}
`;
}

test("accepts a complete multi-actor reviewer journey", () => {
  const result = validateUiUxReview({
    body: journeyBody(),
    changedFiles: ["app/src/views/team/[id]/MembersView.vue"],
    canonicalStoryIds,
  });

  assert.deepEqual(result.errors, []);
  assert.equal(result.impact, "journey");
  assert.deepEqual(result.storyIds, ["US-COMPANIES-001"]);
});

test("discovers canonical user-story identifiers from feature documentation", () => {
  const discoveredStoryIds = canonicalStoryIdsFrom(
    path.join(repositoryRoot, "docs", "features"),
  );

  assert.ok(discoveredStoryIds.has("US-COMPANIES-001"));
});

test("rejects a journey without a usable action table", () => {
  const result = validateUiUxReview({
    body: journeyBody({ rows: "" }),
    canonicalStoryIds,
  });

  assert.deepEqual(result.errors, [
    "Add at least one `Step | Actor | Action | Expected result` row to the reviewer journey.",
  ]);
});

test("rejects a journey that references an unknown canonical story", () => {
  const result = validateUiUxReview({
    body: journeyBody({ storyId: "US-COMPANIES-999" }),
    canonicalStoryIds,
  });

  assert.ok(
    result.errors.includes(
      "Unknown canonical user story identifier(s): `US-COMPANIES-999`.",
    ),
  );
});

test("requires the visual-review fields for a visual change", () => {
  const result = validateUiUxReview({
    body: `## UI/UX Reviewer Journey

- [ ] \`none\`
- [x] \`visual\`
- [ ] \`journey\`

### Visual review

**Surface / entry point:** \`/companies\`
**Review scope:** <desktop and mobile viewports>
**Expected result:** <what the reviewer should observe>
**Evidence:** <screenshots or a recording>
`,
    canonicalStoryIds,
  });

  assert.deepEqual(result.errors, [
    "Add a meaningful **Review scope:** value for the visual review.",
    "Add a meaningful **Expected result:** value for the visual review.",
    "Add a meaningful **Evidence:** value for the visual review.",
  ]);
});

test("warns when likely UI paths are declared as having no impact", () => {
  const result = validateUiUxReview({
    body: `## UI/UX Reviewer Journey

- [x] \`none\`
- [ ] \`visual\`
- [ ] \`journey\`
`,
    changedFiles: [
      "app/src/components/forms/AddMemberForm.vue",
      "app/src/components/forms/__tests__/AddMemberForm.spec.ts",
    ],
    canonicalStoryIds,
  });

  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, [
    "UI/UX impact is `none` but likely UI files changed: `app/src/components/forms/AddMemberForm.vue`. Confirm the classification during review.",
  ]);
});
