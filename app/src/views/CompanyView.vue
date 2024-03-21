<template>
  <div class="pt-10">
    <h2 class="pl-5">Company</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-20">
      <CompanyCard
        CompanyName="Google"
        CompanyDescription="Google LLC is an American Multinational Technology Company"
      />
      <CompanyCard
        CompanyName="Binance"
        CompanyDescription="Binance is a cryptocurrency exchange platform."
      />
      <CompanyCard
        CompanyName="Coinbase"
        CompanyDescription="Coinbase is a digital currency exchange."
      />
      <CompanyCard
        CompanyName="CoinmarketCap"
        CompanyDescription="Binance is a cryptocurrency exchange platform."
      />
      <AddCompanyCard />
    </div>
  </div>
</template>

<script setup>
import AddCompanyCard from '@/components/AddCompanyCard.vue'
import CompanyCard from '@/components/CompanyCard.vue'
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
