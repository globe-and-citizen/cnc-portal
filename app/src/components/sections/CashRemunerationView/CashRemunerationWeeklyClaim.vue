<template>
  <CardComponent title="Weekly Claim" class="w-full pb-7">
    <div v-if="stackedData.length" class="stack-container relative">
      <transition-group name="stack" tag="div">
        <div
          v-for="(row, index) in stackedData"
          :key="row.id"
          class="absolute w-full stacked-card bg-white shadow-lg rounded-lg text-primary-content transition-all duration-300 cursor-pointer"
          :style="{ top: `${index * 8}px`, zIndex: 30 - index }"
          @click="moveToBack(row.id)"
        >
          <div class="card-body">
            <div class="overflow-x-auto">
              <table class="table w-full text-primary-content">
                <tbody>
                  <tr>
                    <td class="font-semibold text-base">Date</td>
                    <td class="font-semibold text-base">Member</td>
                    <td class="font-semibold text-base">Hour Worked</td>
                    <td class="font-semibold text-base">Hourly Rate</td>
                    <td class="font-semibold text-base">Total Amount</td>
                    <td class="font-semibold text-base">Action</td>
                  </tr>
                  <tr class="border-t border-white/20">
                    <td>
                      <span class="text-sm">{{ formatDate(row.weekStart) }}</span>
                    </td>
                    <td><UserComponent :user="row.member" /></td>
                    <td>
                      <div>
                        <span class="font-bold">{{ getTotalHoursWorked(row.claims) }}:00 hrs</span>
                        <br />
                        <span class="text-xs opacity-75">
                          of {{ row.wage.maximumHoursPerWeek ?? '-' }} hrs weekly limit
                        </span>
                      </div>
                    </td>
                    <td>
                      <div class="space-y-1">
                        <div class="font-bold">
                          {{ row.wage.cashRatePerHour }} {{ NETWORK.currencySymbol }}
                        </div>
                        <div class="font-bold">{{ row.wage.tokenRatePerHour }} TOKEN</div>
                        <div class="font-bold">{{ row.wage.usdcRatePerHour }} USDC</div>
                      </div>
                    </td>
                    <td>
                      <div class="space-y-1">
                        <div class="font-bold">
                          {{ getTotalHoursWorked(row.claims) * row.wage.cashRatePerHour }}
                          {{ NETWORK.currencySymbol }}
                        </div>
                        <div class="font-bold">
                          {{ getTotalHoursWorked(row.claims) * row.wage.tokenRatePerHour }} TOKEN
                        </div>
                        <div class="font-bold">
                          {{ getTotalHoursWorked(row.claims) * row.wage.usdcRatePerHour }} USDC
                        </div>
                        <div class="text-xs opacity-75">
                          {{
                            (
                              getTotalHoursWorked(row.claims) *
                              Number(getHoulyRateInUserCurrency(row.wage.cashRatePerHour))
                            ).toFixed(2)
                          }}
                          {{ NETWORK.nativeTokenSymbol }} / USD
                        </div>
                      </div>
                    </td>
                    <td>
                      <ButtonUI class="btn btn-success btn-sm" type="button">Approve</ButtonUI>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </transition-group>
    </div>

    <div v-else-if="isTeamClaimDataFetching" class="flex justify-center items-center py-8">
      <div class="loading loading-spinner loading-lg"></div>
    </div>

    <div v-else class="text-center py-8 text-gray-500">No weekly claims found</div>
  </CardComponent>
</template>

<script setup lang="ts">
import CardComponent from '@/components/CardComponent.vue'
import UserComponent from '@/components/UserComponent.vue'
import ButtonUI from '@/components/ButtonUI.vue'
import { NETWORK } from '@/constant'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { computed, ref, watch } from 'vue'
import { useCurrencyStore, useTeamStore, useUserDataStore } from '@/stores'

function getTotalHoursWorked(claims: { hoursWorked: number }[]) {
  return claims.reduce((sum, claim) => sum + claim.hoursWorked, 0)
}

const userStore = useUserDataStore()
const teamStore = useTeamStore()

const weeklyClaimUrl = computed(() => {
  return `/weeklyClaim/?teamId=${teamStore.currentTeam?.id}${
    userStore.address !== teamStore.currentTeam?.ownerAddress
      ? `&memberAddress=${userStore.address}`
      : ''
  }`
})

const { data, error } = useCustomFetch(weeklyClaimUrl.value).get().json()
const isTeamClaimDataFetching = computed(() => !data.value && !error.value)

const sortedData = computed(() => {
  if (!data.value) return []
  return [...data.value].sort(
    (a, b) => new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime()
  )
})

const stackedData = ref<any[]>([])

watch(sortedData, () => {
  if (sortedData.value.length) {
    stackedData.value = sortedData.value.map((item, index) => ({
      ...item,
      id: index + '-' + item.weekStart
    }))
  }
})

function moveToBack(id: string) {
  const index = stackedData.value.findIndex((el) => el.id === id)
  if (index !== -1) {
    const item = stackedData.value.splice(index, 1)[0]
    stackedData.value.push(item)
  }
}

const currencyStore = useCurrencyStore()
const getHoulyRateInUserCurrency = (rate: number) => {
  return (
    currencyStore.nativeToken.priceInLocal ? rate * currencyStore.nativeToken.priceInLocal : 0
  ).toFixed(2)
}

function formatDate(date: string | Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const locale = navigator.language || 'en-US'
  return d.toLocaleDateString(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
</script>

<style scoped>
.stack-container {
  height: auto;
  min-height: 300px;
  position: relative;
}

.stacked-card {
  left: 0;
  right: 0;
}

/* Transition animations */
.stack-enter-active,
.stack-leave-active {
  transition: all 0.3s ease;
}
.stack-enter-from {
  opacity: 0;
  transform: translateY(20px);
}
.stack-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

/* Responsive */
@media (max-width: 768px) {
  .table {
    font-size: 0.75rem;
  }
  .table td {
    padding: 0.5rem;
  }
}
</style>
