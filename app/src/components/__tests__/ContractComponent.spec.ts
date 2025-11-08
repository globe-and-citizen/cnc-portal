import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import ContractComponent from '@/components/ContractComponent.vue'
import type { User } from '@/types'

describe('ContractComponent.vue', () => {
  const mockUser: Pick<User, 'address' | 'name' | 'imageUrl'> & { role?: string } = {
    address: '0x1234567890123456789012345678901234567890',
    name: 'expense account',
    imageUrl: 'https://example.com/avatar.jpg',
    role: 'contract'
  }

  describe('Component Rendering', () => {
    it('should display defaults when contract data is missing', () => {
      const wrapper = mount(ContractComponent, {
        props: {
          user: { address: undefined, name: undefined, imageUrl: undefined }
        }
      })

      const avatarImg = wrapper.find('[data-test="avatar-image"]')
      expect(avatarImg.attributes('src')).toBe('https://api.dicebear.com/9.x/bottts/svg?seed')

      const userName = wrapper.find('[data-test="user-name"]')
      expect(userName.text()).toBe('User')
    })
  })

  describe('isCollapsed prop', () => {
    it('should hide user info when collapsed', () => {
      const wrapper = mount(ContractComponent, {
        props: { user: mockUser, isCollapsed: true }
      })

      const userInfoContainer = wrapper.find('[data-test="user-info-container"]')
      expect(userInfoContainer.exists()).toBe(false)
    })

    it('should show user info when not collapsed', () => {
      const wrapper = mount(ContractComponent, {
        props: { user: mockUser, isCollapsed: false }
      })

      const userInfoContainer = wrapper.find('[data-test="user-info-container"]')
      expect(userInfoContainer.exists()).toBe(true)
    })
  })

  describe('isDetailedView prop', () => {
    it('should show larger avatar and role in detailed view', () => {
      const wrapper = mount(ContractComponent, {
        props: { user: mockUser, isDetailedView: true }
      })

      const avatarContainer = wrapper.find('[data-test="avatar-container"]')
      expect(avatarContainer.classes()).toContain('w-24')
      expect(avatarContainer.classes()).toContain('h-24')

      const userRole = wrapper.find('[data-test="user-role"]')
      expect(userRole.exists()).toBe(true)
      expect(userRole.text()).toBe('contract')
    })

    it('should show smaller avatar and no role when not in detailed view', () => {
      const wrapper = mount(ContractComponent, {
        props: { user: mockUser, isDetailedView: false }
      })

      const avatarContainer = wrapper.find('[data-test="avatar-container"]')
      expect(avatarContainer.classes()).toContain('w-11')
      expect(avatarContainer.classes()).toContain('h-11')

      const userRole = wrapper.find('[data-test="user-role"]')
      expect(userRole.exists()).toBe(false)
    })
  })

  describe('Accessibility', () => {
    it('should have proper aria attributes', () => {
      const wrapper = mount(ContractComponent, {
        props: { user: mockUser }
      })

      const roleButton = wrapper.find('[role="button"]')
      expect(roleButton.exists()).toBe(true)

      const avatarImg = wrapper.find('[data-test="avatar-image"]')
      expect(avatarImg.attributes('alt')).toBe('User Avatar')
    })
  })
})
