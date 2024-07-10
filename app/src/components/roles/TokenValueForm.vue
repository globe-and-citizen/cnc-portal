<template>
  <input type="text" class="w-24" placeholder="Put percentage" v-model="entitlement.rule" />
  <span class="grow">of total supply</span>
</template>

<script setup lang="ts">
const entitlement = defineModel({
  default: {
    rule: '',
    type: 0
  }
})
</script>
