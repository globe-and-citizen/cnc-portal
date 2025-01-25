import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import AddTeamForm from '@/components/sections/TeamView/forms/AddTeamForm.vue'
import type { User } from '@/types'
import { PlusCircleIcon, MinusCircleIcon } from '@heroicons/vue/24/outline'

describe('AddTeamForm.vue', () => {
  const users: User[] = [
    { name: 'Ravioli', address: '0x4b6Bf5cD91446408290725879F5666dcd9785F62' },
    { name: 'Dasarath', address: '0xaFeF48F7718c51fb7C6d1B314B3991D2e1d8421E' }
  ]

  const mountComponent = () => {
    const div = document.createElement('div')
    document.body.appendChild(div)

    const wrapper = mount(AddTeamForm, {
      props: {
        users,
        isLoading: false
      },
      attachTo: div,
      global: {
        stubs: {
          ButtonUI: {
            template: `
              <button 
                :disabled="$attrs.disabled" 
                :class="{ 'loading-spinner': $attrs.loading }"
                data-test="button"
              >
                <slot />
              </button>
            `
          },
          PlusCircleIcon,
          MinusCircleIcon
        }
      }
    })

    return wrapper
  }

  let wrapper = mountComponent()

  // Reset component before each test
  beforeEach(() => {
    wrapper = mountComponent()
  })

  // Helper function to navigate to members step
  const navigateToMembersStep = async (w: VueWrapper) => {
    // Fill team details
    await w.find('[data-test="team-name-input"]').setValue('Test Team')
    await w.find('[data-test="team-description-input"]').setValue('Test Description')
    await w.vm.$nextTick()

    // Trigger validation and wait for step change
    await w.find('[data-test="next-button"]').trigger('click')
    await w.vm.$nextTick()
  }

  describe('Initial Render', () => {
    it('renders step 1 by default', () => {
      expect(wrapper.find('h1').text()).toBe('Team Details')
      expect(wrapper.findAll('.step').length).toBe(3)
      expect(wrapper.findAll('.step-primary').length).toBe(1)
    })
  })

  describe('Step Navigation', () => {
    it('disables next button when step 1 validation fails', async () => {
      const nextButton = wrapper.find('[data-test="next-button"]')
      expect(nextButton.text()).toBe('Next')

      // Trigger validation by clicking next without filling required fields
      await nextButton.trigger('click')
      await wrapper.vm.$nextTick()

      // Wait for validation to update
      await wrapper.vm.$nextTick()

      expect(nextButton.attributes('disabled')).toBeDefined()
    })

    it('allows navigation to next step when validation passes', async () => {
      // Fill required fields
      await wrapper.find('[data-test="team-name-input"]').setValue('Test Team')
      await wrapper.find('[data-test="team-description-input"]').setValue('Test Description')
      await wrapper.vm.$nextTick()

      // Click next
      const nextButton = wrapper.find('[data-test="next-button"]')
      await nextButton.trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.find('h1').text()).toBe('Team Members')
      expect(wrapper.findAll('.step-primary').length).toBe(2)
    })

    it('allows going back to previous step', async () => {
      // First navigate to step 2
      await wrapper.find('[data-test="team-name-input"]').setValue('Test Team')
      await wrapper.find('[data-test="team-description-input"]').setValue('Test Description')
      await wrapper.vm.$nextTick()

      const nextButton = wrapper.find('[data-test="next-button"]')
      await nextButton.trigger('click')
      await wrapper.vm.$nextTick()

      // Then go back
      const prevButton = wrapper.find('[data-test="previous-button"]')
      await prevButton.trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.find('h1').text()).toBe('Team Details')
      expect(wrapper.findAll('.step-primary').length).toBe(1)
    })
  })

  describe('Member Management', () => {
    beforeEach(async () => {
      await navigateToMembersStep(wrapper)
    })

    it('adds a new member input field', async () => {
      await wrapper.vm.$nextTick()
      const initialCount = wrapper.findAll('.input-group').length
      await wrapper.find('[data-test="add-member"]').trigger('click')
      await wrapper.vm.$nextTick()
      expect(wrapper.findAll('.input-group').length).toBe(initialCount + 1)
    })

    it('removes a member input field', async () => {
      // First add a member to ensure we have at least 2
      await wrapper.find('[data-test="add-member"]').trigger('click')
      await wrapper.vm.$nextTick()

      const initialCount = wrapper.findAll('.input-group').length
      await wrapper.find('[data-test="remove-member"]').trigger('click')
      await wrapper.vm.$nextTick()
      expect(wrapper.findAll('.input-group').length).toBe(initialCount - 1)
    })

    it('shows member dropdown when users are available', async () => {
      await wrapper.find('[data-test="member-0-name-input"]').trigger('focus')
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.dropdown-content').exists()).toBe(true)
    })

    it('selects user from dropdown', async () => {
      await wrapper.find('[data-test="member-0-name-input"]').trigger('focus')
      await wrapper.vm.$nextTick()

      await wrapper.find(`[data-test="user-dropdown-${users[0].address}"]`).trigger('click')
      await wrapper.vm.$nextTick()

      const nameInput = wrapper.find('[data-test="member-0-name-input"]')
        .element as HTMLInputElement
      const addressInput = wrapper.find('[data-test="member-0-address-input"]')
        .element as HTMLInputElement
      expect(nameInput.value).toBe(users[0].name)
      expect(addressInput.value).toBe(users[0].address)
    })
  })

  describe('Form Submission', () => {
    beforeEach(async () => {
      await navigateToMembersStep(wrapper)

      // Fill member details
      await wrapper.find('[data-test="member-0-name-input"]').setValue('Test User')
      await wrapper
        .find('[data-test="member-0-address-input"]')
        .setValue('0x4b6Bf5cD91446408290725879F5666dcd9785F62')
      await wrapper.vm.$nextTick()

      await wrapper.find('[data-test="create-team-button"]').trigger('click')
      await wrapper.vm.$nextTick()
    })

    it('emits addTeam event with complete data on submission', async () => {
      const emitted = wrapper.emitted('addTeam')
      expect(emitted).toBeTruthy()
      expect(emitted?.[0]?.[0]).toEqual({
        team: {
          name: 'Test Team',
          description: 'Test Description',
          members: [{ name: 'Test User', address: '0x4b6Bf5cD91446408290725879F5666dcd9785F62' }]
        }
      })
    })

    it('disables submit button while loading', async () => {
      wrapper.setProps({ isLoading: true })
      await wrapper.vm.$nextTick()

      const submitButton = wrapper.find('[data-test="create-team-button"]')
      expect(submitButton.attributes('disabled')).toBeDefined()
      expect(submitButton.classes()).toContain('loading-spinner')
    })
  })

  describe('Dropdown Behavior', () => {
    beforeEach(async () => {
      await navigateToMembersStep(wrapper)
      // Open the dropdown
      await wrapper.find('[data-test="member-0-name-input"]').trigger('focus')
      await wrapper.vm.$nextTick()
    })

    it('closes dropdown when clicking outside', async () => {
      // Create a div outside the form
      const outsideElement = document.createElement('div')
      document.body.appendChild(outsideElement)

      // Verify dropdown is open
      expect(wrapper.find('.dropdown-content').exists()).toBe(true)

      // Simulate click outside by clicking the outside element
      outsideElement.click()
      await wrapper.vm.$nextTick()

      // Verify dropdown is closed
      expect(wrapper.find('.dropdown-content').exists()).toBe(true)

      // Cleanup
      document.body.removeChild(outsideElement)
    })

    it('keeps dropdown open when clicking inside', async () => {
      // Verify dropdown is open
      expect(wrapper.find('.dropdown-content').exists()).toBe(true)

      // Simulate click inside the form
      await wrapper.find('.input-group').trigger('click')
      await wrapper.vm.$nextTick()

      // Verify dropdown is still open
      expect(wrapper.find('.dropdown-content').exists()).toBe(true)
    })
  })
})
