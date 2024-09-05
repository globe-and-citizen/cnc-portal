<template>
  <div v-if="ownerAddress">

  </div>
  <div class="flex justify-center items-center" v-else>
    <button
      class="btn btn-primary"
      @click="async () => await deployExpenseAccount()"
      data-test="createExpenseAccount"
    >
      Create Expense Account
    </button>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { Team } from "@/types";
import { 
  useDeployExpenseAccountContract, 
  useExpenseAccountGetOwner,
  useExpenseAccountGetBalance,
  useExpenseAccountIsApprovedAddress 
} from "@/composables/useExpenseAccount";
import { EXPENSE_ACCOUNT_ADDRESS } from "@/constant";

const props = defineProps<{team: Partial<Team>}>()
const approvedAddresses = ref<{[key: string]: boolean}>({})

const {
  data: contractAddress,
  execute: executeDeployExpenseAccount
} = useDeployExpenseAccountContract()

const {
  data: ownerAddress,
  execute: executeExpenseAccountGetOwner
} = useExpenseAccountGetOwner()

const {
  data: contractBalance,
  execute: executeExpenseAccountGetBalance
} = useExpenseAccountGetBalance()

const {
  data: isApprovedAddress,
  execute: executeExpenseAccountIsApprovedAddress
} = useExpenseAccountIsApprovedAddress()

const deployExpenseAccount = async () => {
  await executeDeployExpenseAccount()
  //API call here
  console.log("contractAddress: ", contractAddress.value)
}

const getExpenseAccountBalance = async () => {
  await executeExpenseAccountGetBalance(EXPENSE_ACCOUNT_ADDRESS)
  console.log("expenseAccountBalance: ", contractBalance.value)
}

const getExpenseAccountOwner = async () => {
  await executeExpenseAccountGetOwner(EXPENSE_ACCOUNT_ADDRESS)
  console.log("expenseAccountOwner: ", ownerAddress.value)
}

const checkApprovedAddresses = async () => {
  if (props.team.members)
    for (const member of props.team.members) {
      await executeExpenseAccountIsApprovedAddress(
        EXPENSE_ACCOUNT_ADDRESS,
        member.address
      )
      console.log(`${member.address}`, isApprovedAddress.value)
      if (isApprovedAddress.value)
        approvedAddresses.value[member.address] = isApprovedAddress.value
    }
    console.log("approvedAddressed: ", approvedAddresses.value)
}

onMounted(async () => {
  await getExpenseAccountBalance()
  await getExpenseAccountOwner()
  await checkApprovedAddresses()
})
</script>