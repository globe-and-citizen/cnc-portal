<template>
  <div class="flex flex-col gap-y-4 py-6 lg:px-4 sm:px-6">
    <div class="flex justify-between">
      <span class="text-2xl sm:text-3xl font-bold">Pending Claims</span>
      <div class="flex gap-2">
        <label class="input input-bordered flex items-center gap-2 input-md">
          <span class="w-24">Hours Worked</span>
          |
          <input
            type="text"
            class="grow"
            placeholder="Enter hours worked..."
            data-test="max-hours-input"
          />
        </label>
        <!--<button class="btn btn-success">Submit Hours</button>-->
        <ButtonUI v-if="isSubmittingHours" loading variant="success" />
        <ButtonUI v-else variant="success" data-test="submit-hours-button">Submit Hours</ButtonUI>
      </div>
    </div>
    <div class="divider m-0"></div>
    <div class="overflow-x-auto">
      <table class="table table-zebra">
        <!-- head -->
        <thead class="text-sm font-bold">
          <tr>
            <th>Date</th>
            <th>Name</th>
            <th>Address</th>
            <th>Hours</th>
            <th>Rate</th>
            <th v-if="team.ownerAddress === currentUserAddress">Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(data, index) in dummyData">
            <td>{{ new Date().toLocaleDateString() }}</td>
            <td>{{ data.name }}</td>
            <td>{{ data.address }}</td>
            <td>{{ data.hoursWorked }}</td>
            <td>{{ data.hourlyRate }}</td>
            <td class="flex justify-end">
              <button class="btn btn-success">Approve</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUserDataStore } from '@/stores'
import ButtonUI from '@/components/ButtonUI.vue'
import type { Team } from '@/types'
import { ref } from 'vue'

const currentUserAddress = useUserDataStore().address
const isSubmittingHours = ref(false)
const dummyData = ref([{ name: 'Member', address: '0x123', hoursWorked: 20, hourlyRate: 50 }])

const props = defineProps<{ team: Partial<Team> }>()
</script>
