<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

const route = useRoute();
const toast = useToast();

const open = ref(false);

const links = [
  [
    {
      label: "Overview",
      icon: "i-lucide-house",
      to: "/",
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: "Teams Management",
      icon: "i-lucide-users",
      to: "/teams",
      badge: "4",
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: "Micropayments",
      icon: "i-lucide-wallet",
      to: "/micropayments",
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: "Contracts",
      to: "/contracts",
      icon: "i-lucide-settings",
      defaultOpen: true,
      type: "trigger",
      children: [
        {
          label: "General",
          to: "/contracts",
          exact: true,
          onSelect: () => {
            open.value = false;
          },
        },
        {
          label: "Members",
          to: "/contracts",
          onSelect: () => {
            open.value = false;
          },
        },
        {
          label: "Notifications",
          to: "/contracts",
          onSelect: () => {
            open.value = false;
          },
        },
        {
          label: "Security",
          to: "/settings/security",
          onSelect: () => {
            open.value = false;
          },
        },
      ],
    },
  ],
  [
    {
      label: "Feedback",
      icon: "i-lucide-message-circle",
      to: "https://discord.gg/HG2GAhN2",
      target: "_blank",
    },
    {
      label: "Help & Support",
      icon: "i-lucide-info",
      to: "https://discord.gg/HG2GAhN2",
      target: "_blank",
    },
  ],
] satisfies NavigationMenuItem[][];

const groups = computed(() => [
  {
    id: "links",
    label: "Go to",
    items: links.flat(),
  },
  {
    id: "code",
    label: "Code",
    items: [
      {
        id: "source",
        label: "View page source",
        icon: "i-simple-icons-github",
        to: "https://github.com/globe-and-citizen/cnc-portal/",
        target: "_blank",
      },
    ],
  },
]);

onMounted(async () => {
  const cookie = useCookie("cookie-consent");
  if (cookie.value === "accepted") {
    return;
  }

  // toast.add({
  //   title:
  //     "We use first-party cookies to enhance your experience on our website.",
  //   duration: 0,
  //   close: false,
  //   actions: [
  //     {
  //       label: "Accept",
  //       color: "neutral",
  //       variant: "outline",
  //       onClick: () => {
  //         cookie.value = "accepted";
  //       },
  //     },
  //     {
  //       label: "Opt out",
  //       color: "neutral",
  //       variant: "ghost",
  //     },
  //   ],
  // });
});
</script>

<template>
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
        <UDashboardSearchButton
          :collapsed="collapsed"
          class="bg-transparent ring-default"
        />

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

    <slot />

    <NotificationsSlideover />
  </UDashboardGroup>
</template>
