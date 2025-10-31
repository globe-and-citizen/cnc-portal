import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import UserComponent from '@/components/UserComponent.vue'
import type { User } from '@/types'

describe('UserComponent.vue', () => {
  const mockUser: Pick<User, 'address' | 'name' | 'imageUrl'> & { role?: string } = {
    address: '0x1234567890123456789012345678901234567890',
    name: 'John Doe',
    imageUrl: 'https://example.com/avatar.jpg',
    role: 'Developer'
  }

  describe('Component Rendering', () => {
    it('should render with user data', () => {
      const wrapper = mount(UserComponent, {
        props: { user: mockUser }
      })

      const avatarImg = wrapper.find('[data-test="avatar-image"]')
      expect(avatarImg.attributes('src')).toBe(mockUser.imageUrl)
      expect(avatarImg.attributes('alt')).toBe('User Avatar')

      const userName = wrapper.find('[data-test="user-name"]')
      expect(userName.text()).toBe(mockUser.name || 'User')
    })

    it('should display defaults when user data is missing', () => {
      const wrapper = mount(UserComponent, {
        props: {
          user: { address: undefined, name: undefined, imageUrl: undefined }
        }
      })

      const avatarImg = wrapper.find('[data-test="avatar-image"]')
      expect(avatarImg.attributes('src')).toBe(
        'https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp'
      )

      const userName = wrapper.find('[data-test="user-name"]')
      expect(userName.text()).toBe('User')
    })
  })

  describe('isCollapsed prop', () => {
    it('should hide user info when collapsed', () => {
      const wrapper = mount(UserComponent, {
        props: { user: mockUser, isCollapsed: true }
      })

      const userInfoContainer = wrapper.find('[data-test="user-info-container"]')
      expect(userInfoContainer.exists()).toBe(false)
    })

    it('should show user info when not collapsed', () => {
      const wrapper = mount(UserComponent, {
        props: { user: mockUser, isCollapsed: false }
      })

      const userInfoContainer = wrapper.find('[data-test="user-info-container"]')
      expect(userInfoContainer.exists()).toBe(true)
    })
  })

  describe('isDetailedView prop', () => {
    it('should show larger avatar and role in detailed view', () => {
      const wrapper = mount(UserComponent, {
        props: { user: mockUser, isDetailedView: true }
      })

      const avatarContainer = wrapper.find('[data-test="avatar-container"]')
      expect(avatarContainer.classes()).toContain('w-24')
      expect(avatarContainer.classes()).toContain('h-24')

      const userRole = wrapper.find('[data-test="user-role"]')
      expect(userRole.exists()).toBe(true)
      expect(userRole.text()).toBe('Developer')
    })

    it('should show smaller avatar and no role when not in detailed view', () => {
      const wrapper = mount(UserComponent, {
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
      const wrapper = mount(UserComponent, {
        props: { user: mockUser }
      })

      const roleButton = wrapper.find('[role="button"]')
      expect(roleButton.exists()).toBe(true)

      const avatarImg = wrapper.find('[data-test="avatar-image"]')
      expect(avatarImg.attributes('alt')).toBe('User Avatar')
    })
  })
})
