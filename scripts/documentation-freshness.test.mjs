import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import {
  buildDocumentationOwners,
  implementationEvidenceRevisionFromMarkdown,
  isBehavioralSourcePath,
  nonBehavioralPathsFromDiffs,
  validateCurrentRepository,
  validateDocumentationFreshness
} from './lib/documentation-freshness.mjs'

const repositoryRoot = '/repository'
const evidenceRevision = '1234567890abcdef1234567890abcdef12345678'
const vestingDocument = {
  path: 'docs/features/vesting/README.md',
  content:
    '[Vesting view](../../../app/src/views/team/%5Bid%5D/VestingView.vue) and `contract/contracts/Vesting.sol:42`.'
}
const attestedVestingDocument = {
  ...vestingDocument,
  content: `${vestingDocument.content}\n\n**Implementation evidence reviewed against:** \`${evidenceRevision}\``
}

function git(repositoryRoot, args) {
  return execFileSync('git', args, { cwd: repositoryRoot, encoding: 'utf8' }).trim()
}

function commit(repositoryRoot, message) {
  git(repositoryRoot, ['add', '.'])
  git(repositoryRoot, ['-c', 'user.name=Documentation Test', '-c', 'user.email=test@example.com', 'commit', '-m', message])
  return git(repositoryRoot, ['rev-parse', 'HEAD'])
}

test('discovers file evidence from Markdown links and inline code', () => {
  const [owner] = buildDocumentationOwners([vestingDocument], repositoryRoot)

  assert.deepEqual(owner.sourcePaths, [
    'app/src/views/team/[id]/VestingView.vue',
    'contract/contracts/Vesting.sol'
  ])
  assert.equal(owner.implementationEvidenceRevision, null)
})

test('reads a full implementation-evidence revision', () => {
  assert.equal(implementationEvidenceRevisionFromMarkdown(attestedVestingDocument.content), evidenceRevision)
})

test('requires an implementation-evidence revision for every documented owner', () => {
  const errors = validateDocumentationFreshness({
    changedPaths: ['app/src/views/team/[id]/VestingView.vue'],
    documents: [vestingDocument],
    repositoryRoot
  })

  assert.deepEqual(errors, [
    'app/src/views/team/[id]/VestingView.vue is owned by docs/features/vesting/README.md, which has no "Implementation evidence reviewed against" revision; review the current source and attest a reachable full commit SHA.'
  ])
})

test('rejects an invalid implementation-evidence revision', () => {
  const errors = validateDocumentationFreshness({
    changedPaths: ['app/src/views/team/[id]/VestingView.vue'],
    documents: [
      {
        ...vestingDocument,
        content: `${vestingDocument.content}\n\n**Implementation evidence reviewed against:** \`not-a-full-sha\``
      }
    ],
    repositoryRoot
  })

  assert.deepEqual(errors, [
    'app/src/views/team/[id]/VestingView.vue is owned by docs/features/vesting/README.md, which has an invalid "Implementation evidence reviewed against" revision; review the current source and attest a reachable full commit SHA.'
  ])
})

test('rejects an unreachable implementation-evidence revision', () => {
  const errors = validateDocumentationFreshness({
    changedPaths: ['app/src/views/team/[id]/VestingView.vue'],
    documents: [attestedVestingDocument],
    repositoryRoot,
    implementationEvidenceRevisionStatus: () => 'unreachable'
  })

  assert.deepEqual(errors, [
    `app/src/views/team/[id]/VestingView.vue is owned by docs/features/vesting/README.md, whose "Implementation evidence reviewed against" revision ${evidenceRevision} does not resolve to a reachable commit; review the current source and refresh the attestation.`
  ])
})

test('rejects an implementation-evidence revision that predates the changed source', () => {
  const errors = validateDocumentationFreshness({
    changedPaths: ['app/src/views/team/[id]/VestingView.vue'],
    documents: [attestedVestingDocument],
    repositoryRoot,
    implementationEvidenceRevisionStatus: () => 'stale'
  })

  assert.deepEqual(errors, [
    `app/src/views/team/[id]/VestingView.vue is owned by docs/features/vesting/README.md, whose "Implementation evidence reviewed against" revision ${evidenceRevision} predates the changed source; review the current source and refresh the attestation.`
  ])
})

test('accepts a changed source when its implementation evidence was reviewed against it', () => {
  const errors = validateDocumentationFreshness({
    changedPaths: ['app/src/views/team/[id]/VestingView.vue'],
    documents: [attestedVestingDocument],
    repositoryRoot,
    implementationEvidenceRevisionStatus: () => 'current'
  })

  assert.deepEqual(errors, [])
})

