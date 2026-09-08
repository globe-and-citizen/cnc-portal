import { defineComponent, h, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

const { accounting, mockUseCNCAccounting } = vi.hoisted(() => {
  const accounting = {
    journal: { value: [] },
    status: {
      isLoading: { value: false },
      error: { value: null },
      reconciliationGaps: { value: [] }
    },
    refetch: vi.fn()
  }
  return {
    accounting,
    mockUseCNCAccounting: vi.fn(() => accounting)
  }
})

vi.mock('../useCNCAccounting', () => ({ useCNCAccounting: mockUseCNCAccounting }))

import { provideAccounting, useAccountingContext } from '../useAccountingContext'

describe('useAccountingContext', () => {
  it('shares one Accounting read model with every descendant', () => {
    const teamId = ref('team-a')
    let firstContext: ReturnType<typeof useAccountingContext> | undefined
    let secondContext: ReturnType<typeof useAccountingContext> | undefined

    const Consumer = defineComponent({
      props: { position: { type: Number, required: true } },
      setup(props) {
        const context = useAccountingContext()
        if (props.position === 1) firstContext = context
        else secondContext = context
        return () => h('div')
      }
    })
    const Provider = defineComponent({
      setup() {
        provideAccounting(() => teamId.value)
        return () => h('div', [h(Consumer, { position: 1 }), h(Consumer, { position: 2 })])
      }
    })

    mount(Provider)

    expect(mockUseCNCAccounting).toHaveBeenCalledTimes(1)
    expect(firstContext).toBe(accounting)
    expect(secondContext).toBe(accounting)
    const teamIdSource = mockUseCNCAccounting.mock.calls[0]?.[0] as () => string
    expect(teamIdSource()).toBe('team-a')
    teamId.value = 'team-b'
    expect(teamIdSource()).toBe('team-b')
  })

  it('fails explicitly outside the Accounting route provider', () => {
    const Consumer = defineComponent({
      setup() {
        useAccountingContext()
        return () => h('div')
      }
    })

    expect(() => mount(Consumer)).toThrowError(
      'useAccountingContext must be used within the Accounting route'
    )
  })
})
