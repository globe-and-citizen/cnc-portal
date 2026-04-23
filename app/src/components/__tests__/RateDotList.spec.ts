import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import RateDotList from '@/components/RateDotList.vue'
import { NETWORK } from '@/constant'

describe('RateDotList', () => {
  it('renders each supported color branch and formats token labels', () => {
    const wrapper = mount(RateDotList, {
      props: {
        rates: [
          { type: 'native', amount: 1.5 },
          { type: 'usdc', amount: 2.5 },
          { type: 'usdt', amount: 0 },
          { type: 'sher', amount: -3.456 }
        ],
        textClass: 'text-emerald-700',
        minimumFractionDigits: 1,
        maximumFractionDigits: 2
      }
    })

    const rows = wrapper.findAll('.flex.items-center.gap-1.font-semibold')
    const dots = wrapper.findAll('span')

    expect(rows).toHaveLength(4)
    expect(rows.every((row) => row.classes().includes('text-emerald-700'))).toBe(true)
    expect(rows[0]?.text()).toContain(`${NETWORK.currencySymbol} 1.5`)
    expect(rows[1]?.text()).toContain('USDC 2.5')
    expect(rows[2]?.text()).toContain('USDT 0')
    expect(rows[3]?.text()).toContain('SHER -3.46')
    expect(dots[0]?.classes()).toContain('bg-yellow-400')
    expect(dots[1]?.classes()).toContain('bg-blue-500')
    expect(dots[2]?.classes()).toContain('bg-green-500')
    expect(dots[3]?.classes()).toContain('bg-purple-500')
  })

  it('uses default fraction digits for positive amounts when formatting', () => {
    const wrapper = mount(RateDotList, {
      props: {
        rates: [{ type: 'usdc', amount: 1.239 }]
      }
    })

    expect(wrapper.text()).toContain('USDC 1.24')
  })
})