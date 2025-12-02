<script setup lang="ts">
const colorMode = useColorMode();
const color = computed(() => (colorMode.value === 'dark' ? '#1b1718' : 'white'));

useHead({
  meta: [{ key: 'theme-color', name: 'theme-color', content: color }],
});
</script>

<template>
  <UApp>
    <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <slot />
    </div>
  </UApp>
</template>
