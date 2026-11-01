import { afterEach, describe, expect, it } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import SafeAddModal from '../SafeAddModal.vue'
import { mockTeamStore } from '@/tests/mocks'

const NEW_SAFE = '0xcccccccccccccccccccccccccccccccccccccccc'

let wrapper: VueWrapper | undefined

function mountModal() {
  mockTeamStore.currentTeamId = '1'
  wrapper = mount(SafeAddModal, {
    global: { stubs: { SafeDeploymentCard: true, SafeImportCard: true } }
  })
  return wrapper
}

describe('[US-SAFE-001] SafeAddModal', () => {
  afterEach(() => wrapper?.unmount())

  it('renders deploy as the main action and import as the secondary one', () => {
    const modal = mountModal()

    expect(modal.findComponent('[data-test="safe-add-deploy-button"]').props('color')).toBe(
      'primary'
    )
    expect(modal.findComponent('[data-test="safe-add-import-button"]').props('color')).toBe(
      'secondary'
    )
  })

  it('opens the deployment card for the current team', async () => {
    const modal = mountModal()

    await modal.find('[data-test="safe-add-deploy-button"]').trigger('click')

    const card = modal.findComponent({ name: 'SafeDeploymentCard' })
    expect(card.props()).toMatchObject({ teamId: 1 })
    expect(modal.findComponent({ name: 'SafeImportCard' }).exists()).toBe(false)
  })

  it('opens the import card for the current team', async () => {
    const modal = mountModal()

    await modal.find('[data-test="safe-add-import-button"]').trigger('click')

    const card = modal.findComponent({ name: 'SafeImportCard' })
    expect(card.props()).toMatchObject({ teamId: 1 })
    expect(modal.findComponent({ name: 'SafeDeploymentCard' }).exists()).toBe(false)
  })

  it('[AC-US-SAFE-001-12] closes once a card registers the new Safe', async () => {
    const modal = mountModal()
    await modal.find('[data-test="safe-add-import-button"]').trigger('click')

    modal.findComponent({ name: 'SafeImportCard' }).vm.$emit('safe-imported', NEW_SAFE)
    await flushPromises()

    expect(modal.findComponent({ name: 'SafeImportCard' }).exists()).toBe(false)
  })
})
