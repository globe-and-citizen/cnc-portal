<script setup lang="ts">
import ButtonUI from '@/components/ButtonUI.vue';
</script>

<template>
  <div class="mt-10">
    <h1>Welcome To the CNC portal</h1>
    <p>
      Our Website is still in construction. Look into our wonderfull tip feature and try to tip your
      team
    </p>

    <ButtonUI class="mt-6" variant="secondary">

      <RouterLink to="/teams" data-test="tip-button">Tip your Team</RouterLink>
    </ButtonUI>
  </div>
</template>
