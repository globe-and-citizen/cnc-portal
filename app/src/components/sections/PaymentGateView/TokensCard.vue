<template>
  <UCard data-test="payment-gate-tokens-card">
    <template #header>
      <h3 class="text-base font-semibold">Accepted tokens</h3>
    </template>

    <p class="text-muted mb-4 text-sm">
      Adds a call to <code>addTokenSupport</code> on this team's Bank — customers can only pay in
      tokens listed here.
    </p>

    <div class="mb-4 flex flex-wrap gap-2" data-test="payment-gate-token-list">
      <div v-for="token in tokens" :key="token" class="flex items-center gap-1">
        <UBadge color="neutral" variant="subtle">{{ token }}</UBadge>
        <UButton
          v-if="token !== 'MATIC'"
          icon="i-lucide-x"
          size="xs"
          color="neutral"
          variant="ghost"
          :aria-label="`Remove ${token}`"
          @click="removeToken(token)"
        />
      </div>
    </div>

    <div class="flex gap-2">
      <UInput
        v-model="newToken"
        placeholder="Token symbol, e.g. DAI"
        class="flex-1"
        @keyup.enter="addToken"
      />
      <UButton color="primary" label="Add token" @click="addToken" />
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const tokens = ref(['MATIC', 'USDC', 'USDT'])
const newToken = ref('')

function addToken() {
  const value = newToken.value.trim().toUpperCase()
  if (!value || tokens.value.includes(value)) return
  tokens.value.push(value)
  newToken.value = ''
}

function removeToken(token: string) {
  tokens.value = tokens.value.filter((t) => t !== token)
}
</script>
