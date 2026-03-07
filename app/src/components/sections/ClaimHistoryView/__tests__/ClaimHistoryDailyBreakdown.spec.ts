import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import isoWeek from 'dayjs/plugin/isoWeek'
import ClaimHistoryDailyBreakdown from '@/components/sections/ClaimHistoryView/ClaimHistoryDailyBreakdown.vue'
import { getMonthWeeks } from '@/utils/dayUtils'
import { mockUserStore, mockWeeklyClaimData } from '@/tests/mocks'

dayjs.extend(utc)
dayjs.extend(isoWeek)

describe('ClaimHistoryDailyBreakdown', () => {
  const baseAddress = '0x1234567890123456789012345678901234567890'
  const selectedWeek =
    getMonthWeeks(2024, 0).find((week) => week.isoString === '2024-01-01T00:00:00.000Z') ??
    getMonthWeeks(2024, 0)[0]!

  const start = dayjs(selectedWeek.isoString).utc().startOf('isoWeek')
  const day0 = start.toISOString()
  const day1 = start.add(1, 'day').toISOString()

  const createWeeklyClaim = (overrides: Record<string, unknown> = {}) => ({
    ...mockWeeklyClaimData[0],
    status: 'pending',
    wage: {
      ...mockWeeklyClaimData[0]?.wage,
      userAddress: baseAddress
    },
    claims: [
      {
        ...mockWeeklyClaimData[0]?.claims[0],
        id: 1,
        dayWorked: day0,
        hoursWorked: 3,
        memo: 'Daily coding',
        fileAttachments: [
          {
            fileType: 'image/png',
            fileSize: 1200,
            fileKey: 'uploads/proof.png',
            fileUrl: 'https://example.com/proof.png'
          }
        ]
      },
      {
        ...mockWeeklyClaimData[0]?.claims[0],
        id: 2,
        dayWorked: day0,
        hoursWorked: 2,
        memo: 'Review PR',
        fileAttachments: []
      },
      {
        ...mockWeeklyClaimData[0]?.claims[0],
        id: 3,
        dayWorked: day1,
        hoursWorked: 1,
        memo: 'Docs update',
        fileAttachments: [
          {
            fileType: 'application/pdf',
            fileSize: 2200,
            fileKey: '',
            fileUrl: 'https://example.com/report.pdf'
          }
        ]
      }
    ],
    ...overrides
  })

  const createWrapper = (props: Record<string, unknown> = {}) =>
    mount(ClaimHistoryDailyBreakdown, {
      props: {
        selectedWeek,
        memberAddress: baseAddress,
        ...props
      },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          ClaimActions: {
            name: 'ClaimActions',
            template: '<div data-test="claim-actions" />'
          },
          ExpandableFileGallery: {
            name: 'ExpandableFileGallery',
            props: ['previews'],
            template: '<div data-test="expandable-file-gallery">{{ previews.length }}</div>'
          },
          IconifyIcon: {
            name: 'IconifyIcon',
            template: '<span data-test="clock-icon" />'
          },
          Icon: {
            name: 'Icon',
            template: '<span data-test="paperclip-icon" />'
          }
        }
      }
    })

  beforeEach(() => {
    vi.clearAllMocks()
    mockUserStore.address = baseAddress
  })

  it('renders weekly header and all 7 days', () => {
    const wrapper = createWrapper({ weeklyClaim: createWeeklyClaim() })

    expect(wrapper.find('[data-test="daily-breakdown"]').exists()).toBe(true)
    expect(wrapper.text()).toContain(`Weekly Claims: ${selectedWeek?.formatted}`)
    expect(wrapper.findAll('.rounded-lg').length).toBe(7)
  })

  it('shows claim details, attachments, and actions when claims are modifiable', () => {
    const wrapper = createWrapper({ weeklyClaim: createWeeklyClaim() })

    expect(wrapper.text()).toContain('Daily coding')
    expect(wrapper.text()).toContain('Review PR')
    expect(wrapper.text()).toContain('Docs update')
    expect(wrapper.findAll('[data-test="claim-actions"]').length).toBe(3)
  })

  it('computes file previews with image and non-image branches', () => {
    const wrapper = createWrapper({ weeklyClaim: createWeeklyClaim() })
    const galleries = wrapper.findAllComponents({ name: 'ExpandableFileGallery' })
    const firstPreview = galleries[0]?.props('previews')[0]
    const secondPreview = galleries[1]?.props('previews')[0]

    expect(firstPreview.isImage).toBe(true)
    expect(firstPreview.fileName).toBe('proof.png')
    expect(secondPreview.isImage).toBe(false)
    expect(secondPreview.fileName).toBe('file')
  })

  it('hides claim actions when claim is not modifiable by current user', () => {
    const signedWrapper = createWrapper({
      weeklyClaim: createWeeklyClaim({ status: 'signed' })
    })
    expect(signedWrapper.find('[data-test="claim-actions"]').exists()).toBe(false)

    mockUserStore.address = '0x9999999999999999999999999999999999999999'
    const wrongUserWrapper = createWrapper({ weeklyClaim: createWeeklyClaim() })
    expect(wrongUserWrapper.find('[data-test="claim-actions"]').exists()).toBe(false)
  })

  it('renders zero-hour day styling and no attachments for empty weekly claim', () => {
    const wrapper = createWrapper({
      weeklyClaim: {
        ...createWeeklyClaim(),
        claims: []
      }
    })

    expect(wrapper.findAll('.bg-gray-100.text-gray-400').length).toBe(7)
    expect(wrapper.find('[data-test="attachment-icon"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="expandable-file-gallery"]').exists()).toBe(false)
  })

  it('handles missing weeklyClaim safely', () => {
    const wrapper = createWrapper({ weeklyClaim: undefined })
    const vm = wrapper.vm as unknown as { canModifyClaims: boolean }

    expect(wrapper.findAll('.bg-gray-100.text-gray-400').length).toBe(7)
    expect(wrapper.text()).toContain('0 hours')
    expect(wrapper.find('[data-test="claim-actions"]').exists()).toBe(false)
    expect(vm.canModifyClaims).toBe(false)
  })
})
