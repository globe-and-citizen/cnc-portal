import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import PieChart from '../PieChart.vue'
import { nextTick } from 'vue'

// Mock data
vi.mock('vue-echarts', () => ({
  // Mock the VChart component
  default: {
    name: 'VChart',
    props: ['option', 'autoresize'],
    template: '<div class="v-chart-mock">{{ JSON.stringify($props) }}</div>'
  }
}))

const sampleData = [
  { name: 'Category A', value: 40 },
  { name: 'Category B', value: 30 },
  { name: 'Category C', value: 20 },
  { name: 'Category D', value: 10 }
]

describe('PieChart.vue', () => {
  describe('renders', () => {
    it('renders', () => {
      const wrapper = mount(PieChart, {
        props: {
          data: sampleData,
          title: 'Sample Pie Chart'
        }
      })

      expect(wrapper.exists()).toBe(true)

      const titleElement = wrapper.find('[data-test="pie-chart"]')
      expect(titleElement.exists()).toBe(true)
      expect(titleElement.text()).toContain('Sample Pie Chart')
    })

    it('passes correct data to the chart', async () => {
      const wrapper = mount(PieChart, {
        props: {
          data: sampleData,
          title: 'Sample Pie Chart'
        }
      })

      await nextTick()

      const chartProps = wrapper.findComponent({ name: 'VChart' }).props()

      expect(chartProps.option.series[0].data).toEqual(sampleData)

      expect(chartProps.option.legend.data).toEqual(sampleData.map((item) => item.name))
    })
  })
  describe('does not render', () => {
    it('handles empty data', () => {
      const wrapper = mount(PieChart, {
        props: {
          data: [],
          title: 'Empty Pie Chart'
        }
      })

      expect(wrapper.findComponent({ name: 'VChart' }).exists()).toBe(false)
    })
  })
})
