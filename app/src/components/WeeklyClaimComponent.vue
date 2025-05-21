<template>
  <transition-group name="slide" tag="div" class="relative h-36">
    <div
      v-for="(notif, idx) in notifications"
      :key="notif.id"
      class="card bg-primary text-primary-content cursor-pointer transition-all duration-300 absolute left-0 w-full"
      :class="notif.shadow"
      :style="{ top: `${idx * 10}px`, zIndex: notifications.length - idx }"
      @click="onMoveToBack(idx)"
    >
      <div class="card-body flex flex-col items-center justify-center">
        <h2 class="card-title text-center w-full">{{ notif.title }}</h2>
        <p class="text-center">{{ notif.text }}</p>
      </div>
    </div>
  </transition-group>
</template>

<script setup lang="ts">
 defineProps<{
  notifications: {
    id: number
    title: string
    text: string
    shadow: string
  }[]
}>()

const emit = defineEmits<{
  (e: 'moveToBack', index: number): void
}>()

function onMoveToBack(index: number) {
  emit('moveToBack', index)
}
</script>

<style scoped>
.slide-move {
  transition: top 0.3s cubic-bezier(0.55, 0, 0.1, 1);
}
</style>
