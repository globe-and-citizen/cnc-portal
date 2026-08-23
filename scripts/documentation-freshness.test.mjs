import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildDocumentationOwners,
  isBehavioralSourcePath,
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
