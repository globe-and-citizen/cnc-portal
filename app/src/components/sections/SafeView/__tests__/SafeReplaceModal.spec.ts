import { afterEach, describe, expect, it } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import SafeReplaceModal from '../SafeReplaceModal.vue'
import { mockTeamStore } from '@/tests/mocks'

const NEW_SAFE = '0xcccccccccccccccccccccccccccccccccccccccc'

let wrapper: VueWrapper | undefined

function mountModal() {
  mockTeamStore.currentTeamId = '1'
  wrapper = mount(SafeReplaceModal, {
    global: { stubs: { SafeDeploymentCard: true, SafeImportCard: true } }
  })
  return wrapper
}

describe('[US-SAFE-001] SafeReplaceModal', () => {
  afterEach(() => wrapper?.unmount())

  it('opens the deployment card in replacement mode', async () => {
    const modal = mountModal()

    await modal.find('[data-test="safe-replace-deploy-button"]').trigger('click')

    const card = modal.findComponent({ name: 'SafeDeploymentCard' })
    expect(card.props()).toMatchObject({ teamId: 1, replace: true })
    expect(modal.findComponent({ name: 'SafeImportCard' }).exists()).toBe(false)
  })

  it('opens the import card in replacement mode', async () => {
    const modal = mountModal()

    await modal.find('[data-test="safe-replace-import-button"]').trigger('click')

    const card = modal.findComponent({ name: 'SafeImportCard' })
    expect(card.props()).toMatchObject({ teamId: 1, replace: true })
    expect(modal.findComponent({ name: 'SafeDeploymentCard' }).exists()).toBe(false)
  })

  it('closes and reports the new Safe once a card registers it', async () => {
    const modal = mountModal()
    await modal.find('[data-test="safe-replace-import-button"]').trigger('click')

    modal.findComponent({ name: 'SafeImportCard' }).vm.$emit('safe-imported', NEW_SAFE)
    await flushPromises()

    expect(modal.emitted('safe-replaced')).toEqual([[NEW_SAFE]])
    expect(modal.findComponent({ name: 'SafeImportCard' }).exists()).toBe(false)
  })
})
