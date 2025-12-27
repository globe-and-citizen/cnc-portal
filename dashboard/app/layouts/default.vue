<script setup lang="ts">
import type { DropdownMenuItem, NavigationMenuItem } from '@nuxt/ui'
import { useUser } from '~/queries/index'

const { isNotificationsSlideoverOpen } = useDashboard()
const route = useRoute()
const router = useRouter()

const open = ref(false)

// Get role store
const roleStore = useRoleStore()

// Check if user is admin - redirect to access denied if not
const isAdmin = computed(() => roleStore.isAdmin)

// Watch for role changes and redirect if user is not admin
watch(isAdmin, (newValue) => {
  if (!newValue && route.name !== 'access-denied') {
    router.push({ name: 'access-denied' })
  }
}, { immediate: true })

// Dynamic page title based on current route
const pageTitle = computed(() => {
  const routeName = route.name as string
  const path = route.path

  // Map route names to titles
  const titleMap: Record<string, string> = {
    'index': 'Overview',
    'teams': 'Teams Management',
    'features': 'Submit Restriction',
    'micropayments': 'Micropayments',
    'contracts': 'Contracts',
    'settings': 'Settings',
    'settings-members': 'Members',
    'settings-notifications': 'Notifications',
    'settings-security': 'Security'
  }

  // Return mapped title or capitalize first segment of path
  if (routeName && titleMap[routeName]) {
    return titleMap[routeName]
  }

  // Fallback: capitalize the first path segment
  const segment = path.split('/')[1] || 'home'
  return segment.charAt(0).toUpperCase() + segment.slice(1)
})

// Dynamic panel id based on current route
const panelId = computed(() => {
  return route.path === '/' ? 'home' : route.path.split('/')[1] || 'home'
})

// Set the page title in the browser tab
useHead({
  title: () => `${pageTitle.value} | CNC Portal Dashboard`
})

const links = [
  [
    {
      label: 'Overview',
      icon: 'i-lucide-house',
      to: '/',
      onSelect: () => {
        open.value = false
      }
    },
    {
      label: 'Teams Management',
      icon: 'i-lucide-users',
      to: '/teams',
      badge: '4',
      onSelect: () => {
        open.value = false
      }
    },
    {
      label: 'Micropayments',
      icon: 'i-lucide-wallet',
      to: '/micropayments',
      onSelect: () => {
        open.value = false
      }
    },
    {
      label: 'Feature',
      icon: 'i-lucide-clipboard-check',
      to: '/features',
      type: 'trigger',
      children: [
        {
          label: 'Submit Restriction',
          to: '/features/SubmitRestriction',
          onSelect: () => {
            open.value = false
          }
        }
      ]
    },
    {
      label: 'Contracts',
      to: '/contracts',
      icon: 'i-lucide-settings',
      defaultOpen: true,
      type: 'trigger',
      children: [
        {
          label: 'General',
          to: '/contracts',
          exact: true,
          onSelect: () => {
            open.value = false
          }
        },
        {
          label: 'Members',
          to: '/contracts',
          onSelect: () => {
            open.value = false
          }
        },
        {
          label: 'Notifications',
          to: '/contracts',
          onSelect: () => {
            open.value = false
          }
        },
        {
          label: 'Security',
          to: '/settings/security',
          onSelect: () => {
            open.value = false
          }
        }
      ]
    }
  ],
  [
    {
      label: 'Feedback',
      icon: 'i-lucide-message-circle',
      to: 'https://discord.gg/HG2GAhN2',
      target: '_blank'
    },
    {
      label: 'Help & Support',
      icon: 'i-lucide-info',
      to: 'https://discord.gg/HG2GAhN2',
      target: '_blank'
    }
  ]
] satisfies NavigationMenuItem[][]

const items = [
  [
    {
      label: 'New mail',
      icon: 'i-lucide-send',
      to: '/inbox'
    },
    {
      label: 'New customer',
      icon: 'i-lucide-user-plus',
      to: '/customers'
    }
  ]
] satisfies DropdownMenuItem[][]

const groups = computed(() => [
  {
    id: 'links',
    label: 'Go to',
    items: links.flat()
  },
  {
    id: 'code',
    label: 'Code',
    items: [
      {
        id: 'source',
        label: 'View page source',
        icon: 'i-simple-icons-github',
        to: 'https://github.com/globe-and-citizen/cnc-portal/',
        target: '_blank'
      }
    ]
  }
])
</script>

<template>
  <!-- Admin Dashboard -->
  <div v-if="isAdmin">
    <UDashboardGroup unit="rem">
      <UDashboardSidebar
        id="default"
        v-model:open="open"
        collapsible
        resizable
        class="bg-elevated/25"
        :ui="{ footer: 'lg:border-t lg:border-default' }"
      >
        <template #header="{ collapsed }">
          <NuxtLink to="/" class="flex items-center justify-center">
            <img
              v-if="collapsed"
              src="/logo-icon.png"
              alt="CNC Portal"
              class="h-8 w-8 object-contain"
            >
            <img
              v-else
              src="/logo.png"
              alt="CNC Portal"
              class="h-10 w-auto object-contain"
            >
          </NuxtLink>
        </template>

        <template #default="{ collapsed }">
          <UDashboardSearchButton :collapsed="collapsed" class="bg-transparent ring-default" />

          <UNavigationMenu
            :collapsed="collapsed"
            :items="links[0]"
            orientation="vertical"
            tooltip
            popover
          />

          <UNavigationMenu
            :collapsed="collapsed"
            :items="links[1]"
            orientation="vertical"
            tooltip
            class="mt-auto"
          />
        </template>

        <template #footer="{ collapsed }">
          <UserMenu :collapsed="collapsed" />
        </template>
      </UDashboardSidebar>

      <UDashboardSearch :groups="groups" />

      <UDashboardPanel :id="panelId">
        <template #header>
          <UDashboardNavbar :title="pageTitle" :ui="{ right: 'gap-3' }">
            <template #leading>
              <UDashboardSidebarCollapse />
            </template>

            <template #right>
              <UTooltip text="Notifications" :shortcuts="['N']">
                <UButton
                  color="neutral"
                  variant="ghost"
                  square
                  @click="isNotificationsSlideoverOpen = true"
                >
                  <UChip color="error" inset>
                    <UIcon name="i-lucide-bell" class="size-5 shrink-0" />
                  </UChip>
                </UButton>
              </UTooltip>

              <UDropdownMenu :items="items">
                <UButton icon="i-lucide-plus" size="md" class="rounded-full" />
              </UDropdownMenu>
            </template>
          </UDashboardNavbar>
        </template>

        <template #body>
          <slot />
        </template>
      </UDashboardPanel>

      <NotificationsSlideover />
    </UDashboardGroup>
  </div>

  <!-- Non-Admin Redirect (will be redirected to access-denied page) -->
  <div v-else class="flex items-center justify-center min-h-screen bg-slate-900">
    <div class="text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
      <p class="text-slate-400">
        Checking permissions...
      </p>
    </div>
  </div>
</template>
