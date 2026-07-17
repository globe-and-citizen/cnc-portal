<template>
  <div class="flex flex-col gap-6">
    <MainContractSection />
    <OfficerContractsByVersion />
    <AdvertiseContractSection />
  </div>
</template>
<script setup lang="ts">
import MainContractSection from '@/components/sections/ContractManagementView/MainContractSection.vue'
import OfficerContractsByVersion from '@/components/sections/ContractManagementView/OfficerContractsByVersion.vue'
import AdvertiseContractSection from '@/components/sections/ContractManagementView/AdvertiseContractSection.vue'
</script>
