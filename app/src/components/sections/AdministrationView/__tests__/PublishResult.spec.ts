import { flushPromises, mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import PublishResult from '../PublishResult.vue'
import { mockElectionsWrites, mockToast } from '@/tests/mocks'
import { mockLog } from '@/tests/mocks/utils.mock'
import { useTeamStore } from '@/stores'

vi.mock('@/constant', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  USDC_ADDRESS: '0x0000000000000000000000000000000000000001',
  USDT_ADDRESS: '0x0000000000000000000000000000000000000002',
  USDC_E_ADDRESS: '0x0000000000000000000000000000000000000003',
  zeroAddress: '0x0000000000000000000000000000000000000000',
  ELECTIONS_BEACON_ADDRESS: '0x0000000000000000000000000000000000000003',
  ELECTIONS_IMPL_ADDRESS: '0x0000000000000000000000000000000000000004'
}))
describe('PublishResult.vue', () => {
  const publish = mockElectionsWrites.publishResults

  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(useTeamStore).mockImplementation(
      () =>
        ({
          currentTeam: {
            teamContracts: [
              { type: 'Elections', address: '0xELECTIONSADDRESS000000000000000000000' }
            ]
          },
          getContractAddressByType: (type: string) =>
            type === 'Elections' ? '0xELECTIONSADDRESS000000000000000000000' : undefined
        }) as ReturnType<typeof useTeamStore>
    )
  })

  it('hands the write straight to the shared layer when the button is clicked', async () => {
    const wrapper = mount(PublishResult, { props: { electionId: 42 } })

    await wrapper.find('[data-test="publish-results-button"]').trigger('click')
    await flushPromises()

    expect(publish.mutateAsync).toHaveBeenCalledWith({ args: [BigInt(42)] })
    expect(mockToast.add).toHaveBeenCalledWith({
      title: 'Election results published successfully!',
      color: 'success'
    })
  })

  it('runs the onError path without scheduling a mutation re-run', async () => {
    publish.mutateAsync.mockRejectedValueOnce(new Error('mutation failed'))
    const wrapper = mount(PublishResult, { props: { electionId: 3 } })

    await wrapper.find('[data-test="publish-results-button"]').trigger('click')
    await flushPromises()
    expect(mockLog.error).toHaveBeenCalled()
  })

  it('reflects mutation isPending on the button loading state', async () => {
    publish.isPending.value = true
    const wrapper = mount(PublishResult, { props: { electionId: 1 } })
    expect(wrapper.findComponent({ name: 'UButton' }).props('loading')).toBe(true)
  })

  it('[AC-US-EL-03-05] does not publish when the viewer is not authorized', async () => {
    const wrapper = mount(PublishResult, {
      props: { electionId: 5, disabled: true, disabledReason: 'Only the owner can publish' }
    })

    expect(wrapper.findComponent({ name: 'UTooltip' }).props('text')).toBe(
      'Only the owner can publish'
    )
    expect(wrapper.findComponent({ name: 'UButton' }).props('disabled')).toBe(true)

    await wrapper.find('[data-test="publish-results-button"]').trigger('click')
    await nextTick()

    expect(publish.mutateAsync).not.toHaveBeenCalled()
  })
})
