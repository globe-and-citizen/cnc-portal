<template>
  <UDashboardSidebar
    collapsible
    resizable
    class="bg-default"
    :ui="{ root: 'min-w-24', footer: 'border-t border-default' }"
  >
    <template #header="{ collapsed }">
      <div class="group relative cursor-pointer p-3">
        <img
          v-show="!collapsed"
          src="../../assets/Logo.png"
          alt="CNC Portal"
          class="relative w-full"
        />
        <img
          v-show="collapsed"
          src="../../assets/LogoWithoutText.png"
          alt="CNC Portal"
          class="relative w-full transition-transform duration-300 hover:scale-110"
        />
      </div>
    </template>

    <template #default="{ collapsed }">
      <!-- TODO: Enable search for later -->
      <!-- <UButton
        :label="collapsed ? undefined : 'Search...'"
        icon="i-lucide-search"
        color="neutral"
        variant="outline"
        block
        
        :square="collapsed"
      >
        <template v-if="!collapsed" #trailing>
          <div class="flex items-center gap-0.5 ms-auto">
            <UKbd value="meta" variant="subtle" />
            <UKbd value="K" variant="subtle" />
          </div>
        </template>
      </UButton> -->

      <UNavigationMenu
        :collapsed="collapsed"
        :items="items"
        orientation="vertical"
        :ui="{
          list: 'flex flex-col gap-2',
          link: 'text-md gap-3 px-4 py-3 rounded-xl',
          linkLeadingIcon: 'size-6'
        }"
      />
    </template>

    <template #footer="{ collapsed }">
      <!-- User Meta -->
      <UModal
        v-model:open="open"
        title="Update User Data"
        description="Edit your profile information used across the application."
      >
        <div
          class="bg-muted flex w-full cursor-pointer flex-row justify-start gap-4 rounded-xl p-4 shadow-xs transition-all duration-300"
          data-test="edit-user-card"
          :class="{ 'justify-center': collapsed }"
          @click="open = true"
        >
          <div role="button" class="group relative">
            <div class="relative h-11 w-11 overflow-hidden rounded-full ring-2 ring-white/50">
              <img
                alt="User Avatar"
                :src="
                  userStore.imageUrl ||
                  'https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp'
                "
                class="h-full w-full object-cover"
              />
            </div>
          </div>
          <div class="flex flex-col text-gray-600" v-if="!collapsed">
            <p class="line-clamp-1 text-sm font-bold" data-test="user-name">
              {{ userStore.name || 'User' }}
            </p>
            <p class="text-sm" data-test="formatted-address">
              {{ formatedUserAddress }}
            </p>
          </div>
        </div>

        <template #body>
          <EditUserForm />
        </template>
      </UModal>
    </template>
  </UDashboardSidebar>
</template>

<script setup lang="ts">
import { useUserDataStore } from '@/stores/user'
import { computed, ref } from 'vue'
import { formatAddress } from '@/utils/formatAddress'
import { useSidebarNavItems } from '@/composables/useSidebarNavItems'

const userStore = useUserDataStore()

const open = ref(false)

const items = useSidebarNavItems()

const formatedUserAddress = computed(() => formatAddress(userStore.address))
</script>

<style scoped></style>
