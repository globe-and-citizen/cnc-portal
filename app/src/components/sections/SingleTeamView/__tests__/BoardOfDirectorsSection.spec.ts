import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import BoardOfDirectorsSection from '@/components/sections/SingleTeamView/BoardOfDirectorsSection.vue'
import { InformationCircleIcon } from '@heroicons/vue/24/outline'
import { setActivePinia, createPinia } from 'pinia'
import { ref } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import type { TransactionResponse } from 'ethers'
import LoadingButton from '@/components/LoadingButton.vue'
// import type { User } from '@/types'
// import {
//   useExpenseAccountTransferOwnership,
//   useExpenseAccountGetOwner
// } from '@/composables/useExpenseAccount'

// import { useBankOwner, useBankTransferOwnership } from '@/composables/bank'
// import { useGetBoardOfDirectors } from '@/composables/bod'

const mockGetBoardOfDirectors = {
  boardOfDirectors: ref<string[] | null>(null),
  isLoading: ref(false),
  error: ref<unknown>(null),
  isSuccess: ref(false),
  execute: vi.fn((bodAddress: string) => {
    if (bodAddress === `0xBodAddress`)
      mockGetBoardOfDirectors.boardOfDirectors.value = [`0xBodMember1`, `0xBodMember2`]
  })
}

vi.mock('@/composables/bod', async (importOriginal) => {
  const actual: Object = await importOriginal()
  return {
    ...actual,
    useGetBoardOfDirectors: vi.fn(() => mockGetBoardOfDirectors)
  }
})

const mockBankTransferOwnership = {
  transaction: ref<TransactionResponse | null>(null),
  isLoading: ref(false),
  error: ref<unknown>(null),
  isSuccess: false,
  execute: vi.fn()
}

vi.mock('@/composables/bank', async (importOriginal) => {
  const actual: Object = await importOriginal()
  return {
    ...actual,
    useBankTransferOwnership: vi.fn(() => mockBankTransferOwnership)
  }
})

describe('BoardOfDirectorsSection', () => {
  setActivePinia(createPinia())

  interface Props {
    team?: {}
  }

  interface ComponentOptions {
    props?: Props
    data?: () => Record<string, unknown>
    global?: Record<string, unknown>
  }

  const createComponent = ({
    props = {},
    data = () => ({}),
    global = {}
  }: ComponentOptions = {}) => {
    return mount(BoardOfDirectorsSection, {
      props: {
        team: {
          expenseAccountAddress: '0xExpenseAccount',
          ownerAddress: '0xOwner',
          ...props?.team
        },
        ...props
      },
      data,
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              user: { address: '0xInitialUser' }
            }
          })
        ],
        ...global
      }
    })
  }

  describe('Render', () => {
    it('should show information icon', () => {
      const team = { expenseAccountAddress: '0x123' }
      const wrapper = createComponent({
        props: {
          team: {
            ...team
          }
        }
      })

      const boardOfDirectorsInformationIcon = wrapper.findComponent(InformationCircleIcon)
      expect(boardOfDirectorsInformationIcon.exists()).toBeTruthy()
    })

    it('should show BOD member\'s name and "Unknown" otherwise', async () => {
      const team = {
        expenseAccountAddress: '0x123',
        boardOfDirectorsAddress: `0xBodAddress`,
        members: [
          { name: 'Member1', address: `0xBodMember1` },
          { name: null, address: `0xBodMember2` }
        ]
      }
      const wrapper = createComponent({
        props: {
          team: {
            ...team
          }
        }
      })

      //mockGetBoardOfDirectors.execute()

      await wrapper.vm.$nextTick()

      //expect(wrapper.find('[data-test="bod-member-name1"]').exists()).toBeTruthy()
      const bodMemberName1 = wrapper.find('[data-test="bod-member-name1"]')
      expect(bodMemberName1.exists()).toBeTruthy()
      expect(bodMemberName1.text()).toContain('Member1')

      const bodMemberName2 = wrapper.find('[data-test="bod-member-name2"]')
      expect(bodMemberName2.exists()).toBeTruthy()
      expect(bodMemberName2.text()).toContain('Unknown')
    })

    it('Should show loading button when transfering bank', async () => {
      const team = {
        expenseAccountAddress: '0x123'
      }
      const wrapper = createComponent({
        props: {
          team: {
            ...team
          }
        }
      })

      // const transferExpenseOwnershipButton = wrapper
      //   .find('[data-test="transfer-expense-ownership-button"]')

      // expect(transferExpenseOwnershipButton.exists()).toBeTruthy()

      mockBankTransferOwnership.isLoading.value = true

      await wrapper.vm.$nextTick()

      expect(wrapper.findComponent(LoadingButton).exists()).toBeTruthy()
    })
  })
})
