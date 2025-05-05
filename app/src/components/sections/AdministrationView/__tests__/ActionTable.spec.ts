import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ActionTable from '@/components/sections/AdministrationView/tables/ActionTable.vue'
import TableComponent from '@/components/TableComponent.vue'
import type { Action } from '@/types'

// Mock child components
vi.mock('@/components/ModalComponent.vue', () => ({
  default: {
    name: 'ModalComponent',
    template: '<div data-testid="modal">Modal</div>'
  }
}))

vi.mock('@/components/sections/AdministrationView/forms/ApproveRevokeAction.vue', () => ({
  default: {
    name: 'ApproveRevokeAction',
    template: '<div>ApproveRevokeAction</div>'
  }
}))

describe('ActionTable', () => {
  const mockActions: Action[] = [
    {
      id: 0,
      actionId: 0,
      targetAddress: '0x123' as `0x${string}`,
      description: 'Test action',
      userAddress: '0x456' as `0x${string}`,
      isExecuted: false,
      data: '0x1234567890abcdef' as `0x${string}`,
      teamId: 1
    }
  ]

  const defaultProps = {
    actionCount: 1,
    actions: mockActions,
    team: { name: 'Test Team' },
    boardOfDirectors: ['0xabc', '0xdef'] as `0x${string}`[]
  }

  const createComponent = (props = defaultProps) => {
    return mount(ActionTable, {
      props,
      global: {
        stubs: {
          TableComponent: false
        }
      }
    })
  }

  it('renders the table headers correctly', () => {
    const wrapper = createComponent()
    const tableComponent = wrapper.findComponent(TableComponent)
    expect(tableComponent.exists()).toBeTruthy()

    const expectedColumns = [
      { key: 'index', label: 'No' },
      { key: 'targetAddress', label: 'Target' },
      { key: 'description', label: 'Description' },
      { key: 'isExecuted', label: 'Executed' },
      { key: 'functionSignature', label: 'Function Signature' }
    ]
    expect(tableComponent.props('columns')).toEqual(expectedColumns)
  })

  it('displays "No actions" when actionCount is 0', () => {
    const wrapper = createComponent({
      ...defaultProps,
      actionCount: 0,
      actions: []
    })
    const tableComponent = wrapper.findComponent(TableComponent)
    expect(tableComponent.props('emptyState')).toEqual({
      label: 'No actions',
      icon: 'text-center font-bold text-lg h-96'
    })
  })

  it('renders action rows correctly', () => {
    const wrapper = createComponent()
    const tableComponent = wrapper.findComponent(TableComponent)

    const expectedRows = defaultProps.actions.map((action, index) => ({
      ...action,
      index: index + 1,
      functionSignature: action.data.slice(0, 10) + '...'
    }))

    expect(tableComponent.props('rows')).toEqual(expectedRows)
  })

  it('opens modal when clicking on an action row', async () => {
    const wrapper = createComponent()
    const tableComponent = wrapper.findComponent(TableComponent)

    await tableComponent.vm.$emit('row-click', defaultProps.actions[0])

    expect(wrapper.findComponent({ name: 'ModalComponent' }).exists()).toBe(true)
  })

  describe('Modal Interactions', () => {
    it('should open approve modal when an action row is clicked', async () => {
      const wrapper = createComponent()
      const tableComponent = wrapper.findComponent(TableComponent)

      await tableComponent.vm.$emit('row-click', defaultProps.actions[0])

      expect(wrapper.findComponent({ name: 'ModalComponent' }).exists()).toBe(true)
      expect((wrapper.vm as unknown as { approveModal: boolean }).approveModal).toBe(true)
    })
  })
})
