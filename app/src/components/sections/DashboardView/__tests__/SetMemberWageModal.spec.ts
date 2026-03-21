// import { flushPromises, mount } from '@vue/test-utils'
// import { describe, expect, it, beforeEach, vi } from 'vitest'
// import { ref } from 'vue'
// import SetMemberWageModal from '../SetMemberWageModal.vue'
// import { createTestingPinia } from '@pinia/testing'
// import type { Wage } from '@/types'
// import { NETWORK } from '@/constant'

// const mockMutate = vi.fn()
// const mockAddSuccessToast = vi.fn()

// vi.mock('@/queries/wage.queries', () => ({
//   useSetMemberWageMutation: () => ({
//     mutate: mockMutate,
//     isPending: ref(false),
//     error: ref(null)
//   })
// }))

// vi.mock('@/stores', () => ({
//   useToastStore: () => ({
//     addSuccessToast: mockAddSuccessToast
//   })
// }))

// describe('SetMemberWageModal.vue', () => {
//   const baseProps = {
//     member: {
//       address: '0x1234567890123456789012345678901234567890',
//       name: 'Member One'
//     },
//     teamId: 7
//   }

//   const existingWage: Wage = {
//     id: 1,
//     teamId: 7,
//     userAddress: '0x1234567890123456789012345678901234567890',
//     ratePerHour: [
//       { type: 'native', amount: 10 },
//       { type: 'sher', amount: 10 }
//     ],
//     overtimeRatePerHour: [
//       { type: 'native', amount: 15 },
//       { type: 'sher', amount: 15 }
//     ],
//     maximumOvertimeHoursPerWeek: 8,
//     maximumHoursPerWeek: 40,
//     nextWageId: null,
//     createdAt: '2026-03-18T00:00:00.000Z',
//     updatedAt: '2026-03-18T00:00:00.000Z'
//   }

//   const createWrapper = (props: Partial<typeof baseProps> & { wage?: Wage } = {}) => {
//     return mount(SetMemberWageModal, {
//       props: {
//         ...baseProps,
//         ...props
//       },
//       global: {
//         plugins: [
//           createTestingPinia({
//             createSpy: vi.fn
//           })
//         ]
//       }
//     })
//   }

//   beforeEach(() => {
//     mockMutate.mockReset()
//     mockAddSuccessToast.mockReset()
//   })

//   it('opens on step 1 with overtime option card', async () => {
//     const wrapper = createWrapper()

//     await wrapper.get('[data-test="set-wage-button"]').trigger('click')

//     expect(wrapper.find('[data-test="standard-wage-step"]').exists()).toBe(true)
//     expect(wrapper.find('[data-test="overtime-rules-step"]').exists()).toBe(false)
//     expect(wrapper.get('[data-test="enable-overtime-checkbox"]').exists()).toBe(true)
//   })

//   it('submits immediately when overtime is disabled', async () => {
//     const wrapper = createWrapper()

//     await wrapper.get('[data-test="set-wage-button"]').trigger('click')
//     await wrapper.get('[data-test="max-hours-input"]').setValue('40')
//     await wrapper.get('[data-test="toggle-hourly-rate-native"]').setValue(true)
//     await wrapper.get('[data-test="hourly-rate-input"]').setValue('10')
//     await wrapper.get('[data-test="add-wage-button"]').trigger('click')

//     expect(mockMutate).toHaveBeenCalledWith(
//       {
//         body: {
//           teamId: 7,
//           userAddress: '0x1234567890123456789012345678901234567890',
//           ratePerHour: [{ type: 'native', amount: 10 }],
//           overtimeRatePerHour: null,
//           maximumOvertimeHoursPerWeek: null,
//           maximumHoursPerWeek: 40
//         }
//       },
//       expect.any(Object)
//     )
//   })

//   it('moves to step 2 when overtime is enabled', async () => {
//     const wrapper = createWrapper()

//     await wrapper.get('[data-test="set-wage-button"]').trigger('click')
//     await wrapper.get('[data-test="max-hours-input"]').setValue('40')
//     await wrapper.get('[data-test="toggle-hourly-rate-native"]').setValue(true)
//     await wrapper.get('[data-test="hourly-rate-input"]').setValue('10')
//     await wrapper.get('[data-test="enable-overtime-checkbox"]').setValue(true)
//     await wrapper.get('[data-test="add-wage-button"]').trigger('click')
//     await flushPromises()

//     expect(wrapper.find('[data-test="standard-wage-step"]').exists()).toBe(false)
//     expect(wrapper.find('[data-test="overtime-rules-step"]').exists()).toBe(true)
//     expect(wrapper.get('[data-test="overtime-banner"]').text()).toContain('40 hrs/wk')
//     expect(wrapper.get('[data-test="overtime-hours-input"]').element).toBeTruthy()
//     expect(wrapper.get('[data-test="standard-rate-recap"]').text()).toContain(
//       `10 ${NETWORK.currencySymbol}/hr`
//     )
//   })

//   it('submits overtime rates from step 2', async () => {
//     const wrapper = createWrapper()

//     await wrapper.get('[data-test="set-wage-button"]').trigger('click')
//     await wrapper.get('[data-test="max-hours-input"]').setValue('40')
//     await wrapper.get('[data-test="toggle-hourly-rate-native"]').setValue(true)
//     await wrapper.get('[data-test="hourly-rate-input"]').setValue('10')
//     await wrapper.get('[data-test="enable-overtime-checkbox"]').setValue(true)
//     await wrapper.get('[data-test="add-wage-button"]').trigger('click')
//     await flushPromises()

//     await wrapper.get('[data-test="overtime-hours-input"]').setValue('8')
//     await wrapper.get('[data-test="toggle-overtime-rate-native"]').setValue(true)
//     await wrapper.get('[data-test="overtime-hourly-rate-input"]').setValue('15')
//     await wrapper.get('[data-test="save-overtime-wage-button"]').trigger('click')

//     expect(mockMutate).toHaveBeenCalledWith(
//       {
//         body: {
//           teamId: 7,
//           userAddress: '0x1234567890123456789012345678901234567890',
//           ratePerHour: [{ type: 'native', amount: 10 }],
//           overtimeRatePerHour: [{ type: 'native', amount: 15 }],
//           maximumOvertimeHoursPerWeek: 8,
//           maximumHoursPerWeek: 40
//         }
//       },
//       expect.any(Object)
//     )
//   })

//   it('initializes existing overtime data and allows going back', async () => {
//     const wrapper = createWrapper({ wage: existingWage })

//     await wrapper.get('[data-test="set-wage-button"]').trigger('click')
//     await wrapper.get('[data-test="enable-overtime-checkbox"]').setValue(true)
//     await wrapper.get('[data-test="add-wage-button"]').trigger('click')
//     await flushPromises()

//     expect(wrapper.get('[data-test="overtime-rate-recap"]').text()).toContain(
//       `15 ${NETWORK.currencySymbol}/hr`
//     )

//     await wrapper.get('[data-test="back-wage-button"]').trigger('click')

//     expect(wrapper.find('[data-test="standard-wage-step"]').exists()).toBe(true)
//   })
// })
