import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import RateDotList from '@/components/RateDotList.vue'
import { NETWORK } from '@/constant'

describe('RateDotList', () => {
  it('renders each rate row with its type and formatted token label', () => {
    const wrapper = mount(RateDotList, {
      props: {
        rates: [
          { type: 'native', amount: 1.5 },
          { type: 'usdc', amount: 2.5 },
          { type: 'usdt', amount: 0 },
          { type: 'sher', amount: 3.456 }
        ],
        textClass: 'text-emerald-700',
        minimumFractionDigits: 1,
        maximumFractionDigits: 2
      }
    })

    const rows = wrapper.findAll('[data-test="rate-row"]')

    expect(rows).toHaveLength(4)
    expect(rows.map((r) => r.attributes('data-rate-type'))).toEqual([
      'native',
      'usdc',
      'usdt',
      'sher'
    ])
    expect(rows[0]?.text()).toContain(`${NETWORK.currencySymbol} 1.5`)
    expect(rows[1]?.text()).toContain('USDC 2.5')
    expect(rows[2]?.text()).toContain('USDT 0')
    expect(rows[3]?.text()).toContain('SHER 3.46')
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
