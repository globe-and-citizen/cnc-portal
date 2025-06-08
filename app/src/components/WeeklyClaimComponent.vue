<template>
  <div class="card bg-base-100 shadow-xl w-full pb-7">
    <div class="card-body overflow-x-auto">
      <slot />
      <!-- Corps du tableau -->
      <!-- <transition-group tag="tbody" name="slide" class="relative">
        <tr
          v-for="(notif, idx) in notifications"
          :key="notif.id"
          class="bg-white text-gray-800 hover:bg-gray-100 transition-all cursor-pointer"
          :style="{ zIndex: notifications.length - idx }"
          @click="moveToBack(idx)"
        ></tr
      ></transition-group> -->
    </div>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped>
.slide-move {
  transition: top 0.3s cubic-bezier(0.55, 0, 0.1, 1);
}
</style>
