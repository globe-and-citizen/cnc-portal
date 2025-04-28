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
    label: 'Job position',
    sortable: true
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

    it('should render header only without data', async () => {
      wrapper.setProps({ columns })
      await wrapper.vm.$nextTick()

      // role header should contain no sort button and his lable is his key
      expect(wrapper.find('[data-test="role-header"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="role-header"]').text()).toBe('role')
      expect(wrapper.find('[data-test="role-header"] [data-test="sort-button"]').exists()).toBe(
        false
      )

      // name header should contain sort button and his lable is his label
      expect(wrapper.find('[data-test="name-header"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="name-header"]').text()).toBe('User name')
      expect(wrapper.find('[data-test="name-header"] [data-test="sort-button"]').exists()).toBe(
        true
      )

      // assert empty state
      expect(wrapper.find('[data-test="empty-state"]').exists()).toBe(true)
    })

    // should render table with rows
    it('should render table with rows', async () => {
      wrapper.setProps({ rows: people, columns })
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-test="table"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="1-row"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="1-row"]').html()).toContain(people[1].name)

      //
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
      expect(wrapper.find('[data-test="0-row"]').html()).toContain(people[1].name) // assert sorted row

      // Click the button again
      await sortButton.trigger('click')
      await wrapper.vm.$nextTick()
      expect(sortButton.find('[data-test="sort-icon"]').exists()).toBe(false)
      expect(sortButton.find('[data-test="sort-desc"]').exists()).toBe(true)
      expect(sortButton.find('[data-test="sort-asc"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="0-row"]').html()).toContain(people[3].name) // assert sorted row
    })
  })

  describe('Pagination', () => {
    beforeEach(async () => {
      wrapper.setProps({
        rows: people,
        columns,
        showPagination: true,
        itemsPerPageProp: 5
      })
      await wrapper.vm.$nextTick()
    })

    it('should not show pagination when showPagination is false', async () => {
      wrapper.setProps({ showPagination: false })
      await wrapper.vm.$nextTick()
      expect(wrapper.find('[data-test="previous-page"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="next-page"]').exists()).toBe(false)
    })

    it('should show pagination controls when there are enough items', async () => {
      await wrapper.setProps({
        itemsPerPageProp: 2,
        showPagination: true
      })
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-test="previous-page"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="next-page"]').exists()).toBe(true)
      expect(wrapper.find('select[data-test="items-per-page"]').exists()).toBe(true)
    })

    it('should handle items per page change', async () => {
      const select = wrapper.find('select[data-test="items-per-page"]')
      expect(select.exists()).toBe(true)

      await select.setValue(5)
      await wrapper.vm.$nextTick()

      // Should show 5 items since we have 6 total items
      expect(wrapper.findAll('tbody tr').length).toBe(5)

      // Should update pagination info
      const paginationText = wrapper.text()
      expect(paginationText).toContain('Showing 1 to 5 of 6 entries')
    })

    it('should navigate between pages', async () => {
      // Set 2 items per page to have multiple pages
      await wrapper.setProps({ itemsPerPageProp: 2 })
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-test="previous-page"]').attributes('disabled')).toBeDefined()
      expect(wrapper.findAll('tbody tr').length).toBe(2)
      expect(wrapper.text()).toContain('Showing 1 to 2 of 6 entries')

      await wrapper.find('[data-test="next-page"]').trigger('click')
      await wrapper.vm.$nextTick()
      expect(wrapper.text()).toContain('Showing 3 to 4 of 6 entries')

      expect(wrapper.find('[data-test="previous-page"]').attributes('disabled')).toBeUndefined()

      await wrapper.find('[data-test="previous-page"]').trigger('click')
      await wrapper.vm.$nextTick()
      expect(wrapper.text()).toContain('Showing 1 to 2 of 6 entries')
    })

    it('should display correct page numbers', async () => {
      await wrapper.setProps({ itemsPerPageProp: 2 })
      await wrapper.vm.$nextTick()

      const pageButtons = wrapper.findAll('.join-item.btn')
      expect(pageButtons.length).toBeGreaterThan(2)

      expect(wrapper.find('[data-test="page-1"]').classes()).toContain('btn-active')

      await wrapper.find('[data-test="page-2"]').trigger('click')
      await wrapper.vm.$nextTick()
      expect(wrapper.find('[data-test="page-2"]').classes()).toContain('btn-active')
      expect(wrapper.text()).toContain('Showing 3 to 4 of 6 entries')
    })
  })
})
