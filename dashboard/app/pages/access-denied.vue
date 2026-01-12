<script setup lang="ts">
definePageMeta({
  layout: 'blank',
  middleware: [] // No middleware restriction - anyone can access this page
})

const router = useRouter()
// const authStore = useAuthStore()
const roleStore = useRoleStore()

const goHome = () => {
  router.push({ name: 'login' })
}

const goBack = () => {
  router.back()
}
</script>

<template>
  <UApp>
    <div class="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <!-- Content Card -->
      <div class="w-full max-w-md space-y-8">
        <!-- Icon with Badge -->
        <div class="flex justify-center">
          <div class="relative">
            <UBadge
              color="error"
              variant="soft"
              size="lg"
              class="px-8 py-8"
            >
              <UIcon
                name="i-lucide-lock"
                class="h-12 w-12"
              />
            </UBadge>
          </div>
        </div>

        <!-- Title and Description -->
        <div class="space-y-3 text-center">
          <h1 class="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Access Denied
          </h1>
          <p class="text-base font-medium text-gray-600 dark:text-gray-400">
            Admin Panel Required
          </p>
        </div>

        <!-- Detailed Message -->
        <div class="space-y-2 rounded-lg bg-gray-50 p-4 dark:bg-gray-900/50">
          <p class="text-sm text-gray-700 dark:text-gray-300">
            You don't have the required permissions to access the CNC Portal dashboard.
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            This area is reserved for administrators only. If you believe this is a mistake, please contact our support team.
          </p>
        </div>

        <!-- Role Status Card -->
        <UCard
          class="border-2"
        >
          <template #header>
            <div class="flex items-center justify-between">
              <span class="text-sm font-semibold text-gray-900 dark:text-white">
                Role Information
              </span>
            </div>
          </template>

          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-600 dark:text-gray-400">Your Role:</span>
              <UBadge
                color="error"
                variant="subtle"
              >
                {{ roleStore.userRoles && roleStore.userRoles.length ? roleStore.userRoles.join(', ') : 'User' }} {{ roleStore.isAdmin ? '(Admin)' : '' }}
              </UBadge>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-600 dark:text-gray-400">Required Role:</span>
              <UBadge
                color="success"
                variant="subtle"
              >
                Admin
              </UBadge>
            </div>
          </div>
        </UCard>

        <!-- Action Buttons -->
        <div class="flex flex-col gap-3 pt-4 sm:flex-row">
          <UButton
            color="secondary"
            variant="outline"
            size="lg"
            block
            icon="i-lucide-arrow-left"
            @click="goBack"
          >
            Go Back
          </UButton>
          <UButton
            color="primary"
            size="lg"
            block
            icon="i-lucide-log-in"
            @click="goHome"
          >
            Login Again
          </UButton>
        </div>

        <!-- Support Section -->
        <div class="space-y-3 border-t border-gray-200 pt-6 dark:border-gray-800">
          <p class="text-center text-sm font-medium text-gray-900 dark:text-white">
            Need Help?
          </p>
          <UButton
            to="https://discord.gg/HG2GAhN2"
            target="_blank"
            color="primary"
            variant="soft"
            block
            icon="i-simple-icons-discord"
          >
            Contact Support on Discord
          </UButton>
        </div>
      </div>
    </div>
  </UApp>
</template>
