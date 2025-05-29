<template>
  <!-- <pre>
    {{ data }}
    {{ error }}
</pre> -->
  <div class="card bg-base-100 shadow-xl w-full pb-7">
    <div class="card-body overflow-x-auto">
      <slot />
      <!-- Corps du tableau -->
      <transition-group tag="tbody" name="slide" class="relative">
        <tr
          v-for="(notif, idx) in notifications"
          :key="notif.id"
          class="bg-white text-gray-800 hover:bg-gray-100 transition-all cursor-pointer"
          :style="{ zIndex: notifications.length - idx }"
          @click="moveToBack(idx)"
        ></tr
      ></transition-group>
    </div>
  </div>
</template>

<script setup lang="ts">
// import { ref } from 'vue'
// import UserComponent from '@/components/UserComponent.vue'
// import ButtonUI from '@/components/ButtonUI.vue'
// import { useCustomFetch } from '@/composables'

// const notifications = ref([
//   {
//     id: 1,
//     createdAt: 'lundi 12 juin - dimanche 18 juin',
//     user: {
//       name: 'georges',
//       address: '0x098C1234ABCD9DFB',
//       imageUrl: 'https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp'
//     },
//     hourlyRate: 5,
//     usdRate: 100.25,
//     hoursWorked: 10,
//     totalHours: 10,
//     weeklyLimit: 10,
//     // memo: 'georges',
//     // status: 'Submitted',
//     action: 'Approve',
//     shadow: 'shadow-lg'
//   }
// ])

// const { data, error } = useCustomFetch('/weeklyClaim/?teamId=1').get().json()

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
