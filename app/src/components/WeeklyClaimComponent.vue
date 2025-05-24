<template>
  <div class="card bg-base-100 shadow-xl w-full pb-7">
    <div class="card-body overflow-x-auto">
      <table class="table w-full text-sm">
        <!-- En-tête -->
        <thead class="text-gray-700 text-lg font-semibold">
          <tr>
            <th>Date</th>
            <th>Member</th>
            <th>Hour Worked</th>
            <!-- <th>Memo</th> -->
            <th>Hourly Rate</th>
            <th class="text-center">Action</th>
          </tr>
        </thead>

        <!-- Corps du tableau -->
        <transition-group tag="tbody" name="slide" class="relative">
          <tr
            v-for="(notif, idx) in notifications"
            :key="notif.id"
            class="bg-white text-gray-800 hover:bg-gray-100 transition-all cursor-pointer"
            :style="{ zIndex: notifications.length - idx }"
            @click="moveToBack(idx)"
          >
            <!-- Date -->
            <td class="py-2 px-4">  
              {{ (notif.createdAt) }}
            </td>

            <!-- Member -->
            <td class="py-2 px-4">
              <UserComponent :user="notif.user" />
            </td>

            <!-- Hour Worked -->
            <td class="py-2 px-4">
              <div class="font-semibold">{{ notif.hoursWorked }} / {{ notif.totalHours }} h</div>
              <div class="text-xs text-gray-500">{{ notif.weeklyLimit }} h/week</div>
            </td>

            <!-- Memo -->
            <!-- <td class="py-2 px-4">
              {{ notif.memo }}
            </td> -->

            <!-- Hourly Rate -->
            <td class="py-2 px-4">
              <div class="font-semibold">{{ notif.hourlyRate }} SepoliaETH / h</div>
              <div class="text-xs text-gray-500">{{ notif.usdRate }} USD </div>
            </td>

            <!-- Action -->
            <td class="py-2 px-4 text-center">
              <ButtonUI
                class="btn btn-sm btn-primary"
                :data-test="`approve-button-${notif.id}`"
                variant="success"
                :disabled="loading"
                size="sm"
                @click.stop="async () => await approveClaim(notif)"
              >
                {{ notif.action }}
              </ButtonUI>
            </td>
          </tr>
        </transition-group>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import UserComponent from '@/components/UserComponent.vue'
import ButtonUI from '@/components/ButtonUI.vue'

const notifications = ref([
  {
    id: 1,
    createdAt: 'lundi 12 juin - dimanche 18 juin',
    user: {
      name: 'georges',
      address: '0x098C1234ABCD9DFB',
      imageUrl: 'https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp'
    },
    hourlyRate: 5,
    usdRate: 100.25,
    hoursWorked: 10,
    totalHours: 10,
    weeklyLimit: 10,
    // memo: 'georges',
    // status: 'Submitted',
    action: 'Approve',
    shadow: 'shadow-lg'
  }
])

function moveToBack(index: number) {
  const notif = notifications.value.splice(index, 1)[0]
  notifications.value.push(notif)
}
</script>

<style scoped>
.slide-move {
  transition: top 0.3s cubic-bezier(0.55, 0, 0.1, 1);
}
</style>
