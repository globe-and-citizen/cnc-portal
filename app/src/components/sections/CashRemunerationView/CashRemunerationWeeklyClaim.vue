<template>
  <CardComponent title="Weekly Claim" class="w-full">
    <WeeklyClaimComponent :notifications="notifications" @moveToBack="moveToBack" />
  </CardComponent>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import CardComponent from '@/components/CardComponent.vue'
import WeeklyClaimComponent from '@/components/WeeklyClaimComponent.vue'

const notifications = ref([
  {
    id: 1,
    title: 'Notification 1',
    text: 'You have 3 unread messages. Tap here to see.',
    shadow: 'shadow-lg'
  },
  {
    id: 2,
    title: 'Notification 2',
    text: 'You have 3 unread messages. Tap here to see.',
    shadow: 'shadow-lg'
  }
])

function moveToBack(index: number) {
  const notif = notifications.value.splice(index, 1)[0]
  notifications.value.push(notif)
}
</script>
