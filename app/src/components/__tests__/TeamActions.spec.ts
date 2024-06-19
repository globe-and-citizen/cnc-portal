import TeamActions from '../TeamActions.vue'
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import {} from 'node:test'

describe('TeamActions.vue', () => {
  const wrapperWithBankAddr = mount(TeamActions, {
    props: {
      team: {
        name: 'Team',
        members: [],
        description: 'Team Description',
        bankAddress: '0x298239889hc8923'
      }
    }
  })
  const wrapperWithoutBankAddr = mount(TeamActions, {
    props: { team: { name: 'Team', members: [], description: 'Team Description' } }
  })
  describe('render', () => {
    it('Renders Create Bank Account Button correctly when bankAddress is not present', () => {
      expect(wrapperWithoutBankAddr.find('[data-test="createBank"]').text()).toContain(
        'Create Bank Account Smart Contract'
      )
    })
    it('Renders Deposit and Transfer when bankAddress is present', () => {
      expect(wrapperWithBankAddr.find('[data-test="deposit"]').text()).toContain('Deposit')
      expect(wrapperWithBankAddr.find('[data-test="transfer"]').text()).toContain('Transfer')
    })
  })
  describe('emits', () => {
    it('emits createBank when Create Bank Account button is clicked', async () => {
      await wrapperWithoutBankAddr.find('[data-test="createBank"]').trigger('click')
      expect(wrapperWithoutBankAddr.emitted('createBank')).toBeTruthy()
    })
    it('emits deposit when Deposit button is clicked', async () => {
      await wrapperWithBankAddr.find('[data-test="deposit"]').trigger('click')
      expect(wrapperWithBankAddr.emitted('deposit')).toBeTruthy()
    })
    it('emits transfer when Transfer button is clicked', async () => {
      await wrapperWithBankAddr.find('[data-test="transfer"]').trigger('click')
      expect(wrapperWithBankAddr.emitted('transfer')).toBeTruthy()
    })
  })
})
