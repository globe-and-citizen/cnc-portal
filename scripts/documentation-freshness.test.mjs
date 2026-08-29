import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildDocumentationOwners,
  isBehavioralSourcePath,
  nonBehavioralPathsFromDiffs,
  validateDocumentationFreshness
} from './lib/documentation-freshness.mjs'

const repositoryRoot = '/repository'
const vestingDocument = {
  path: 'docs/features/vesting/README.md',
  content:
    '[Vesting view](../../../app/src/views/team/%5Bid%5D/VestingView.vue) and `contract/contracts/Vesting.sol:42`.'
}

test('discovers file evidence from Markdown links and inline code', () => {
  const [owner] = buildDocumentationOwners([vestingDocument], repositoryRoot)

  assert.deepEqual(owner.sourcePaths, [
    'app/src/views/team/[id]/VestingView.vue',
    'contract/contracts/Vesting.sol'
  ])
})

test('requires every documented owner to change with its behavioral source', () => {
  const errors = validateDocumentationFreshness({
    changedPaths: ['app/src/views/team/[id]/VestingView.vue'],
    documents: [vestingDocument],
    repositoryRoot
  })

  assert.deepEqual(errors, [
    'app/src/views/team/[id]/VestingView.vue is owned by docs/features/vesting/README.md, which was not updated; review and update that document in this change.'
  ])
})

test('accepts a source change when its canonical document changes in the same PR', () => {
  const errors = validateDocumentationFreshness({
    changedPaths: [
      'app/src/views/team/[id]/VestingView.vue',
      'docs/features/vesting/README.md'
    ],
    documents: [vestingDocument],
    repositoryRoot
  })

  assert.deepEqual(errors, [])
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
