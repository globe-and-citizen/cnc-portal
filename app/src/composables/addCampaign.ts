import { AddCampaignService} from '@/services/AddCampaignService'
import type { BankEventType, EventResult } from '@/types'
import type { IContractReadFunction, IContractTransactionFunction } from '@/types/interfaces'
import dayjs from 'dayjs'
import type { Log } from 'ethers'
import type { EventLog } from 'ethers'
import { ref } from 'vue'
import { useCustomFetch } from '@/composables/useCustomFetch'


const addCamapaignService = new AddCampaignService()

export function useDeployAddCampaignContract() {
  const contractAddress = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<any>(null)
  const isSuccess = ref(false)
  
  
  async function deploy(bankContractAddress:string, costPerClick:number,costPerImpression:number, deployerAddress:string,teamId:string) {
    try {
      
      if (costPerClick <= 0 || costPerImpression <= 0) {
        throw new Error('Cost per click and cost per impression must be greater than zero.');
      }
      loading.value = true
      contractAddress.value = await addCamapaignService.createAdCampaignManager(bankContractAddress.toString(),costPerClick.toString(),costPerImpression.toString(),deployerAddress,teamId)
      isSuccess.value = true
    } catch (err) {
      error.value = err
      console.error(err)
    } finally {
      loading.value = false
    }
  }

  return { execute: deploy, isLoading: loading, isSuccess, error, contractAddress }
}



export function useAddCampaignEvents(addCampaignAddress: string) {
  const events = ref<EventResult[]>([])
  const loading = ref(false)
  const error = ref<any>(null)

  async function getEvents(type: BankEventType): Promise<void> {
    try {
      loading.value = true
      const response = await addCamapaignService.getEvents(addCampaignAddress, "CampaignCreated")
      events.value = await Promise.all(
        response.map(async (eventData: EventLog | Log) => {
          const date = dayjs((await eventData.getBlock()).date).format('DD/MM/YYYY HH:mm')

          return {
            txHash: eventData.transactionHash,
            date: date,
            data: (await addCamapaignService.getContract(addCampaignAddress)).interface.decodeEventLog(
              type,
              eventData.data,
              eventData.topics
            )
          }
        })
      )
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { events, getEvents, loading, error }
}
