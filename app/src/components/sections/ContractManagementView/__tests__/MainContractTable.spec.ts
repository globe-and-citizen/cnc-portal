import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import type { Component } from 'vue'
import MainContractTable from '../MainContractTable.vue'
import { useBodIsMember } from '@/composables/bod/reads'
import { useGetBodActionsQuery } from '@/queries'
import * as utils from '@/utils'

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
  paused: false
}))

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
    props: { contracts: CONTRACTS, version: 'v1' },
    global: {
      stubs: {
        UAlert: { template: '<div><slot /></div>' },
        UCard: { template: '<div><slot /></div>' },
        UEmpty: { template: '<div />' },
        USelect: { template: '<select />' },
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

describe('MainContractTable.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(utils, 'getTeamContracts').mockResolvedValue(ENRICHED_CONTRACTS as never)
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
})
