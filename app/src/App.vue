<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <header>

    <div class="wrapper">
      <div class="flex flex-wrap gap-10">
        
      <button class="btn">Button</button>
      <button class="btn btn-ghost">Ghost</button>
      <button class="btn btn-link">Link</button>
      <button class="btn btn-neutral">Neutral</button>
      <button class="btn btn-accent">Accent</button>
      <button class="btn btn-primary">Primary</button>
      <button class="btn btn-secondary">Secondary</button>
      <button class="btn btn-info">Info</button>
      <button class="btn btn-success">Success</button>
      <button class="btn btn-warning">Warning</button>
      <button class="btn btn-error">Error</button>
      </div>
      <h1 class="text-3xl font-bold underline">
        Hello world!
      </h1>
      <nav>
        <RouterLink to="/">Home</RouterLink>
        <RouterLink to="/about">About</RouterLink>
      </nav>
    </div>
  </header>

  <RouterView />
</template>

<style scoped>

</style>
