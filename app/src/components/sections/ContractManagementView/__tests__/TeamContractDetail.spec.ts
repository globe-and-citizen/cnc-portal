import { mount, flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import TeamContractsDetail from '../TeamContractsDetail.vue'
import type { CampaignManagerSettings } from '@/composables/campaign/reads'
import { createContractWriteV3Mock } from '@/tests/mocks/erc20.mock'
import { mockToast } from '@/tests/mocks'

const click = createContractWriteV3Mock()
const impression = createContractWriteV3Mock()
vi.mock('@/composables/contracts/useContractWritesV3', () => ({
  useContractWritesV3: vi.fn(({ functionName }: { functionName: string }) =>
    functionName === 'setCostPerClick' ? click : impression
  )
}))
const settings: CampaignManagerSettings = {
  costPerClick: '0.1',
  costPerImpression: '0.5',
  bankAddress: '0x1111111111111111111111111111111111111111'
}
const contractAddress = '0xE55978c9f7B9bFc190B355d65e7F1dEc2F41D320'
type SuccessOptions = { onSuccess?: () => void }

function mountForm(values = settings) {
  return mount(TeamContractsDetail, { props: { settings: { ...values }, contractAddress } })
}

describe('[US-CONTRACT-003] Campaign Manager rate draft', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    click.mutate.mockReset()
    impression.mutate.mockReset()
    click.error.value = impression.error.value = null
    click.isPending.value = impression.isPending.value = false
  })

  it('renders both rates and the unchanged Bank destination with Save disabled', () => {
    const wrapper = mountForm()
    expect(wrapper.get('[data-test="manager-cost-per-click"]').element).toHaveProperty(
      'value',
      '0.1'
    )
    expect(wrapper.get('[data-test="manager-cost-per-impression"]').element).toHaveProperty(
      'value',
      '0.5'
    )
    expect(wrapper.getComponent({ name: 'AddressTooltip' }).props('address')).toBe(
      settings.bankAddress
    )
    expect(wrapper.get('[data-test="campaign-rate-save"]').attributes('disabled')).toBeDefined()
  })

  it('edits a local draft without mutating the query settings or relaying a parent update', async () => {
    const wrapper = mountForm(settings)
    await wrapper.get('[data-test="manager-cost-per-click"]').setValue('0.2')
    expect(wrapper.get('[data-test="manager-cost-per-click"]').element).toHaveProperty(
      'value',
      '0.2'
    )
    expect(wrapper.props('settings')).toEqual(settings)
    expect(wrapper.emitted('update:datas')).toBeUndefined()
    expect(wrapper.get('[data-test="campaign-rate-save"]').attributes('disabled')).toBeUndefined()
  })

  it('normalizes negative input and disables Save after restoring the confirmed rate', async () => {
    const wrapper = mountForm()
    await wrapper.get('[data-test="manager-cost-per-click"]').setValue('-0.2')
    expect(wrapper.get('[data-test="manager-cost-per-click"]').element).toHaveProperty(
      'value',
      '0.2'
    )
    await wrapper.get('[data-test="manager-cost-per-click"]').setValue('0.1')
    expect(wrapper.get('[data-test="campaign-rate-save"]').attributes('disabled')).toBeDefined()
  })

  it.each([
    ['click', 'manager-cost-per-click', 'Cost per click should be greater than 0'],
    ['impression', 'manager-cost-per-impression', 'Cost per impression should be greater than 0']
  ])('rejects a changed zero %s rate before either write', async (_kind, field, title) => {
    const wrapper = mountForm()
    await wrapper.get(`[data-test="${field}"]`).setValue('0')
    await wrapper.get('[data-test="campaign-rate-save"]').trigger('click')
    expect(click.mutate).not.toHaveBeenCalled()
    expect(impression.mutate).not.toHaveBeenCalled()
    expect(mockToast.add).toHaveBeenCalledWith({ title, color: 'error' })
  })

  it('submits both changed rates in exact 18-decimal base units and waits for both confirmations', async () => {
    const wrapper = mountForm()
    await wrapper.get('[data-test="manager-cost-per-click"]').setValue('0.2')
    await wrapper.get('[data-test="manager-cost-per-impression"]').setValue('0.7')
    await wrapper.get('[data-test="campaign-rate-save"]').trigger('click')
    expect(click.mutate).toHaveBeenCalledWith({ args: [200000000000000000n] }, expect.anything())
    expect(impression.mutate).toHaveBeenCalledWith(
      { args: [700000000000000000n] },
      expect.anything()
    )
    const clickOptions = click.mutate.mock.calls[0]![1] as SuccessOptions
    const impressionOptions = impression.mutate.mock.calls[0]![1] as SuccessOptions
    clickOptions.onSuccess?.()
    await flushPromises()
    expect(wrapper.emitted('closeContractDataDialog')).toBeUndefined()
    impressionOptions.onSuccess?.()
    await flushPromises()
    expect(wrapper.emitted('closeContractDataDialog')).toHaveLength(1)
    expect(wrapper.get('[data-test="campaign-rate-save"]').attributes('disabled')).toBeDefined()
  })

  it('retries only the unsaved rate after the other field succeeds', async () => {
    const wrapper = mountForm()
    await wrapper.get('[data-test="manager-cost-per-click"]').setValue('0.2')
    await wrapper.get('[data-test="manager-cost-per-impression"]').setValue('0.7')
    await wrapper.get('[data-test="campaign-rate-save"]').trigger('click')
    ;(click.mutate.mock.calls[0]![1] as SuccessOptions).onSuccess?.()
    impression.error.value = new Error('reverted')
    await flushPromises()
    expect(mockToast.add).toHaveBeenCalledWith({
      title: 'Set cost per impression failed',
      color: 'error'
    })
    expect(wrapper.emitted('closeContractDataDialog')).toBeUndefined()
    await wrapper.get('[data-test="campaign-rate-save"]').trigger('click')
    expect(click.mutate).toHaveBeenCalledTimes(1)
    expect(impression.mutate).toHaveBeenCalledTimes(2)
    ;(impression.mutate.mock.calls[1]![1] as SuccessOptions).onSuccess?.()
    await flushPromises()
    expect(wrapper.emitted('closeContractDataDialog')).toHaveLength(1)
  })

  it('does not overwrite an in-progress draft or baseline during a settings refetch', async () => {
    const wrapper = mountForm()
    await wrapper.get('[data-test="manager-cost-per-click"]').setValue('0.2')
    await wrapper.setProps({ settings: { ...settings, costPerClick: '0.3' } })
    expect(wrapper.get('[data-test="manager-cost-per-click"]').element).toHaveProperty(
      'value',
      '0.2'
    )
    expect(wrapper.get('[data-test="campaign-rate-save"]').attributes('disabled')).toBeUndefined()
  })

  it('disables submission while either write is pending', async () => {
    const wrapper = mountForm()
    await wrapper.get('[data-test="manager-cost-per-click"]').setValue('0.2')
    impression.isPending.value = true
    await flushPromises()
    expect(wrapper.get('[data-test="campaign-rate-save"]').attributes('disabled')).toBeDefined()
    expect(click.mutate).not.toHaveBeenCalled()
  })

  it('reports a click failure without claiming confirmation', async () => {
    const wrapper = mountForm()
    click.error.value = new Error('reverted')
    await flushPromises()
    expect(mockToast.add).toHaveBeenCalledWith({
      title: 'Set cost per click failed',
      color: 'error'
    })
    expect(wrapper.emitted('closeContractDataDialog')).toBeUndefined()
  })
})
