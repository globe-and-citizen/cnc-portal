import {mount} from '@vue/test-utils'
import {describe, it, expect } from 'vitest'
import TeamContractAdmins from '@/components/TeamContractAdmins.vue'

describe('TeamContractAdmins', ()=>{
    const adminsData= ['0x1234567890abcdef','0xfedcba0987654321']

    it('renders table headers correctly ',()=>{
        const wrapper = mount(TeamContractAdmins,{
            props:{
                admins:adminsData
            }
        })
        //check table headers
        const headers= wrapper.findAll('th')
        expect(headers[0].text()).toBe('#')
        expect(headers[1].text()).toBe('Admin Address')
        expect(headers[2].text()).toBe('Action')

    })

    it('renders the admin data correctly',()=>{
        const wrapper = mount(TeamContractAdmins,{
            props:{
                admins:adminsData
            }
        })
        
        //check number of rows for admins
        const rows= wrapper.findAll('tbody tr')
        expect(rows.length).toBe(adminsData.length)

        //check first admin row
        expect(rows[0].find('th').text()).toBe('1')//Index
        expect(rows[0].findAll('td')[0].text()).toBe(adminsData[0])//
        expect(rows[0].findAll('td')[1].find('button').exists()).toBe(true)//Remove button exists
    
       //check second admin row
       expect(rows[1].find('th').text()).toBe('2')//Index
       expect(rows[1].findAll('td')[0].text()).toBe(adminsData[1])//
       expect(rows[1].findAll('td')[1].find('button').exists()).toBe(true)//Remove button exists
    })

    // it('emits "removeAdmin" when the remove button is clicked', async()=>{
    //     const wrapper= mount(TeamContractAdmins,{
    //         props:{
    //             admins:adminsData
    //         }
    //     })

    //     //simulate clicking the "Remove" button for the first admin
    //     await  wrapper.findAll('tbody tr')[0].find('button').trigger('click')

    //     //Check that the event was emitted with the correct payload
    //     expect(wrapper.emitted('removeAdmin')).toHaveLength(1)
    //     expect(wrapper.emitted('removeAdmin')![0]).toEqual([adminsData[0]])
    // })

    
})