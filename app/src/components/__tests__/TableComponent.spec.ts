import { it, describe, expect, beforeEach } from 'vitest'
import { VueWrapper, mount } from '@vue/test-utils'
import TableComponent from '@/components/TableComponent.vue'

const people = [
  {
    id: 1,
    name: 'Lindsay Walton',
    title: 'Front-end Developer',
    email: 'lindsay.walton@example.com',
    role: 'Member'
  },
  {
    id: 2,
    name: 'Courtney Henry',
    title: 'Designer',
    email: 'courtney.henry@example.com',
    role: 'Admin'
  },
  {
    id: 3,
    name: 'Tom Cook',
    title: 'Director of Product',
    email: 'tom.cook@example.com',
    role: 'Member'
  },
  {
    id: 4,
    name: 'Whitney Francis',
    title: 'Copywriter',
    email: 'whitney.francis@example.com',
    role: 'Admin'
  },
  {
    id: 5,
    name: 'Leonard Krasner',
    title: 'Senior Designer',
    email: 'leonard.krasner@example.com',
    role: 'Owner'
  },
  {
    id: 6,
    name: 'Floyd Miles',
    title: 'Principal Designer',
    email: 'floyd.miles@example.com',
    role: 'Member'
  }
]

const columns = [
  {
    key: 'id',
    label: 'ID',
    sortable: true
  },
  {
    key: 'name',
    label: 'User name',
    sortable: true
  },
  {
    key: 'title',
    label: 'Job position'
  },
  {
    key: 'email',
    label: 'Email'
  },
  {
    key: 'role'
  },
  {
    key: 'action',
    label: 'Action'
  }
]

describe('TableComponent.vue', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    wrapper = mount(TableComponent)
  })

  describe('Render', () => {
    it('should render empty table', () => {
      expect(wrapper.find('[data-test="empty-state"]').exists()).toBe(true)
    })
    it('should render loading state', async () => {
      wrapper.setProps({ loading: true })
      await wrapper.vm.$nextTick()
      expect(wrapper.find('[data-test="loading"]').exists()).toBe(true)
    })

    // it('should render table with rows', async () => {
    //   wrapper.setProps({ rows: people, columns })
    // })
    // TODO: Test sorting on click
    // TODO: Test key as label
    // TODO: Test colum effect on lable
  })

  describe('Methods', () => {
    it('should toggle sort', async () => {
      wrapper.setProps({ rows: people, columns })
      await wrapper.vm.$nextTick()
      const sortButton = wrapper.findAll('[data-test="sort-button"]')[1]
      // Check if the button exist
      expect(sortButton.exists()).toBe(true)

      // Check initial state
      expect(sortButton.find('[data-test="sort-icon"]').exists()).toBe(true)

      // Click the button
      await sortButton.trigger('click')
      await wrapper.vm.$nextTick()
      expect(sortButton.find('[data-test="sort-icon"]').exists()).toBe(false)
      expect(sortButton.find('[data-test="sort-desc"]').exists()).toBe(false)
      expect(sortButton.find('[data-test="sort-asc"]').exists()).toBe(true)

      // Click the button again
      await sortButton.trigger('click')
      await wrapper.vm.$nextTick()
      expect(sortButton.find('[data-test="sort-icon"]').exists()).toBe(false)
      expect(sortButton.find('[data-test="sort-desc"]').exists()).toBe(true)
      expect(sortButton.find('[data-test="sort-asc"]').exists()).toBe(false)
    })
  })
})
