<template>
  <div class="bank-read-operations bg-white p-6 rounded-lg border border-gray-200">
    <h3 class="text-lg font-semibold mb-4">Contract Read Operations</h3>
    <div class="overflow-x-auto">
      <table class="min-w-full table-auto">
        <thead>
          <tr class="bg-gray-50">
            <th class="px-4 py-2 text-left text-sm font-medium text-gray-700">Property</th>
            <th class="px-4 py-2 text-left text-sm font-medium text-gray-700">Value</th>
            <th class="px-4 py-2 text-left text-sm font-medium text-gray-700">Status</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr>
            <td class="px-4 py-2 text-sm font-medium text-gray-900">Bank Address</td>
            <td class="px-4 py-2 text-sm text-gray-700">
              <span class="font-mono text-xs">{{ bankAddress || 'Not configured' }}</span>
            </td>
            <td class="px-4 py-2 text-sm">
              <span
                v-if="!isBankAddressValid"
                class="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full"
              >
                Invalid
              </span>
              <span
                v-else
                class="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full"
              >
                Valid
              </span>
            </td>
          </tr>
          <tr>
            <td class="px-4 py-2 text-sm font-medium text-gray-900">Is Paused</td>
            <td class="px-4 py-2 text-sm text-gray-700">
              <span v-if="pausedLoading" class="text-blue-600">Loading...</span>
              <span v-else-if="pausedError" class="text-red-600">{{ pausedError.message }}</span>
              <span v-else class="font-medium">{{ pausedData ? 'Yes' : 'No' }}</span>
            </td>
            <td class="px-4 py-2 text-sm">
              <span
                v-if="pausedLoading"
                class="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
              >
                Loading
              </span>
              <span
                v-else-if="pausedError"
                class="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full"
              >
                Error
              </span>
              <span
                v-else
                class="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full"
              >
                Loaded
              </span>
            </td>
          </tr>
          <tr>
            <td class="px-4 py-2 text-sm font-medium text-gray-900">Owner</td>
            <td class="px-4 py-2 text-sm text-gray-700">
              <span v-if="ownerLoading" class="text-blue-600">Loading...</span>
              <span v-else-if="ownerError" class="text-red-600">{{ ownerError.message }}</span>
              <span v-else class="font-mono text-xs">{{ ownerData || 'N/A' }}</span>
            </td>
            <td class="px-4 py-2 text-sm">
              <span
                v-if="ownerLoading"
                class="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
              >
                Loading
              </span>
              <span
                v-else-if="ownerError"
                class="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full"
              >
                Error
              </span>
              <span
                v-else
                class="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full"
              >
                Loaded
              </span>
            </td>
          </tr>
          <tr>
            <td class="px-4 py-2 text-sm font-medium text-gray-900">Tips Address</td>
            <td class="px-4 py-2 text-sm text-gray-700">
              <span v-if="tipsAddressLoading" class="text-blue-600">Loading...</span>
              <span v-else-if="tipsAddressError" class="text-red-600">{{
                tipsAddressError.message
              }}</span>
              <span v-else class="font-mono text-xs">{{ tipsAddressData || 'N/A' }}</span>
            </td>
            <td class="px-4 py-2 text-sm">
              <span
                v-if="tipsAddressLoading"
                class="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
              >
                Loading
              </span>
              <span
                v-else-if="tipsAddressError"
                class="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full"
              >
                Error
              </span>
              <span
                v-else
                class="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full"
              >
                Loaded
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useBankReads } from '@/composables/bank'

// Get read operations functionality
const { bankAddress, isBankAddressValid, useBankPaused, useBankOwner, useBankTipsAddress } =
  useBankReads()

// Get contract data with loading and error states
const { data: pausedData, isLoading: pausedLoading, error: pausedError } = useBankPaused()
const { data: ownerData, isLoading: ownerLoading, error: ownerError } = useBankOwner()
const {
  data: tipsAddressData,
  isLoading: tipsAddressLoading,
  error: tipsAddressError
} = useBankTipsAddress()
</script>
