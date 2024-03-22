<template>
  <div class="pt-10">
    <h2 class="pl-5">Company</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-20">
      <CompanyCard
        v-for="company in companies"
        :key="company.id"
        :CompanyName="company.name"
        :CompanyDescription="company.description"
        class="cursor-pointer"
        @click="navigateToCompany(company.id)"
      />

      <AddCompanyCard />
    </div>
  </div>
</template>

<script setup lang="ts">
import AddCompanyCard from '@/components/AddCompanyCard.vue'
import CompanyCard from '@/components/CompanyCard.vue'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import axios from 'axios'
const companies = ref([])
const router = useRouter()

//
onMounted(async () => {
  try {
    const response = await axios.get('http://localhost:3000/companies', {
      address: 'user_address_321'
    })
    companies.value = response.data
    console.log(companies.value)
  } catch (error) {
    console.error('Error fetching data:', error)
  }
})
function navigateToCompany(id) {
  console.log(id)
  router.push('/companies/' + id)
}
</script>

<style scoped>
.container {
  position: relative;
  display: flex;
}

.content-wrapper {
  flex: 1;
  padding-top: 80px;
}
</style>
