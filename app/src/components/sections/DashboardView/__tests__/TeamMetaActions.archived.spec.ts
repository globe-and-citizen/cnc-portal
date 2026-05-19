import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import { useTeamStore } from '@/stores'
import { useTeamWriteGuard } from '@/composables/useTeamWriteGuard'
import TeamMetaUpdateModal from '../TeamMetaUpdateModal.vue'
import AddMemberForm from '../forms/AddMemberForm.vue'
import InvestInSafeAction from '@/components/sections/SherTokenView/InvestorActions/InvestInSafeAction.vue'
import ElectionActions from '@/components/sections/AdministrationView/ElectionActions.vue'

const archivedTeamMeta = {
  data: {
    id: '1',
    name: 'Archived Co',
    description: 'Description long enough for tests.',
    ownerAddress: '0xOWNER',
    members: [],
    teamContracts: [],
    isHidden: false,
    isArchived: true
  }
}

const activeTeamMeta = { ...archivedTeamMeta, data: { ...archivedTeamMeta.data, isArchived: false } }

vi.mock('@/queries/team.queries', () => ({
  useUpdateTeamMutation: vi.fn(() => ({
    mutate: vi.fn(),
    reset: vi.fn(),
    isPending: ref(false),
    error: ref(null)
  }))
}))

vi.mock('@/queries/member.queries', () => ({
  useAddMembersMutation: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: ref(false),
    error: ref(null)
  }))
}))

vi.mock('@/composables/elections', () => ({
  useBoDElections: vi.fn(() => ({
    formattedElection: ref(null),
    electionStatus: ref(null),
    owner: ref('0xOWNER')
  }))
}))

vi.mock('@/composables/safeDepositRouter/reads', () => ({
  useSafeDepositRouterDepositsEnabled: vi.fn(() => ({ data: ref(true), isLoading: ref(false) })),
  useSafeDepositRouterPaused: vi.fn(() => ({ data: ref(false), isLoading: ref(false) }))
}))

vi.mock('@/stores', () => ({
  useTeamStore: vi.fn(),
  useUserDataStore: vi.fn(() => ({ address: '0xOWNER' }))
}))

describe('archived team write guard (TeamMetaActions)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('TeamMetaUpdateModal', () => {
    it('disables update when team is archived', () => {
      vi.mocked(useTeamStore).mockReturnValue({
        currentTeamId: '1',
        currentTeamMeta: archivedTeamMeta
      } as never)

      const wrapper = mount(TeamMetaUpdateModal, {
        global: {
          plugins: [createTestingPinia()],
          stubs: { UModal: { template: '<div><slot /><slot name="body" /></div>' } }
        }
      })

      const btn = wrapper.find('[data-test="team-meta-update-open"]')
      expect(btn.attributes('disabled')).toBeDefined()
    })

    it('enables update when team is not archived', () => {
      vi.mocked(useTeamStore).mockReturnValue({
        currentTeamId: '1',
        currentTeamMeta: activeTeamMeta
      } as never)

      const wrapper = mount(TeamMetaUpdateModal, {
        global: {
          plugins: [createTestingPinia()],
          stubs: { UModal: { template: '<div><slot /><slot name="body" /></div>' } }
        }
      })

      const btn = wrapper.find('[data-test="team-meta-update-open"]')
      expect(btn.attributes('disabled')).toBeUndefined()
    })
  })

  describe('AddMemberForm', () => {
    it('disables submit when team is archived', () => {
      vi.mocked(useTeamStore).mockReturnValue({
        currentTeamMeta: archivedTeamMeta
      } as never)

      const wrapper = mount(AddMemberForm, {
        props: { teamId: '1' },
        global: {
          plugins: [createTestingPinia()],
          stubs: { MultiSelectMemberInput: true }
        }
      })

      expect(wrapper.find('[data-test="add-members-submit"]').attributes('disabled')).toBeDefined()
    })

    it('enables submit when team is not archived', () => {
      vi.mocked(useTeamStore).mockReturnValue({
        currentTeamMeta: activeTeamMeta
      } as never)

      const wrapper = mount(AddMemberForm, {
        props: { teamId: '1' },
        global: {
          plugins: [createTestingPinia()],
          stubs: { MultiSelectMemberInput: true }
        }
      })

      expect(wrapper.find('[data-test="add-members-submit"]').attributes('disabled')).toBeUndefined()
    })
  })

  describe('InvestInSafeAction', () => {
    it('disables invest when team is archived', () => {
      vi.mocked(useTeamStore).mockReturnValue({
        currentTeamId: '1',
        currentTeamMeta: archivedTeamMeta,
        getContractAddressByType: vi.fn(() => '0xSAFE')
      } as never)

      const wrapper = mount(InvestInSafeAction, {
        global: {
          plugins: [createTestingPinia()],
          stubs: { UModal: true, SafeDepositRouterForm: true }
        }
      })

      expect(wrapper.find('[data-test="invest-in-safe-button"]').attributes('disabled')).toBeDefined()
    })

    it('does not block invest via archive guard when team is not archived', () => {
      vi.mocked(useTeamStore).mockReturnValue({
        currentTeamId: '1',
        currentTeamMeta: activeTeamMeta,
        getContractAddressByType: vi.fn(() => '0xSAFE')
      } as never)

      mount(InvestInSafeAction, {
        global: {
          plugins: [createTestingPinia()],
          stubs: { UModal: true, SafeDepositRouterForm: true, ActionButton: true }
        }
      })

      const { isWriteDisabled } = useTeamWriteGuard()
      expect(isWriteDisabled.value).toBe(false)
    })
  })

  describe('ElectionActions', () => {
    it('disables create election when team is archived', () => {
      vi.mocked(useTeamStore).mockReturnValue({
        currentTeamId: '1',
        currentTeamMeta: archivedTeamMeta
      } as never)

      const wrapper = mount(ElectionActions, {
        props: { electionId: 1n },
        global: {
          plugins: [createTestingPinia()],
          stubs: { PublishResult: true },
          provide: { showPublishResultBtn: false }
        }
      })

      const btn = wrapper.find('button')
      expect(btn.attributes('disabled')).toBeDefined()
    })
  })

  describe('reactive unarchive', () => {
    it('re-enables update button when isArchived becomes false', async () => {
      const teamData = ref({ ...archivedTeamMeta.data })

      vi.mocked(useTeamStore).mockReturnValue({
        currentTeamId: '1',
        currentTeamMeta: { data: teamData }
      } as never)

      const wrapper = mount(TeamMetaUpdateModal, {
        global: {
          plugins: [createTestingPinia()],
          stubs: { UModal: { template: '<div><slot /><slot name="body" /></div>' } }
        }
      })

      expect(wrapper.find('[data-test="team-meta-update-open"]').attributes('disabled')).toBeDefined()

      teamData.value = { ...teamData.value, isArchived: false }
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-test="team-meta-update-open"]').attributes('disabled')).toBeUndefined()
    })
  })
})
