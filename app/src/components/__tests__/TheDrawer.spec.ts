import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import TheDrawer from '@/components/TheDrawer.vue'
import { HomeIcon, UsersIcon, ClipboardDocumentListIcon } from '@heroicons/vue/24/outline'
import { RouterLinkStub } from '@vue/test-utils'

describe('TheDrawer', () => {
  const name = 'John Doe'
  const address = '0xc0ffee254729296a45a3885639AC7E10F9d54979'

  it('should render user information correctly', () => {
    const wrapper = mount(TheDrawer, {
      props: { user: { name, address } }
    })

    expect(wrapper.find('p.font-semibold.text-lg').text()).toBe(name)
    expect(wrapper.find('p.text-slate-500').text()).toBe('0xc0ffee25...10F9d54979')
  })

  it('should render default user name when no name is provided', () => {
    const wrapper = mount(TheDrawer, {
      props: { user: { name: '', address } }
    })

    expect(wrapper.find('p.font-semibold.text-lg').text()).toBe('User')
  })

  it('should emit toggleEditUserModal when the user card is clicked', async () => {
    const wrapper = mount(TheDrawer, {
      props: { user: { name, address } }
    })

    await wrapper.find('.card').trigger('click')
    expect(wrapper.emitted().openEditUserModal).toBeTruthy()
  })

  it('should render navigation links correctly', () => {
    const wrapper = mount(TheDrawer, {
      props: { user: { name, address } },
      global: {
        stubs: { RouterLink: RouterLinkStub, HomeIcon, UsersIcon, ClipboardDocumentListIcon }
      }
    })

    const links = wrapper.findAllComponents(RouterLinkStub)
    const linkTexts = links.map((link) => link.text())
    expect(linkTexts).toContain('Dashboard')
    expect(linkTexts).toContain('Teams')
    expect(linkTexts).toContain('Transactions')
  })
})
