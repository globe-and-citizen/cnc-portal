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
        variant: 'success',
        cardIcon: bagIcon
      }
    })

    expect(wrapper.find('img[data-test="card-icon"]').exists()).toBeTruthy()
    expect(wrapper.find("[data-test='amount']").text()).toBe('73.9K USD')
    expect(wrapper.find('[data-test="subtitle"]').text()).toBe('Total Balance')
  })
})