test('compares implementation evidence against the declared Git revision and current worktree', () => {
  const temporaryRepository = mkdtempSync(join(tmpdir(), 'documentation-freshness-'))
  const sourcePath = 'app/src/views/VestingView.vue'
  const documentPath = 'docs/features/vesting/README.md'

  try {
    git(temporaryRepository, ['init', '--initial-branch=main'])
    mkdirSync(join(temporaryRepository, 'app/src/views'), { recursive: true })
    writeFileSync(join(temporaryRepository, sourcePath), '<template>Initial</template>\n')
    const initialSourceRevision = commit(temporaryRepository, 'feat: ✨ add vesting evidence')

    mkdirSync(join(temporaryRepository, 'docs/features/vesting'), { recursive: true })
    writeFileSync(
      join(temporaryRepository, documentPath),
      `[Vesting view](../../../${sourcePath})\n\n**Implementation evidence reviewed against:** \`${initialSourceRevision}\`\n`
    )
    const documentationBase = commit(temporaryRepository, 'docs: 📝 add vesting evidence')

    writeFileSync(join(temporaryRepository, sourcePath), '<template>Current</template>\n')
    const currentSourceRevision = commit(temporaryRepository, 'feat: ✨ update vesting evidence')

    assert.deepEqual(validateCurrentRepository(temporaryRepository, documentationBase).errors, [
      `${sourcePath} is owned by ${documentPath}, whose "Implementation evidence reviewed against" revision ${initialSourceRevision} predates the changed source; review the current source and refresh the attestation.`
    ])

    writeFileSync(
      join(temporaryRepository, documentPath),
      `[Vesting view](../../../${sourcePath})\n\n**Implementation evidence reviewed against:** \`${currentSourceRevision}\`\n`
    )

    assert.deepEqual(validateCurrentRepository(temporaryRepository, documentationBase).errors, [])
  } finally {
    rmSync(temporaryRepository, { recursive: true, force: true })
  }
})

test('rejects behavioral source paths without a documentation owner', () => {
  const errors = validateDocumentationFreshness({
    changedPaths: ['backend/src/controllers/newFeatureController.ts'],
    documents: [vestingDocument],
    repositoryRoot
  })

  assert.deepEqual(errors, [
    'backend/src/controllers/newFeatureController.ts has no canonical documentation owner; add it to the Implementation Evidence of the owning feature, contract, or implementation README.'
  ])
})

test('does not require documentation for test-only source changes', () => {
  assert.equal(isBehavioralSourcePath('app/src/views/__tests__/VestingView.spec.ts'), false)
})

test('does not treat co-located Markdown as behavioral source code', () => {
  assert.equal(isBehavioralSourcePath('app/src/queries/README.md'), false)
})

test('exempts pure relocations and their import-only consumers from documentation freshness', () => {
  const diffs = [
    `diff --git a/app/src/components/UserComponent.vue b/app/src/components/ui/UserComponent.vue
similarity index 100%
rename from app/src/components/UserComponent.vue
rename to app/src/components/ui/UserComponent.vue
diff --git a/app/src/components/TransactionRow.vue b/app/src/components/TransactionRow.vue
index 111111111..222222222 100644
--- a/app/src/components/TransactionRow.vue
+++ b/app/src/components/TransactionRow.vue
@@ -1 +1 @@
-import UserComponent from '@/components/UserComponent.vue'
+import UserComponent from '@/components/ui/UserComponent.vue'
diff --git a/app/src/components/NavBar.vue b/app/src/components/layout/NavBar.vue
similarity index 99%
rename from app/src/components/NavBar.vue
rename to app/src/components/layout/NavBar.vue
--- a/app/src/components/NavBar.vue
+++ b/app/src/components/layout/NavBar.vue
@@ -1 +1 @@
-<img src="../assets/Ethereum.png" />
+<img src="../../assets/Ethereum.png" />`
  ]

  assert.deepEqual(nonBehavioralPathsFromDiffs(diffs, repositoryRoot), [
    'app/src/components/TransactionRow.vue',
    'app/src/components/layout/NavBar.vue',
    'app/src/components/ui/UserComponent.vue'
  ])
})

test('exempts pure component renames and matching consumer identifiers', () => {
  const diffs = [
    `diff --git a/app/src/components/ui/UserComponent.vue b/app/src/components/ui/UserIdentity.vue
similarity index 100%
rename from app/src/components/ui/UserComponent.vue
rename to app/src/components/ui/UserIdentity.vue
diff --git a/app/src/components/TransactionRow.vue b/app/src/components/TransactionRow.vue
index 111111111..222222222 100644
--- a/app/src/components/TransactionRow.vue
+++ b/app/src/components/TransactionRow.vue
@@ -1,2 +1,2 @@
-import UserComponent from '@/components/ui/UserComponent.vue'
-<UserComponent :user="user" />
+import UserIdentity from '@/components/ui/UserIdentity.vue'
+<UserIdentity :user="user" />`
  ]

  assert.deepEqual(nonBehavioralPathsFromDiffs(diffs, repositoryRoot), [
    'app/src/components/TransactionRow.vue',
    'app/src/components/ui/UserIdentity.vue'
  ])
})

test('does not exempt a relocation that changes behaviour', () => {
  const diffs = [
    `diff --git a/app/src/components/UserComponent.vue b/app/src/components/ui/UserComponent.vue
similarity index 90%
rename from app/src/components/UserComponent.vue
rename to app/src/components/ui/UserComponent.vue
--- a/app/src/components/UserComponent.vue
+++ b/app/src/components/ui/UserComponent.vue
@@ -1 +1 @@
-const label = 'User'
+const label = 'Member'`
  ]

  assert.deepEqual(nonBehavioralPathsFromDiffs(diffs, repositoryRoot), [])
})

test('does not exempt a component rename that also changes behaviour', () => {
  const diffs = [
    `diff --git a/app/src/components/ui/UserComponent.vue b/app/src/components/ui/UserIdentity.vue
similarity index 90%
rename from app/src/components/ui/UserComponent.vue
rename to app/src/components/ui/UserIdentity.vue
--- a/app/src/components/ui/UserComponent.vue
+++ b/app/src/components/ui/UserIdentity.vue
@@ -1 +1 @@
-const label = 'User'
+const label = 'Member'`
  ]

  assert.deepEqual(nonBehavioralPathsFromDiffs(diffs, repositoryRoot), [])
})
