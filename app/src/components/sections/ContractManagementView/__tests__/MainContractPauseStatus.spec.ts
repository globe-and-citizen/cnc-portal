import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { Component } from 'vue'
import MainContractDesktopTable from '../MainContractDesktopTable.vue'
import MainContractMobileCard from '../MainContractMobileCard.vue'
import type { ContractPauseStatus } from '@/utils/contracts/pauseCapabilities'
import type { ContractTableRow } from '../MainContractTable.types'

const STATUSES: ContractPauseStatus[] = ['active', 'paused', 'not-supported', 'unavailable']

const rows: ContractTableRow[] = STATUSES.map((pauseStatus, index) => ({
  contract: {
    address: `0x000000000000000000000000000000000000000${index + 1}`,
    type: 'Bank',
    deployer: '0x0000000000000000000000000000000000000011',
    owner: '0x0000000000000000000000000000000000000021',
    pauseStatus,
    abi: []
  },
  owner: {
    address: '0x0000000000000000000000000000000000000021',
    name: 'Owner'
  },
  holdsValue: false
}))

const TableStub = {
  name: 'UTable',
  props: ['data'],
  template: `
    <div>
      <div v-for="row in data" :key="row.contract.address">
        <slot name="status-cell" :row="{ original: row }" />
      </div>
    </div>
  `
}

const globalStubs = {
  UTable: TableStub as Component,
  AddressTooltip: { template: '<span />' },
  UserIdentity: { template: '<span />' },
  MainContractBalanceCell: { template: '<span />' },
  MainContractActionMenu: { template: '<span />' }
}

describe('Contract Management pause status presentation', () => {
  it('[AC-US-CONTRACT-001-05] labels every supported and degraded pause state on desktop', () => {
    const wrapper = mount(MainContractDesktopTable, {
      props: { rows, isRefreshing: false, showActions: false },
      global: { stubs: globalStubs }
    })

    expect(wrapper.text()).toContain('Active')
    expect(wrapper.text()).toContain('Paused')
    expect(wrapper.text()).toContain('Not supported')
    expect(wrapper.text()).toContain('Unavailable')
  })

  it('[AC-US-CONTRACT-001-05] labels an unsupported pause capability on mobile', () => {
    const wrapper = mount(MainContractMobileCard, {
      props: { row: rows[2]! },
      global: { stubs: globalStubs }
    })

    expect(wrapper.get('[data-test="contract-pause-status"]').text()).toBe('Not supported')
  })
})
