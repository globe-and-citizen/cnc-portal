import { flushPromises, mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'
import TransferOwnershipForm from '@/components/sections/ContractManagementView/forms/TransferOwnershipForm.vue'
import type { Component } from 'vue'
import { mockTeamStore } from '@/tests/mocks/store.mock'
import { useTeamStore } from '@/stores'

// ─── Child component stubs ──────────────────────────────────────────────────
// These are local stubs passed via mount options, not vi.mock() calls.
const TransferOptionCardStub = {
  name: 'TransferOptionCard',
  props: ['label', 'isSelected', 'icon'],
  emits: ['selected'],
  template: `<button :data-label="label" @click="$emit('selected')">{{ label }}</button>`
}

const SelectMemberInputStub = {
  name: 'SelectMemberInput',
  props: ['modelValue', 'disableTeamMembers', 'hiddenMembers', 'showOnFocus', 'onlyTeamMembers'],
  emits: ['selectMember', 'update:modelValue'],
  template: `<div>
    <button
      data-test="select-valid-member"
      @click="$emit('selectMember', { name: 'Alice', address: '0x1234567890123456789012345678901234567890', imageUrl: '' })"
    >Select valid</button>
    <button
      data-test="select-invalid-member"
      @click="$emit('selectMember', { name: 'Bob', address: 'invalid-address', imageUrl: '' })"
    >Select invalid</button>
  </div>`
}

const mountComponent = (props = {}) =>
  mount(TransferOwnershipForm as Component, {
    props: { loading: false, isBodAction: false, ...props },
    global: {
      stubs: {
        TransferOptionCard: TransferOptionCardStub,
        SelectMemberInput: SelectMemberInputStub,
        BodAlert: { template: '<div data-test="bod-alert" />' },
        UserComponent: { template: '<div data-test="user-component" />', props: ['user'] },
        IconifyIcon: { template: '<span />' },
        UAlert: {
          name: 'UAlert',
          props: ['color', 'description'],
          template: '<div :data-color="color" :data-description="description" />'
        }
      }
    }
  })

describe('TransferOwnershipForm.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── Step 1 rendering ─────────────────────────────────────────────────────

  describe('step 1 (isBodAction=false)', () => {
    it('renders the option selection panel on step 1', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('[data-test="step-1"]').exists()).toBe(true)
    })

    it('does not show step-2 panel before Continue is clicked', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('[data-test="step-2"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="step-3"]').exists()).toBe(false)
    })

    it('shows the Continue button on step 1', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('[data-test="next-button"]').exists()).toBe(true)
    })

    it('renders both transfer option cards', () => {
      const wrapper = mountComponent()
      const cards = wrapper.findAll('[data-label]')
      expect(cards.map((c) => c.attributes('data-label'))).toContain('Transfer to BOD')
      expect(cards.map((c) => c.attributes('data-label'))).toContain('Transfer to Member')
    })
  })

  // ─── Step 2 (BOD) ─────────────────────────────────────────────────────────

  describe('step 2 – transfer to BOD', () => {
    it('advances to BOD recap panel when BOD is selected then Continue clicked', async () => {
      const wrapper = mountComponent()
      await wrapper.find('[data-label="Transfer to BOD"]').trigger('click')
      await wrapper.find('[data-test="next-button"]').trigger('click')
      await wrapper.vm.$nextTick()
      expect(wrapper.find('[data-test="step-2"]').exists()).toBe(true)
    })

    it('emits transfer-ownership with BOD address when Transfer Ownership is clicked', async () => {
      const wrapper = mountComponent()
      await wrapper.find('[data-label="Transfer to BOD"]').trigger('click')
      await wrapper.find('[data-test="next-button"]').trigger('click')
      await wrapper.vm.$nextTick()
      await wrapper.find('[data-test="transfer-ownership-button"]').trigger('click')
      await flushPromises()
      const emitted = wrapper.emitted('transfer-ownership')
      expect(emitted).toBeTruthy()
      expect(emitted![0]?.[0]).toBe(mockTeamStore.getContractAddressByType('BoardOfDirectors'))
    })

    it('shows Back button on step 2 when isBodAction=false', async () => {
      const wrapper = mountComponent()
      await wrapper.find('[data-label="Transfer to BOD"]').trigger('click')
      await wrapper.find('[data-test="next-button"]').trigger('click')
      await wrapper.vm.$nextTick()
      expect(wrapper.find('[data-test="back-button"]').exists()).toBe(true)
    })

    it('goes back to step 1 when Back is clicked', async () => {
      const wrapper = mountComponent()
      await wrapper.find('[data-label="Transfer to BOD"]').trigger('click')
      await wrapper.find('[data-test="next-button"]').trigger('click')
      await wrapper.vm.$nextTick()
      await wrapper.find('[data-test="back-button"]').trigger('click')
      await wrapper.vm.$nextTick()
      expect(wrapper.find('[data-test="step-1"]').exists()).toBe(true)
    })
  })

  // ─── Step 2 (Member) ─────────────────────────────────────────────────────

  describe('step 2 – transfer to member', () => {
    const goToMemberStep = async (wrapper: ReturnType<typeof mountComponent>) => {
      await wrapper.find('[data-label="Transfer to Member"]').trigger('click')
      await wrapper.find('[data-test="next-button"]').trigger('click')
      await wrapper.vm.$nextTick()
    }

    it('shows member selection panel on step 2 when Member is selected', async () => {
      const wrapper = mountComponent()
      await goToMemberStep(wrapper)
      expect(wrapper.find('[data-test="step-3"]').exists()).toBe(true)
    })

    it('shows UserComponent when input has a valid address', async () => {
      const wrapper = mountComponent()
      await goToMemberStep(wrapper)
      await wrapper.find('[data-test="select-valid-member"]').trigger('click')
      await wrapper.vm.$nextTick()
      expect(wrapper.find('[data-test="user-component"]').exists()).toBe(true)
    })

    it('does not show UserComponent when input has no address', async () => {
      const wrapper = mountComponent()
      await goToMemberStep(wrapper)
      expect(wrapper.find('[data-test="user-component"]').exists()).toBe(false)
    })

    it('shows addressError when an invalid address is submitted', async () => {
      const wrapper = mountComponent()
      await goToMemberStep(wrapper)
      // Leave address empty (not a valid Ethereum address)
      await wrapper.find('[data-test="transfer-ownership-button"]').trigger('click')
      await wrapper.vm.$nextTick()
      const setupState = wrapper.getCurrentComponent().setupState as {
        addressError: string
      }
      expect(setupState.addressError).toBeTruthy()
    })

    it('clears addressError and emits transfer-ownership with member address on valid submit', async () => {
      const wrapper = mountComponent()
      await goToMemberStep(wrapper)
      await wrapper.find('[data-test="select-valid-member"]').trigger('click')
      await wrapper.vm.$nextTick()
      await wrapper.find('[data-test="transfer-ownership-button"]').trigger('click')
      await flushPromises()
      const emitted = wrapper.emitted('transfer-ownership')
      expect(emitted).toBeTruthy()
      expect(emitted![0]?.[0]).toBe('0x1234567890123456789012345678901234567890')
    })
  })

  // ─── isBodAction = true ───────────────────────────────────────────────────

  describe('isBodAction=true (BOD direct action)', () => {
    it('starts at step 2 with member panel (onMounted sets step=2, selectedOption=member)', async () => {
      const wrapper = mountComponent({ isBodAction: true })
      await nextTick()
      expect(wrapper.find('[data-test="step-3"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="step-1"]').exists()).toBe(false)
    })

    it('does not show the Back button when isBodAction=true', () => {
      const wrapper = mountComponent({ isBodAction: true })
      expect(wrapper.find('[data-test="back-button"]').exists()).toBe(false)
    })

    it('shows BodAlert when isBodAction=true', async () => {
      const wrapper = mountComponent({ isBodAction: true })
      await nextTick()
      expect(wrapper.find('[data-test="bod-alert"]').exists()).toBe(true)
    })

    it('transfer button uses full justify-end layout when isBodAction=true', async () => {
      const wrapper = mountComponent({ isBodAction: true })
      await nextTick()
      // The container div should have justify-end class
      const nav = wrapper.find('[data-test="transfer-ownership-button"]').element.parentElement
      expect(nav?.className).toContain('justify-end')
    })

    it('shows addressError when transfer attempted with empty address', async () => {
      const wrapper = mountComponent({ isBodAction: true })
      await nextTick()
      await wrapper.find('[data-test="transfer-ownership-button"]').trigger('click')
      await wrapper.vm.$nextTick()
      const setupState = wrapper.getCurrentComponent().setupState as {
        addressError: string
      }
      expect(setupState.addressError).toBeTruthy()
    })

    it('emits transfer-ownership with the member address when a valid address is selected', async () => {
      const wrapper = mountComponent({ isBodAction: true })
      await nextTick()
      await wrapper.find('[data-test="select-valid-member"]').trigger('click')
      await wrapper.vm.$nextTick()
      await wrapper.find('[data-test="transfer-ownership-button"]').trigger('click')
      await flushPromises()
      const emitted = wrapper.emitted('transfer-ownership')
      expect(emitted).toBeTruthy()
      expect(emitted![0]?.[0]).toBe('0x1234567890123456789012345678901234567890')
    })
  })

  // ─── Loading state ────────────────────────────────────────────────────────

  describe('loading state', () => {
    it('disables Transfer Ownership button while loading', async () => {
      // Mount at step 2 via isBodAction to have the transfer button visible
      const wrapper = mountComponent({ loading: true, isBodAction: true })
      await nextTick()
      const btn = wrapper.find('[data-test="transfer-ownership-button"]')
      expect(btn.attributes('disabled')).toBeDefined()
    })
  })

  // ─── getContractAddressByType called correctly ────────────────────────────

  describe('BOD address source', () => {
    it('calls getContractAddressByType with BoardOfDirectors', async () => {
      const wrapper = mountComponent()
      await wrapper.find('[data-label="Transfer to BOD"]').trigger('click')
      await wrapper.find('[data-test="next-button"]').trigger('click')
      await wrapper.vm.$nextTick()
      await wrapper.find('[data-test="transfer-ownership-button"]').trigger('click')
      await flushPromises()
      expect(vi.mocked(useTeamStore)().getContractAddressByType).toHaveBeenCalledWith(
        'BoardOfDirectors'
      )
    })
  })
})
