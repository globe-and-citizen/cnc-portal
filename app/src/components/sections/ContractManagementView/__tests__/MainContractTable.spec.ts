import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import type { Component } from 'vue'
import { useBodIsMember } from '@/composables/bod/reads'
import { useGetBodActionsQuery } from '@/queries'
import * as contractReads from '@/composables/contracts/readTeamContracts'

vi.mock('@nuxt/ui/components/Select.vue', async () => ({
  default: (await import('@/tests/stubs/nuxt-ui.stubs')).USelectStub
}))

import MainContractTable from '../MainContractTable.vue'

const CONTRACTS = [
  { address: '0x0000000000000000000000000000000000000001', type: 'Bank', deployer: '0xDeployer' },
  {
    address: '0x0000000000000000000000000000000000000002',
    type: 'ExpenseAccountEIP712',
    deployer: '0xDeployer'
  }
]

const ENRICHED_CONTRACTS = CONTRACTS.map((contract) => ({
  ...contract,
  abi: [],
  owner: '0xOwner',
  pauseStatus: 'active' as const,
  pauseCapability: {
    support: 'operations' as const,
    scope: 'Protected operations.',
    selectors: { status: 'paused' as const, pause: 'pause' as const, resume: 'unpause' as const }
  }
}))

const CAPABILITY_CONTRACTS = [
  ENRICHED_CONTRACTS[0]!,
  { ...ENRICHED_CONTRACTS[1]!, pauseStatus: 'paused' as const },
  {
    ...ENRICHED_CONTRACTS[0]!,
    address: '0x0000000000000000000000000000000000000003',
    type: 'Proposals',
    pauseStatus: 'not-supported' as const,
    pauseCapability: { support: 'none' as const, scope: 'No usable pause lifecycle.' }
  },
  {
    ...ENRICHED_CONTRACTS[0]!,
    address: '0x0000000000000000000000000000000000000004',
    type: 'UnknownContract',
    pauseStatus: 'unavailable' as const,
    pauseCapability: undefined
  }
]

const TableStub = {
  name: 'UTable',
  props: ['data'],
  template: `
    <div data-test="desktop-contract-table">
      <template v-for="row in data" :key="row.address">
        <slot name="actions-cell" :row="{ original: row }" />
      </template>
    </div>
  `
}

const ActionMenuStub = {
  name: 'MainContractActionMenu',
  props: ['row'],
  emits: ['view-details'],
  template:
    '<button data-test="contract-action-trigger" @click="$emit(\'view-details\')">{{ row.address }}</button>'
}

const ActionControllerStub = {
  name: 'MainContractActions',
  props: ['row', 'open', 'pendingActions', 'isBodAction', 'statusChangeRequest'],
  template:
    '<div data-test="contract-action-controller">{{ row?.address || \'none\' }} {{ open }}</div>'
}

function mountComponent() {
  return mount(MainContractTable, {
    props: { contracts: CONTRACTS, version: '2.0.1' },
    global: {
      stubs: {
        UAlert: { template: '<div><slot /></div>' },
        UCard: { template: '<div><slot /></div>' },
        UEmpty: { template: '<div />' },
        UTable: TableStub as Component,
        AddressTooltip: { template: '<span />' },
        UserIdentity: { template: '<span />' },
        MainContractBalanceCell: { template: '<span />' },
        MainContractActionMenu: ActionMenuStub as Component,
        MainContractActions: ActionControllerStub as Component
      }
    }
  })
}

describe('[US-CONTRACT-001][US-CONTRACT-002] MainContractTable.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(contractReads, 'getTeamContracts').mockResolvedValue(ENRICHED_CONTRACTS as never)
  })

  it('uses one Board-action query and one selected-contract controller for both responsive triggers', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    expect(vi.mocked(useGetBodActionsQuery)).toHaveBeenCalledTimes(1)
    expect(vi.mocked(useBodIsMember)).toHaveBeenCalledTimes(1)
    expect(wrapper.findAll('[data-test="contract-action-controller"]')).toHaveLength(1)
    expect(wrapper.findAll('[data-test="contract-action-trigger"]')).toHaveLength(4)

    const triggers = wrapper.findAll('[data-test="contract-action-trigger"]')
    await triggers[0]!.trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.getComponent(ActionControllerStub).props()).toMatchObject({
      row: expect.objectContaining({ address: CONTRACTS[0]!.address }),
      open: 'details'
    })

    await triggers[3]!.trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.getComponent(ActionControllerStub).props()).toMatchObject({
      row: expect.objectContaining({ address: CONTRACTS[1]!.address }),
      open: 'details'
    })
  })

  it('[AC-US-CONTRACT-001-02] filters only contracts with verified active or paused states', async () => {
    vi.spyOn(contractReads, 'getTeamContracts').mockResolvedValueOnce(CAPABILITY_CONTRACTS as never)
    const wrapper = mountComponent()
    await flushPromises()

    const statusSelect = wrapper.getComponent({ name: 'USelect' })
    const desktopTable = wrapper.getComponent({ name: 'MainContractDesktopTable' })
    expect(desktopTable.props('rows')).toHaveLength(4)
    statusSelect.vm.$emit('update:modelValue', 'active')
    await wrapper.vm.$nextTick()
    expect(
      desktopTable
        .props('rows')
        .map((row: { contract: { pauseStatus: string } }) => row.contract.pauseStatus)
    ).toEqual(['active'])
    statusSelect.vm.$emit('update:modelValue', 'paused')
    await wrapper.vm.$nextTick()
    expect(
      desktopTable
        .props('rows')
        .map((row: { contract: { pauseStatus: string } }) => row.contract.pauseStatus)
    ).toEqual(['paused'])
  })
})
