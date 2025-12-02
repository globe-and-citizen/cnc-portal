<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <h3 class="text-lg font-semibold">Token Holdings</h3>
          <UBadge v-if="isOwner" color="success">Owner</UBadge>
        </div>

        <UButton
          v-if="isOwner"
          color="primary"
          size="sm"
          icon="i-heroicons-arrow-down-tray"
          @click="$emit('openBatchModal')"
        >
          Withdraw
        </UButton>
      </div>
    </template>

    <div class="overflow-x-auto">
      <table class="w-full table-fixed">
        <colgroup>
          <col class="w-16" />
          <col class="w-48" />
          <col class="w-auto" />
          <col class="w-auto" />
          <col class="w-auto" />
        </colgroup>
        <thead>
          <tr class="border-b border-gray-200 dark:border-gray-700">
            <th class="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
              RANK
            </th>
            <th class="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
              Token
            </th>
            <th class="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
              Amount
            </th>
            <th class="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
              Pending
            </th>
            <th class="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
              Withdrawn
            </th>
          </tr>
        </thead>

        <tbody>
          <!-- Loading -->
          <tr v-if="isLoading">
            <td colspan="5" class="text-center py-8">
              <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin inline-block" />
            </td>
          </tr>

          <!-- Rows -->
          <tr
            v-for="(token, index) in tokens"
            :key="token.address"
            class="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <td class="px-4 py-4 text-gray-500 dark:text-gray-400">
              {{ index + 1 }}
            </td>

            <td class="px-4 py-4">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                  <span class="text-sm font-semibold text-blue-600 dark:text-blue-400">
                    {{ token.symbol.charAt(0) }}
                  </span>
                </div>
                <div class="min-w-0">
                  <p class="font-semibold">{{ token.symbol }}</p>
                  <p class="text-xs text-gray-600 dark:text-gray-400 font-mono truncate">
                    {{ token.shortAddress }}
                  </p>
                </div>
              </div>
            </td>

            <td class="px-4 py-4 text-right font-medium">
              {{ token.formattedBalance }} {{ token.symbol }}
            </td>

            <td class="px-4 py-4 text-right text-gray-600 dark:text-gray-400">
              {{ token.formattedPending }} {{ token.symbol }}
            </td>

            <td class="px-4 py-4 text-right text-gray-600 dark:text-gray-400">
              {{ token.formattedWithdrawn }} {{ token.symbol }}
            </td>
          </tr>

          <tr v-if="!isLoading && tokens.length === 0">
            <td colspan="5" class="text-center py-8 text-gray-500">
              No tokens available
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import type { TokenDisplay } from '@/types/token'

interface Props {
  tokens: TokenDisplay[]
  isLoading?: boolean
  isOwner?: boolean
}

defineProps<Props>()

defineEmits<{
  openBatchModal: []
}>()
</script>