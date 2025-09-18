import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { TokenId } from '@/constant'
import type { TeamInput } from '@/types'
import type { TransferModel } from '@/components/forms/TransferForm.vue'

// Interface pour identifier les différents types de formulaires
export type FormType =
  | 'addTeam'
  | 'depositBank'
  | 'transfer'
  | 'approveUsers'
  | 'mint'
  | 'payDividends'

// Type pour les budget limits d'approbation
export interface BudgetLimit {
  budgetType: number
  value: number | string | null
}

// Store unifié pour tous les formulaires
export const useFormStore = defineStore('formStore', () => {
  // --- AddTeam Form ---
  const addTeamData = ref<TeamInput>({
    name: '',
    description: '',
    members: []
  })

  const investorContractInput = ref({
    name: '',
    symbol: ''
  })

  // --- DepositBank Form ---
  const depositAmount = ref<string>('')
  const depositSelectedTokenId = ref<TokenId>('native')
  const depositCurrentStep = ref(1)
  const depositIsAmountValid = ref(false)

  // --- Transfer Form ---
  const transferModel = ref<TransferModel>({
    address: { name: '', address: '' },
    token: { symbol: '', balance: 0, tokenId: '' as TokenId },
    amount: '0'
  })
  const transferSelectedTokenId = ref<TokenId>('USDC' as TokenId)

  // --- ApproveUsers Form ---
  const approveInput = ref({ name: '', address: '', token: '' })
  const approveDate = ref<Date | string>('')
  const approveDescription = ref<string>('')
  const approveSelectedOptions = ref<{ [key in 0 | 1 | 2]: boolean }>({
    0: false,
    1: false,
    2: false
  })
  const approveValues = ref<{ [key in 0 | 1 | 2]: null | string | number }>({
    0: null,
    1: null,
    2: null
  })

  // --- Mint Form ---
  const mintInput = ref<{ name: string; address: string }>({
    name: '',
    address: ''
  })
  const mintAmount = ref<number | null>(null)

  // --- Pay Dividends Form ---
  const payDividendsAmount = ref<number | null>(null)

  // step for multi-step forms
  const currentStep = ref(1)

  // function for resetting specific form
  const resetForm = (formType: FormType) => {
    switch (formType) {
      case 'addTeam':
        addTeamData.value = {
          name: '',
          description: '',
          members: []
        }
        investorContractInput.value = {
          name: '',
          symbol: ''
        }
        currentStep.value = 1
        break

      case 'depositBank':
        depositAmount.value = ''
        depositSelectedTokenId.value = 'native'
        depositCurrentStep.value = 1
        depositIsAmountValid.value = false
        break

      case 'transfer':
        transferModel.value = {
          address: { name: '', address: '' },
          token: { symbol: '', balance: 0, tokenId: '' as TokenId },
          amount: '0'
        }
        transferSelectedTokenId.value = 'USDC' as TokenId
        break

      case 'approveUsers':
        approveInput.value = { name: '', address: '', token: '' }
        approveDate.value = ''
        approveDescription.value = ''
        approveSelectedOptions.value = { 0: false, 1: false, 2: false }
        approveValues.value = { 0: null, 1: null, 2: null }
        break

      case 'mint':
        mintInput.value = {
          name: '',
          address: ''
        }
        mintAmount.value = null
        break

      case 'payDividends':
        payDividendsAmount.value = null
        break

      default:
        console.error(`Type de formulaire inconnu: ${formType}`)
    }
  }

  return {
    // AddTeam form state
    addTeamData,
    investorContractInput,

    // DepositBank form state
    depositAmount,
    depositSelectedTokenId,
    depositCurrentStep,
    depositIsAmountValid,

    // Transfer form state
    transferModel,
    transferSelectedTokenId,

    // ApproveUsers form state
    approveInput,
    approveDate,
    approveDescription,
    approveSelectedOptions,
    approveValues,

    // Mint form state
    mintInput,
    mintAmount,

    // Pay Dividends form state
    payDividendsAmount,

    // Common state
    currentStep,

    // Actions
    resetForm
  }
})
