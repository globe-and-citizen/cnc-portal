import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ActionTable from '@/components/sections/AdministrationView/tables/ActionTable.vue'

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
  const mockActions = [
    {
      targetAddress: '0x123',
      description: 'Test action',
      isExecuted: false,
      data: '0x1234567890abcdef' as `0x${string}`
    }
  ]

  const defaultProps = {
    actionCount: 1,
    actions: mockActions.map((action, index) => ({
      ...action,
      targetAddress: action.targetAddress as `0x${string}`,
      id: index
    })),
    team: { name: 'Test Team' },
    boardOfDirectors: ['0xabc', '0xdef'] as `0x${string}`[]
  }

  it('renders the table headers correctly', () => {
    const wrapper = mount(ActionTable, {
      props: {
        ...defaultProps,
        actions: defaultProps.actions.map((action) => ({
          ...action,
          actionId: action.id,
          userAddress: '0x123' as `0x${string}`,
          teamId: 1
        }))
      }
    })

    const headers = wrapper.findAll('th')
    expect(headers[0].text()).toBe('No')
    expect(headers[1].text()).toBe('Target')
    expect(headers[2].text()).toBe('Description')
    expect(headers[3].text()).toBe('Executed')
    expect(headers[4].text()).toBe('Function Signature')
  })

  it('displays "No actions" when actionCount is 0', () => {
    const wrapper = mount(ActionTable, {
      props: {
        ...defaultProps,
        actionCount: 0,
        actions: []
      }
    })

    expect(wrapper.text()).toContain('No actions')
  })

  it('renders action rows correctly', () => {
    const wrapper = mount(ActionTable, {
      props: {
        ...defaultProps,
        actions: defaultProps.actions.map((action) => ({
          ...action,
          actionId: action.id,
          userAddress: '0x123' as `0x${string}`,
          teamId: 1
        }))
      }
    })

    const row = wrapper.find('tbody tr')
    expect(row.find('th').text()).toBe('1')
    expect(row.findAll('td')[0].text()).toBe('0x123')
    expect(row.findAll('td')[1].text()).toBe('Test action')
    expect(row.findAll('td')[2].text()).toBe('false')
    expect(row.findAll('td')[3].text()).toBe('0x12345678...')
  })

  it('opens modal when clicking on an action row', async () => {
    const wrapper = mount(ActionTable, {
      props: {
        ...defaultProps,
        actions: defaultProps.actions.map((action) => ({
          ...action,
          actionId: action.id,
          userAddress: '0x123' as `0x${string}`,
          teamId: 1
        }))
      }
    })

    await wrapper.find('tbody tr').trigger('click')
    expect(wrapper.findComponent({ name: 'ModalComponent' }).exists()).toBe(true)
  })
  describe('Modal Interactions', () => {
    it('should open approve modal when an action row is clicked', async () => {
      const wrapper = mount(ActionTable, {
        props: {
          ...defaultProps,
          actions: defaultProps.actions.map((action) => ({
            ...action,
            actionId: action.id,
            userAddress: '0x123' as `0x${string}`,
            teamId: 1
          }))
        }
      })

      await wrapper.find('tbody tr').trigger('click')
      expect(wrapper.findComponent({ name: 'ModalComponent' }).exists()).toBe(true)
      expect((wrapper.vm as unknown as { approveModal: boolean }).approveModal).toBe(true)
    })
  })
})
