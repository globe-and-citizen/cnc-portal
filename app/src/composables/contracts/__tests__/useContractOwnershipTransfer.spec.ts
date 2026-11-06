import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import { useContractOwnershipTransfer } from '../useContractOwnershipTransfer'
import { mockToast, mockBodAddAction, mockWagmiCore } from '@/tests/mocks'

describe('ownership transfer selection boundary', () => {
  let wrapper: VueWrapper
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('useToast', () => mockToast)
  })
  afterEach(() => {
    wrapper?.unmount()
    vi.unstubAllGlobals()
  })

  it('rejects a missing target before direct or Board submission', async () => {
    const Harness = defineComponent({
      setup() {
        const action = useContractOwnershipTransfer(ref(null), ref(false), vi.fn())
        return () =>
          h('div', [
            h(
              'button',
              {
                'data-test': 'request-transfer',
                onClick: () =>
                  action.transferOwnership('0x0000000000000000000000000000000000000001')
              },
              'Transfer'
            ),
            h('span', action.errorMessage.value)
          ])
      }
    })
    wrapper = mount(Harness)
    await wrapper.find('[data-test="request-transfer"]').trigger('click')
    expect(wrapper.text()).toContain('Select a contract before transferring ownership')
    expect(mockWagmiCore.writeContract).not.toHaveBeenCalled()
    expect(mockBodAddAction.mutate).not.toHaveBeenCalled()
  })
})
