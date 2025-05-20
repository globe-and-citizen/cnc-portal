<template>
  <CardComponent title="Token Holding">
    <div class="relative card-stack-container">
      <transition-group name="slide" tag="div">
        <div
          v-for="(notif, idx) in notifications"
          :key="notif.id"
          class="card bg-primary text-primary-content cursor-pointer transition-all duration-300 absolute left-0"
          :class="notif.shadow"
          :style="{
            top: `${idx * 10}px`,
            zIndex: notifications.length - idx
          }"
          @click="moveToBack(idx)"
        >
          <CardComponent>
            <div class="card-body">
              <h2 class="card-title">{{ notif.title }}</h2>
              <p>{{ notif.text }}</p>
            </div>
          </CardComponent>
        </div>
      </transition-group>
    </div>
  </CardComponent>
</template>

<script setup lang="ts">
import { ref } from 'vue'

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
    shadow: 'shadow-sm'
  },
  {
    id: 3,
    title: 'Notification 3',
    text: 'You have 3 unread messages. Tap here to see.',
    shadow: 'shadow-lg'
  }
])

function moveToBack(index: number) {
  const notif = notifications.value.splice(index, 1)[0]
  notifications.value.push(notif)
}
</script>

<style scoped>
.card-stack-container {
  position: relative;
  height: 180px; 
  overflow: hidden;
}

.slide-move {
  transition: top 0.3s cubic-bezier(0.55, 0, 0.1, 1);
}
</style>