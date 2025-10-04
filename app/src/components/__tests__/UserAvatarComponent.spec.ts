import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import UserAvatarComponent from '@/components/UserAvatarComponent.vue'
import type { User } from '@/types'

describe('UserAvatarComponent.vue', () => {
  const mockUser: Pick<User, 'address' | 'name' | 'imageUrl'> & { role?: string } = {
    address: '0x1234567890123456789012345678901234567890',
    name: 'John Doe',
    imageUrl: 'https://example.com/avatar.jpg',
    role: 'Developer'
  }

  describe('Component Rendering', () => {
    it('should render with user data', () => {
      const wrapper = mount(UserAvatarComponent, {
        props: { user: mockUser }
      })

      const avatarImg = wrapper.find('img[alt="User Avatar"]')
      expect(avatarImg.attributes('src')).toBe(mockUser.imageUrl)

      const userName = wrapper.find('[data-test="user-name"]')
      expect(userName.text()).toBe('John Doe')
    })

    it('should display defaults when user data is missing', () => {
      const wrapper = mount(UserAvatarComponent, {
        props: {
          user: { address: undefined, name: undefined, imageUrl: undefined }
        }
      })

      const avatarImg = wrapper.find('img[alt="User Avatar"]')
      expect(avatarImg.attributes('src')).toBe(
        'https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp'
      )

      const userName = wrapper.find('[data-test="user-name"]')
      expect(userName.text()).toBe('User')
    })
  })
})
