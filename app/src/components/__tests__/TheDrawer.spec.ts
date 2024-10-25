import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import TheDrawer from '@/components/TheDrawer.vue'
import { HomeIcon, UsersIcon, ClipboardDocumentListIcon } from '@heroicons/vue/24/outline'
import { RouterLinkStub } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'

// Create a router instance with a basic route
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: { template: '<div>Home</div>' } },
    { path: '/teams', component: { template: '<div>Teams</div>' } },
    { path: '/transactions', component: { template: '<div>Teams</div>' } }
  ]
})

describe('TheDrawer', () => {
  const name = 'John Doe'
  const address = '0xc0ffee254729296a45a3885639AC7E10F9d54979'

  it('should render user information correctly', () => {
    const wrapper = mount(TheDrawer, {
      global: {
        plugins: [router] // Provide the router instance
      },
      props: { user: { name, address } }
    })
    expect(wrapper.find("[data-test='user-name'").text()).toContain(name)
    expect(wrapper.find("[data-test='formatted-address'").text()).toBe('0xc0ff...4979')
  })

  it('should render default user name when no name is provided', () => {
    const wrapper = mount(TheDrawer, {
      global: {
        plugins: [router] // Provide the router instance
      },
      props: { user: { name: '', address } }
    })

    expect(wrapper.find("[data-test='user-name'").text()).toBe('User')
  })

  it('should emit toggleEditUserModal when the user card is clicked', async () => {
    const wrapper = mount(TheDrawer, {
      global: {
        plugins: [router] // Provide the router instance
      },
      props: { user: { name, address } }
    })

    await wrapper.find("[data-test='edit-user-card']").trigger('click')
    expect(wrapper.emitted().openEditUserModal).toBeTruthy()
  })

  it('should render navigation links correctly', () => {
    const wrapper = mount(TheDrawer, {
      props: { user: { name, address } },
      global: {
        plugins: [router], // Provide the router instance
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
