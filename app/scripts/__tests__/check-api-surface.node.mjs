import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  API_SURFACE_LIMITS,
  collectSourceMetrics,
  compareBaselines,
  validateMetrics
} from '../check-api-surface.mjs'

const createBaseline = (exceptions = []) => ({
  version: 1,
  limits: API_SURFACE_LIMITS,
  exceptions
})

describe('client API surface ratchet', () => {
  it('measures component props and exposed members', () => {
    const metrics = collectSourceMetrics(
      `<script setup lang="ts">
        interface Props {
          one: string
          two: string
          three: string
          four: string
          five: string
          six: string
          seven: string
          eight: string
        }
        defineProps<Props>()
        defineExpose({ reset, focus })
      </script>`,
      'src/components/ExampleComponent.vue'
    )

    assert.ok(metrics.some((metric) => metric.metric === 'componentProps' && metric.actual === 8))
    assert.ok(
      metrics.some((metric) => metric.metric === 'componentExposedMembers' && metric.actual === 2)
    )
  })

  it('measures composable inputs through an options interface and returned members', () => {
    const metrics = collectSourceMetrics(
      `interface Options {
        one: string
        two: string
        three: string
        four: string
        five: string
      }
      export function useExample(options: Options) {
        return { one, two, three, four, five, six, seven, eight, nine }
      }`,
      'src/composables/useExample.ts'
    )

    assert.ok(
      metrics.some(
        (metric) =>
          metric.subject === 'useExample' &&
          metric.metric === 'composableDependencies' &&
          metric.actual === 5
      )
    )
    assert.ok(
      metrics.some(
        (metric) =>
          metric.subject === 'useExample' &&
          metric.metric === 'composableReturnMembers' &&
          metric.actual === 9
      )
    )
  })

  it('rejects new violations and stale exceptions', () => {
    const metrics = [
      {
        path: 'src/composables/useExample.ts',
        subject: 'useExample',
        metric: 'composableReturnMembers',
        actual: 9
      }
    ]

    assert.equal(
      validateMetrics(metrics, createBaseline())[0]?.message,
      'new violation: 9 exceeds the limit of 8'
    )

    assert.match(
      validateMetrics(
        [{ ...metrics[0], actual: 8 }],
        createBaseline([
          {
            path: 'src/composables/useExample.ts',
            subject: 'useExample',
            metric: 'composableReturnMembers',
            allowed: 9
          }
        ])
      )[0]?.message ?? '',
      /stale baseline exception/
    )
  })

  it('allows a documented exception without expanding the baseline', () => {
    const metrics = collectSourceMetrics(
      `// @api-surface-exception composableReturnMembers: Stable adapter boundary tracked in #123.
      export function useExample() {
        return { one, two, three, four, five, six, seven, eight, nine }
      }`,
      'src/composables/useExample.ts'
    )

    assert.deepEqual(validateMetrics(metrics, createBaseline()), [])
  })

  it('requires an issue reference for an exception annotation', () => {
    const metrics = collectSourceMetrics(
      `// @api-surface-exception composableReturnMembers: Stable adapter boundary.
      export function useExample() {
        return { one, two, three, four, five, six, seven, eight, nine }
      }`,
      'src/composables/useExample.ts'
    )

    assert.match(
      validateMetrics(metrics, createBaseline())[0]?.message ?? '',
      /invalid exception: link its tracking issue/
    )
  })

  it('rejects a growing baseline', () => {
    const reference = createBaseline([
      {
        path: 'src/composables/useExample.ts',
        subject: 'useExample',
        metric: 'composableReturnMembers',
        allowed: 9
      }
    ])
    const candidate = createBaseline([
      {
        path: 'src/composables/useExample.ts',
        subject: 'useExample',
        metric: 'composableReturnMembers',
        allowed: 10
      },
      {
        path: 'src/components/ExampleComponent.vue',
        subject: 'component',
        metric: 'componentProps',
        allowed: 8
      }
    ])

    assert.deepEqual(compareBaselines(reference, candidate), [
      'baseline allowance increased for src/composables/useExample.ts:useExample:composableReturnMembers: 9 to 10',
      'new baseline exception: src/components/ExampleComponent.vue:component:componentProps'
    ])
  })
})
