import { flushPromises, mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { defineComponent, ref } from 'vue'
import CreateAddCampaign from '@/components/sections/ContractManagementView/forms/CreateAddCampaign.vue'
import { mockDeployState } from '@/tests/mocks/composables.mock'
import { useCreateContractMutation } from '@/queries/contract.queries'
import { useTeamStore } from '@/stores'
import { mockTeamStore } from '@/tests/mocks/store.mock'
import { createMockMutationResponse } from '@/tests/mocks/query.mock'

const mountComponent = () => mount(CreateAddCampaign)

describe('CreateAddCampaign.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders the title and description', () => {
      const wrapper = mountComponent()
      expect(wrapper.text()).toContain('One-time company setup')
      expect(wrapper.text()).toContain('Configure rates')
      expect(wrapper.text()).toContain('Create funded campaigns')
    })

    it('pre-fills the bank address input from the team store', () => {
      const wrapper = mountComponent()
      const input = wrapper.find('[data-testid="bank-address-input"]')
      expect((input.element as HTMLInputElement).value).toBe(
        mockTeamStore.getContractAddressByType('Bank')
      )
    })

    it('disables the confirm button when bank address is missing', () => {
      vi.mocked(useTeamStore).mockReturnValueOnce({
        ...mockTeamStore,
        getContractAddressByType: vi.fn(() => undefined)
      } as unknown as ReturnType<typeof useTeamStore>)
      const wrapper = mountComponent()
      const btn = wrapper.find('[data-test="confirm-button"]')
      expect(btn.attributes('disabled')).toBeDefined()
    })

    it('shows the confirm button as not-loading by default', () => {
      const wrapper = mountComponent()
      const btn = wrapper.find('[data-test="confirm-button"]')
      expect(btn.attributes('disabled')).toBeUndefined()
    })

    it('disables the confirm button while deploying', async () => {
      mockDeployState.isDeploying.value = true
      const wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      expect(wrapper.find('[data-test="confirm-button"]').attributes('disabled')).toBeDefined()
    })

    it('shows error alert when submissionError is set (bank missing at startup)', () => {
      vi.mocked(useTeamStore).mockReturnValueOnce({
        ...mockTeamStore,
        getContractAddressByType: vi.fn(() => undefined)
      } as unknown as ReturnType<typeof useTeamStore>)
      const wrapper = mountComponent()
      const alert = wrapper.find('[data-test="deploy-error-alert"]')
      expect(alert.exists()).toBe(true)
    })

    it('shows no error alert when everything is fine', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('[data-test="deploy-error-alert"]').exists()).toBe(false)
    })
  })

  describe('errorMessage computed', () => {
    it('shows deploy error with shortMessage containing "User rejected"', async () => {
      mockDeployState.error.value = Object.assign(new Error('rejected'), {
        shortMessage: 'User rejected the request'
      })
      const wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      expect(wrapper.find('[data-test="deploy-error-alert"]').exists()).toBe(true)
    })

    it('shows deploy error with shortMessage not containing "User rejected"', async () => {
      mockDeployState.error.value = Object.assign(new Error('low funds'), {
        shortMessage: 'insufficient funds'
      })
      const wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      expect(wrapper.find('[data-test="deploy-error-alert"]').exists()).toBe(true)
    })

    it('shows deploy error with only .message when shortMessage is absent', async () => {
      mockDeployState.error.value = new Error('network failure')
      const wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      expect(wrapper.find('[data-test="deploy-error-alert"]').exists()).toBe(true)
    })

    it('falls back to default message when error has neither shortMessage nor message', async () => {
      const errorWithoutMessage = {} as Error
      mockDeployState.error.value = errorWithoutMessage
      const wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      expect(wrapper.find('[data-test="deploy-error-alert"]').exists()).toBe(true)
    })
  })

  describe('form submission', () => {
    it('calls deploy with correct args when form is valid', async () => {
      const wrapper = mountComponent()
      // Set formState directly (UInput's v-model needs reactivity system to propagate)
      const setupState = wrapper.getCurrentComponent().setupState as Record<string, unknown>
      const formState = setupState.formState as { costPerClick: string; costPerImpression: string }
      formState.costPerClick = '0.5'
      formState.costPerImpression = '0.2'
      await wrapper.vm.$nextTick()
      await wrapper.find('form').trigger('submit')
      await flushPromises()
      expect(mockDeployState.deploy).toHaveBeenCalledWith(
        mockTeamStore.getContractAddressByType('Bank'),
        '0.5',
        '0.2'
      )
    })

    it('normalizes numeric input values before deploying', async () => {
      const wrapper = mountComponent()
      const setupState = wrapper.getCurrentComponent().setupState as Record<string, unknown>
      const formState = setupState.formState as {
        costPerClick: string | number
        costPerImpression: string | number
      }
      formState.costPerClick = 1
      formState.costPerImpression = 1

      await wrapper.vm.$nextTick()
      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(mockDeployState.deploy).toHaveBeenCalledWith(
        mockTeamStore.getContractAddressByType('Bank'),
        '1',
        '1'
      )
    })

    it('sets submissionError and skips deploy when bankAddress is missing', async () => {
      vi.mocked(useTeamStore).mockReturnValueOnce({
        ...mockTeamStore,
        getContractAddressByType: vi.fn(() => undefined)
      } as unknown as ReturnType<typeof useTeamStore>)
      const wrapper = mountComponent()
      // Set form values via setupState so validation passes and deployAdCampaign is called
      const formState = (wrapper.getCurrentComponent().setupState as Record<string, unknown>)
        .formState as { costPerClick: string; costPerImpression: string }
      formState.costPerClick = '0.5'
      formState.costPerImpression = '0.2'
      await wrapper.vm.$nextTick()
      await wrapper.find('form').trigger('submit')
      await flushPromises()
      expect(mockDeployState.deploy).not.toHaveBeenCalled()
    })

    it('does not call deploy when costPerClick is invalid (empty)', async () => {
      const wrapper = mountComponent()
      await wrapper.find('form').trigger('submit')
      await flushPromises()
      expect(mockDeployState.deploy).not.toHaveBeenCalled()
      expect(wrapper.text()).toContain('Required')
      expect(wrapper.text()).not.toContain('Invalid input')
    })
  })

  describe('contractAddress watcher', () => {
    it('emits closeAddCampaignModal and shows toast on successful contract creation', async () => {
      vi.mocked(useCreateContractMutation).mockReturnValueOnce({
        ...createMockMutationResponse(),
        mutate: vi.fn((_variables, options) => options?.onSuccess?.(undefined))
      } as unknown as ReturnType<typeof useCreateContractMutation>)
      const wrapper = mountComponent()
      mockDeployState.contractAddress.value = '0xDeployedContract'
      await flushPromises()
      expect(wrapper.emitted('closeAddCampaignModal')).toBeTruthy()
    })

    it('stays open and shows error toast when createContract mutation fails', async () => {
      vi.mocked(useCreateContractMutation).mockReturnValueOnce({
        ...createMockMutationResponse(),
        mutate: vi.fn((_variables, options) => options?.onError?.(new Error('backend down')))
      } as unknown as ReturnType<typeof useCreateContractMutation>)

      const wrapper = mountComponent()
      mockDeployState.contractAddress.value = '0xDeployedContract'
      await flushPromises()
      expect(wrapper.emitted('closeAddCampaignModal')).toBeFalsy()
    })

    it('does nothing when newAddress is set but currentTeam is null', async () => {
      vi.mocked(useTeamStore).mockReturnValueOnce({
        ...mockTeamStore,
        currentTeam: null
      } as unknown as ReturnType<typeof useTeamStore>)

      const wrapper = mountComponent()
      mockDeployState.contractAddress.value = '0xDeployedContract'
      await flushPromises()
      expect(wrapper.emitted('closeAddCampaignModal')).toBeFalsy()
    })

    it('does nothing when newAddress is null (watcher fires with null)', async () => {
      const wrapper = mountComponent()

      mockDeployState.contractAddress.value = null
      await flushPromises()
      expect(wrapper.emitted('closeAddCampaignModal')).toBeFalsy()
    })
  })

  describe('reset()', () => {
    it('clears costPerClick, costPerImpression and form fields', async () => {
      // `reset()` is a public API exposed via defineExpose for parent components
      // to call by ref. Mount inside a parent harness and drive the child
      // through its exposed instance — no vm cast required.
      const ParentHarness = defineComponent({
        components: { CreateAddCampaign },
        setup() {
          const child = ref<{ reset: () => void } | null>(null)
          const callReset = () => child.value?.reset()
          return { child, callReset }
        },
        template: `<CreateAddCampaign ref="child" />`
      })
      const wrapper = mount(ParentHarness)

      const inputs = wrapper.findAll('input[type="number"]')
      await inputs[0]!.setValue('1')
      await inputs[1]!.setValue('2')

      // `callReset` is provided by the harness and triggers the exposed reset()
      ;(wrapper.vm.callReset as () => void)()
      await wrapper.vm.$nextTick()

      expect((wrapper.findAll('input[type="number"]')[0]!.element as HTMLInputElement).value).toBe(
        ''
      )
      expect((wrapper.findAll('input[type="number"]')[1]!.element as HTMLInputElement).value).toBe(
        ''
      )
    })
  })

  describe('viewContractCode()', () => {
    it('opens the correct URL in a new tab', async () => {
      const openSpy = vi.spyOn(window, 'open').mockImplementation(vi.fn())
      const wrapper = mountComponent()
      const viewCodeBtn = wrapper
        .findAll('button')
        .find((b) => b.text() === 'Review contract source')
      expect(viewCodeBtn).toBeDefined()
      await viewCodeBtn!.trigger('click')
      expect(openSpy).toHaveBeenCalledWith(
        'https://github.com/globe-and-citizen/cnc-portal/blob/develop/contract/contracts/AdCampaignManager.sol',
        '_blank'
      )
      openSpy.mockRestore()
    })
  })
})
