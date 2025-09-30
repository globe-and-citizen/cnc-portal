<template>
  <CardComponent title="">
    <div class="flex justify-between items-center">
      <div class="text-lg text-gray-500">
        <span class="flex items-center gap-4">
          <UserAvatarComponent :user="ownerUser" class="" />
        </span>
      </div>

      <div class="text-lg text-gray-500">
        <span class="flex items-center gap-4">
          Owner address:
          <AddressToolTip v-if="ownerUser?.address" :address="ownerUser.address" />
        </span>
      </div>
    </div>
  </CardComponent>
</template>

<script setup lang="ts">
import UserAvatarComponent from '@/components/UserAvatarComponent.vue'
import AddressToolTip from '@/components/AddressToolTip.vue'
import { useTeamStore } from '@/stores/'
import { type User } from '@/types/user'
import type { Member } from '@/types/member'
import { ref, watch, computed } from 'vue'
import { readContract } from '@wagmi/core'
import { config } from '@/wagmi.config'
import type { Abi, Address } from 'viem'
import CardComponent from '@/components/CardComponent.vue'

const props = defineProps<{
  contractAddress?: Address
}>()

const teamStore = useTeamStore()

// Minimal ABI to read owner() from arbitrary contract
const OWNER_ABI: Abi = [
  {
    name: 'owner',
    stateMutability: 'view',
    type: 'function',
    inputs: [],
    outputs: [{ type: 'address' }]
  }
]

const ownerUser = ref<User>({ name: '', address: '' })

// prefer explicit prop
const contractAddress = computed<Address | undefined>(
  () => props.contractAddress as Address | undefined
)

const resolveOwnerFromContract = async () => {
  const contractAddr = contractAddress.value!

  try {
    const chainOwner = await readContract(config, {
      address: contractAddr as `0x${string}`,
      abi: OWNER_ABI,
      functionName: 'owner'
    })

    const ownerAddr = typeof chainOwner === 'string' ? chainOwner : String(chainOwner)

    const member = teamStore.currentTeam?.members.find((m: Member) => {
      return (m.address || '').toLowerCase() === ownerAddr.toLowerCase()
    })

    const boardAddress = teamStore.getContractAddressByType('BoardOfDirectors')
    const isBoard = boardAddress && boardAddress.toLowerCase() === ownerAddr.toLowerCase()

    if (isBoard) {
      ownerUser.value = { name: 'Board of Directors', address: ownerAddr }
    } else if (member) {
      ownerUser.value = {
        name: member.name || ownerAddr,
        address: ownerAddr,
        imageUrl: member.imageUrl || undefined
      }
    } else {
      ownerUser.value = { name: ownerAddr, address: ownerAddr }
    }
  } catch (error) {
    console.error('Failed to resolve contract owner:', error)
  }
}

watch(
  contractAddress,
  () => {
    resolveOwnerFromContract()
  },
  { immediate: true }
)
</script>
