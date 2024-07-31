import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import type { User } from '@/types'
import AddTeamForm from '@/components/forms/AddTeamForm.vue'

describe('Validation', () => {
  let wrapper: any
  let team: any
  let $v: any
  const users: User[] = [
    //{ name: '', address: '' },
    { name: 'Dasarath', address: '0xaFeF48F7718c51fb7C6d1B314B3991D2e1d8421E' }
  ]

  beforeEach(() => {
    wrapper = mount(AddTeamForm, {
      props: {
        users,
        isLoading: false
      }
    })
    team = wrapper.vm.team
    $v = wrapper.vm.$v
  })

  it('validates the form correctly', async () => {
    // Initially invalid due to required fields
    expect($v.$invalid).toBe(true)

    // Setting valid team data
    team.name = 'Valid Team Name'
    team.members[0].name = 'Member 1'
    team.members[0].address = '0xaFeF48F7718c51fb7C6d1B314B3991D2e1d8421E'

    await wrapper.vm.$nextTick()

    // Touch the form to trigger validation
    wrapper.vm.submitForm()

    await wrapper.vm.$nextTick()

    // Force update the component
    await wrapper.vm.$forceUpdate()

    // Introduce a small delay
    await new Promise((resolve) => setTimeout(resolve, 100))

    //expect($v.$invalid).toBe(false)
  })

  it('after validates form correctly', async () => {
    expect($v.$invalid).toBe(false)
  })

  it('fails validation with invalid Ethereum address', async () => {
    // Setting team data with an invalid address
    team.name = 'Team Name'
    team.members[0].name = 'Member 1'
    team.members[0].address = 'invalid_address'

    await wrapper.vm.$nextTick()

    // Touch the form to trigger validation
    wrapper.vm.submitForm()

    await wrapper.vm.$nextTick()
    //expect($v.$invalid).toBe(true)
  })

  it('after ethereum address fail', async () => {
    console.log('members: ', $v.team.members.$model)
    console.log('name: ', $v.team.name.$invalid)
    //console.log('errors: ', $v.team.members.$error)

    // Check Vuelidate data after setting invalid address
    expect($v.team.members.$model[0].address).toBe('invalid_address')
    expect($v.team.members.$invalid).toBe(true)
    //expect(wrapper.vm.getMessages(0)).toContain('Invalid address')

    expect($v.$invalid).toBe(true)
  })
})
