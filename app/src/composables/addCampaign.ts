import { AddCampaignService} from '@/services/AddCampaignService'

import { ref } from 'vue'


const addCamapaignService = new AddCampaignService()

export function useDeployAddCampaignContract() {
  const contractAddress = ref<string | null>(null)
  const loading = ref(false)
  const error = ref()
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



