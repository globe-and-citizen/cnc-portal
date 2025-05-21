<template>
  <div class="relative h-60">
    <transition-group name="slide" tag="div">
      <div
        v-for="(notif, idx) in notifications"
        :key="notif.id"
        class="card bg-primary text-primary-content cursor-pointer transition-all duration-300 absolute left-0 w-full"
        :class="notif.shadow"
        :style="{
          top: `${idx * 10}px`,
          zIndex: notifications.length - idx
        }"
        @click="onMoveToBack(idx)"
      >
        <div class="card-body flex flex-col items-center justify-center h-full">
          <h2 class="card-title text-center w-full">{{ notif.title }}</h2>
          <p class="text-center">{{ notif.text }}</p>
        </div>
      </div>
    </transition-group>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue'

// Déclaration des props
defineProps<{
  notifications: {
    id: number
    title: string
    text: string
    shadow: string
  }[]
}>()

// Déclaration de l'événement émis
const emit = defineEmits<{
  (e: 'moveToBack', index: number): void
}>()

// Méthode déclenchée au clic
function onMoveToBack(index: number) {
  emit('moveToBack', index)
}
</script>

<style scoped>
.slide-move {
  transition: top 0.3s cubic-bezier(0.55, 0, 0.1, 1);
}
</style>
