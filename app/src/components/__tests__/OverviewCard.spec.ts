import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import OverviewCard from '../OverviewCard.vue'
import bagIcon from '@/assets/bag.svg'

describe('OverviewCard', () => {
  it('should renders card correctly', async () => {
    const wrapper = mount(OverviewCard, {
      props: {
        title: '73.9K USD',
        subtitle: 'Total Balance',
        cardIcon: bagIcon
      }
    })

    expect(wrapper.find('img[data-test="card-icon"]').exists()).toBeTruthy()
    expect(wrapper.find("[data-test='amount']").text()).toBe('73.9K USD')
    expect(wrapper.find('[data-test="subtitle"]').text()).toBe('Total Balance')
  })

  it('applies correct background color for info variant', () => {
    const wrapper = mount(OverviewCard, {
      props: {
        title: 'Test Title',
        subtitle: 'Test Subtitle',
        variant: 'info',
        cardIcon: 'test-icon.png'
      }
    })

    expect(wrapper.classes()).toContain('bg-[#D9F1F6]')
  })

  it('applies correct text color for info variant', () => {
    const wrapper = mount(OverviewCard, {
      props: {
        title: 'Test Title',
        subtitle: 'Test Subtitle',
        variant: 'info',
        cardIcon: 'test-icon.png'
      }
    })

    expect(wrapper.classes()).toContain('text-[#0C315A]')
  })

  it('applies correct background color for success variant', () => {
    const wrapper = mount(OverviewCard, {
      props: {
        title: 'Test Title',
        subtitle: 'Test Subtitle',
        variant: 'success',
        cardIcon: 'test-icon.png'
      }
    })

    expect(wrapper.classes()).toContain('bg-[#C8FACD]')
  })

  it('applies correct text color for success variant', () => {
    const wrapper = mount(OverviewCard, {
      props: {
        title: 'Test Title',
        subtitle: 'Test Subtitle',
        variant: 'success',
        cardIcon: 'test-icon.png'
      }
    })

    expect(wrapper.classes()).toContain('text-[#005249]')
  })

  it('applies correct background color for warning variant', () => {
    const wrapper = mount(OverviewCard, {
      props: {
        title: 'Test Title',
        subtitle: 'Test Subtitle',
        variant: 'warning',
        cardIcon: 'test-icon.png'
      }
    })

    expect(wrapper.classes()).toContain('bg-[#FEF3DE]')
  })

  it('applies correct text color for warning variant', () => {
    const wrapper = mount(OverviewCard, {
      props: {
        title: 'Test Title',
        subtitle: 'Test Subtitle',
        variant: 'warning',
        cardIcon: 'test-icon.png'
      }
    })

    expect(wrapper.classes()).toContain('text-[#6A3B13]')
  })
})
