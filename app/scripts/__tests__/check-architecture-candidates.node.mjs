import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  ARCHITECTURE_CANDIDATE_LIMITS,
  collectArchitectureCandidatesFromSources,
  compareBaselines,
  validateArchitectureCandidates
} from '../check-architecture-candidates.mjs'

const createBaseline = (exceptions = []) => ({
  version: 1,
  limits: ARCHITECTURE_CANDIDATE_LIMITS,
  exceptions
})

describe('architecture candidate ratchet', () => {
  it('reports a component that receives a bundle of callback props', () => {
    const candidates = collectArchitectureCandidatesFromSources([
      {
        path: 'src/components/ExampleComponent.vue',
        source: `<script setup lang="ts">
          interface Props {
            first: () => void
            second: () => void
            third: () => void
            fourth: () => void
          }
          defineProps<Props>()
        </script>`
      }
    ])

    assert.deepEqual(candidates, [
      {
        path: 'src/components/ExampleComponent.vue',
        subject: 'component',
        metric: 'componentFunctionProps',
        actual: 4
      }
    ])
  })

  it('reports a component that relays several props to a child unchanged', () => {
    const candidates = collectArchitectureCandidatesFromSources([
      {
        path: 'src/components/ExampleComponent.vue',
        source: `<template>
          <Child :first="first" :second="second" :third="third" :fourth="fourth" />
        </template>
        <script setup lang="ts">
          import Child from './Child.vue'
          interface Props {
            first: string
            second: string
            third: string
            fourth: string
          }
          defineProps<Props>()
        </script>`
      }
    ])

    assert.deepEqual(candidates, [
      {
        path: 'src/components/ExampleComponent.vue',
        subject: 'component',
        metric: 'componentForwardedProps',
        actual: 4
      }
    ])
  })

  it('reports a single-consumer composable that orchestrates several hooks', () => {
    const candidates = collectArchitectureCandidatesFromSources([
      {
        path: 'src/composables/useExample.ts',
        source: `export function useExample() {
          const first = useFirst()
          const second = useSecond()
          return { one, two, three, four }
        }`
      },
      {
        path: 'src/components/ExampleComponent.vue',
        source: '<script setup>useExample()</script>'
      }
    ])

    assert.deepEqual(candidates, [
      {
        path: 'src/composables/useExample.ts',
        subject: 'useExample',
        metric: 'singleConsumerComposableNestedCalls',
        actual: 2,
        consumerCount: 1,
        returnMemberCount: 4
      }
    ])
  })

  it('does not report a composable used by more than one production consumer', () => {
    const candidates = collectArchitectureCandidatesFromSources([
      {
        path: 'src/composables/useExample.ts',
        source: `export function useExample() {
          const first = useFirst()
          const second = useSecond()
          return { one, two, three, four }
        }`
      },
      { path: 'src/components/FirstComponent.vue', source: '<script setup>useExample()</script>' },
      { path: 'src/components/SecondComponent.vue', source: '<script setup>useExample()</script>' }
    ])

    assert.deepEqual(candidates, [])
  })

  it('rejects a new candidate and removes stale baseline entries', () => {
    const candidate = {
      path: 'src/components/ExampleComponent.vue',
      subject: 'component',
      metric: 'componentFunctionProps',
      actual: 4
    }

    assert.equal(
      validateArchitectureCandidates([candidate], createBaseline())[0]?.message,
      'new architecture candidate: review or refactor it'
    )

    assert.match(
      validateArchitectureCandidates([], createBaseline([{ ...candidate, allowed: 4 }]))[0]
        ?.message ?? '',
      /stale baseline exception/
    )
  })

  it('rejects a baseline that adds new candidate allowances', () => {
    const reference = createBaseline([
      {
        path: 'src/components/ExistingComponent.vue',
        subject: 'component',
        metric: 'componentFunctionProps',
        allowed: 4
      }
    ])
    const candidate = createBaseline([
      ...reference.exceptions,
      {
        path: 'src/composables/useExample.ts',
        subject: 'useExample',
        metric: 'singleConsumerComposableNestedCalls',
        allowed: 2
      }
    ])

    assert.deepEqual(compareBaselines(reference, candidate), [
      'new baseline exception: src/composables/useExample.ts:useExample:singleConsumerComposableNestedCalls'
    ])
  })
})
