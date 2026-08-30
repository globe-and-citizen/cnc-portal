import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import MainContractActionMenu from '../MainContractActionMenu.vue'
import type { TableRow } from '@/types/table'

const DEFAULT_ROW: TableRow = {
  address: '0xContract000000000000000000000000000001',
  paused: false,
  owner: '0xOwner0000000000000000000000000000000001',
  type: 'Treasury'
}

type MenuItem = {
  label?: string
  color?: string
  disabled?: boolean
  onSelect?: () => void
}

function mountComponent(rowOverrides: Partial<TableRow> = {}, props: Record<string, unknown> = {}) {
  return mount(MainContractActionMenu, {
    props: {
      row: { ...DEFAULT_ROW, ...rowOverrides },
      actionState: {
        pendingActionCount: 0,
        canManage: false,
        canReviewPendingActions: false
      },
      ...props
    }
  })
}

function getMenuItems(wrapper: ReturnType<typeof mountComponent>): MenuItem[] {
  const dropdown = wrapper.findComponent({ name: 'UDropdown' })
  return (dropdown.props('items') as MenuItem[][]).flat()
}

function selectMenuItem(wrapper: ReturnType<typeof mountComponent>, label: string) {
  const item = getMenuItems(wrapper).find((candidate) => candidate.label === label)
  expect(item, `Menu item "${label}"`).toBeDefined()
  item?.onSelect?.()
}

describe('MainContractActionMenu.vue', () => {
  it('renders the contextual actions for active and paused contracts', () => {
    const active = mountComponent({ paused: false })
    const paused = mountComponent({ paused: true })

    expect(getMenuItems(active).map((item) => item.label)).toContain('Transfer ownership')
    expect(getMenuItems(active).map((item) => item.label)).toContain('Pause contract')
    expect(getMenuItems(paused).map((item) => item.label)).toContain('Resume contract')
    expect(getMenuItems(active).find((item) => item.label === 'Pause contract')?.color).toBe(
      'error'
    )
    expect(getMenuItems(paused).find((item) => item.label === 'Resume contract')?.color).toBe(
      'success'
    )
  })

  it('keeps privileged actions disabled without the selected contract permission', () => {
    const wrapper = mountComponent()

    expect(
      getMenuItems(wrapper).find((item) => item.label === 'Transfer ownership')?.disabled
    ).toBe(true)
    expect(getMenuItems(wrapper).find((item) => item.label === 'Pause contract')?.disabled).toBe(
      true
    )
    expect(
      getMenuItems(wrapper).find((item) => item.label === 'No pending actions')?.disabled
    ).toBe(true)
  })

  it('emits the selected contract action without mounting a dialog', () => {
    const wrapper = mountComponent(
      {},
      {
        actionState: {
          pendingActionCount: 1,
          canManage: true,
          canReviewPendingActions: true
        }
      }
    )

    selectMenuItem(wrapper, 'View contract details')
    selectMenuItem(wrapper, 'Copy contract address')
    selectMenuItem(wrapper, 'Open in explorer')
    selectMenuItem(wrapper, 'Review pending actions (1)')
    selectMenuItem(wrapper, 'Transfer ownership')
    selectMenuItem(wrapper, 'Pause contract')

    expect(wrapper.emitted('view-details')).toHaveLength(1)
    expect(wrapper.emitted('copy-contract-address')).toHaveLength(1)
    expect(wrapper.emitted('open-in-explorer')).toHaveLength(1)
    expect(wrapper.emitted('review-pending-actions')).toHaveLength(1)
    expect(wrapper.emitted('transfer-ownership')).toHaveLength(1)
    expect(wrapper.emitted('change-status')).toEqual([[false]])
    expect(wrapper.findComponent({ name: 'UModal' }).exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'USlideover' }).exists()).toBe(false)
  })
})
