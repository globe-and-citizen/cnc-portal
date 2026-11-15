import { computed, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveFeeCollector } from '~/artifacts/feeCollectorRegistry'
import { useFeeCollectorVersion } from '~/composables/FeeCollector/useFeeCollectorVersion'
import { isFeeCollectorOwner, useFeeBalance, useFeeCollectorBeneficiary, useFeeConfigs, useFeeSupportedTokens, useFeeTokenBalance } from '~/composables/FeeCollector/read'
import { useAddTokenSupport, useRemoveTokenSupport, useSetFee, useSetFeeBeneficiary, useTransferOwnership, useWithdrawAll } from '~/composables/FeeCollector/writes'
import MicropaymentsPage from '~/pages/micropayments.vue'

const mocks = vi.hoisted(() => ({ reads: [] as Array<Record<string, unknown>>, writes: [] as Array<Record<string, unknown>>, wallet: { value: '' }, owner: { value: '' }, mounts: 0 }))
vi.mock('@wagmi/vue', () => ({
  useConnection: () => ({ address: mocks.wallet }),
  useReadContract: (config: Record<string, unknown>) => {
    mocks.reads.push(config)
    return { data: config.functionName === 'owner' ? mocks.owner : ref(undefined), isLoading: ref(false), error: ref(null) }
  }
}))
vi.mock('~/composables/useContractWritesV3', () => ({
  useContractWritesV3: (config: Record<string, unknown>) => {
    mocks.writes.push(config)
    return { config }
  }
}))
vi.mock('~/components/sections/FeeCollectorView/FeeCollectorManagedPanel.vue', () => ({
  default: { name: 'ManagedPanel', setup: () => { mocks.mounts++ }, template: '<div data-panel="managed">Managed</div>' }
}))
vi.mock('~/components/sections/FeeCollectorView/legacy/FeeCollectorPanelV0.vue', () => ({
  default: { template: '<div data-panel="v0">V0</div>' }
}))
vi.mock('~/components/sections/FeeCollectorView/legacy/FeeCollectorPanelV01.vue', () => ({
  default: { template: '<div data-panel="v01">V0.1</div>' }
}))

const address = '0x1111111111111111111111111111111111111111'
const token = '0x2222222222222222222222222222222222222222'
const { selectedVersion } = useFeeCollectorVersion()

beforeEach(() => {
  mocks.mounts = 0
  mocks.reads.length = 0
  mocks.writes.length = 0
  mocks.owner.value = address
  mocks.wallet.value = address
  selectedVersion.value = 'V2'
  vi.stubGlobal('definePageMeta', vi.fn())
  vi.stubGlobal('useHead', vi.fn())
  vi.stubGlobal('computed', computed)
})

describe('version-bound FeeCollector management', () => {
  it.each(['V1', 'V2'] as const)('binds every read and write to %s, including its beneficiary getter', (version) => {
    selectedVersion.value = version
    useFeeBalance()
    useFeeCollectorBeneficiary()
    useFeeConfigs()
    useFeeSupportedTokens()
    useFeeTokenBalance(token)
    expect(isFeeCollectorOwner().value).toBe(true)
    useSetFee()
    useWithdrawAll()
    useSetFeeBeneficiary()
    useTransferOwnership()
    useAddTokenSupport()
    useRemoveTokenSupport()
    const deployment = resolveFeeCollector(version)
    expect(mocks.reads.every(read => read.address === deployment.address && read.abi === deployment.abi)).toBe(true)
    expect(mocks.writes.every(write => write.contractAddress === deployment.address && write.abi === deployment.abi)).toBe(true)
    expect(mocks.reads.map(read => read.functionName)).toContain(version === 'V2' ? 'getFeeBeneficiary' : 'feeBeneficiary')
    expect(mocks.writes.map(write => write.functionName)).toEqual([
      'setFee', 'withdraw', 'setFeeBeneficiary', 'transferOwnership', 'addTokenSupport', 'removeTokenSupport'
    ])
  })

  it('does not grant ownership to a different wallet', () => {
    mocks.wallet.value = token
    expect(isFeeCollectorOwner().value).toBe(false)
  })

  it('captures the original write target when the selection later changes', () => {
    selectedVersion.value = 'V1'
    useSetFee()
    selectedVersion.value = 'V2'
    useSetFee()
    expect(mocks.writes.map(write => write.contractAddress)).toEqual([
      resolveFeeCollector('V1').address,
      resolveFeeCollector('V2').address
    ])
  })

  it('rejects use of the shared management composables for legacy versions', () => {
    selectedVersion.value = 'V0'
    expect(() => useSetFee()).toThrow('requires V1 or V2')
  })

  it('renders V2 by default and switches to the correct legacy and managed panels', async () => {
    const wrapper = mount(MicropaymentsPage, { global: { stubs: { USelect: { template: '<div />' } } } })
    expect(wrapper.find('[data-panel="managed"]').exists()).toBe(true)
    selectedVersion.value = 'V0'
    await nextTick()
    expect(wrapper.find('[data-panel="v0"]').exists()).toBe(true)
    selectedVersion.value = 'V0.1'
    await nextTick()
    expect(wrapper.find('[data-panel="v01"]').exists()).toBe(true)
    selectedVersion.value = 'V1'
    await nextTick()
    expect(wrapper.find('[data-panel="managed"]').exists()).toBe(true)
    const oldMounts = mocks.mounts
    selectedVersion.value = 'V2'
    await nextTick()
    expect(mocks.mounts).toBe(oldMounts + 1)
    wrapper.unmount()
  })
})
