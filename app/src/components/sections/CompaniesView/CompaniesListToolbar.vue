<template>
  <div class="flex flex-col gap-3 lg:flex-row lg:items-center" data-test="companies-toolbar">
    <div class="flex items-center gap-3">
      <h2>{{ title }}</h2>
      <!-- Role segmented control -->
      <div
        class="border-default bg-default inline-flex items-center gap-0.5 rounded-lg border p-0.5"
        data-test="role-filter"
      >
        <UButton
          :color="role === 'all' ? 'primary' : 'neutral'"
          :variant="role === 'all' ? 'soft' : 'ghost'"
          size="xs"
          data-test="role-option-all"
          @click="role = 'all'"
        >
          All · {{ counts.all }}
        </UButton>
        <UButton
          :color="role === 'owner' ? 'primary' : 'neutral'"
          :variant="role === 'owner' ? 'soft' : 'ghost'"
          size="xs"
          data-test="role-option-owner"
          @click="role = 'owner'"
        >
          Owner · {{ counts.owner }}
        </UButton>
        <UButton
          :color="role === 'employee' ? 'primary' : 'neutral'"
          :variant="role === 'employee' ? 'soft' : 'ghost'"
          size="xs"
          data-test="role-option-employee"
          @click="role = 'employee'"
        >
          Employee · {{ counts.employee }}
        </UButton>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-2 lg:ml-auto">
      <!-- Search -->
      <UInput
        v-model="query"
        icon="i-heroicons-magnifying-glass"
        placeholder="Search companies"
        data-test="search-companies"
      />

      <!-- Filters popover -->
      <UPopover data-test="filters-popover">
        <UButton
          color="neutral"
          variant="soft"
          icon="i-heroicons-adjustments-horizontal"
          trailing-icon="i-heroicons-chevron-down"
          data-test="filters-button"
        >
          Filters
          <UBadge
            v-if="activeVisibilityCount > 0"
            color="primary"
            size="sm"
            data-test="filters-count-badge"
          >
            {{ activeVisibilityCount }}
          </UBadge>
        </UButton>

        <template #content>
          <div class="flex w-64 flex-col gap-1 p-3" data-test="filters-panel">
            <p class="text-muted text-xs font-semibold tracking-wide uppercase">Visibility</p>
            <div class="flex items-center justify-between gap-3 py-2">
              <div class="flex min-w-0 flex-col">
                <span class="text-default text-sm font-medium">Hidden companies</span>
                <span class="text-muted text-xs">Teams you set aside</span>
              </div>
              <USwitch
                v-model="showHidden"
                size="sm"
                :ui="{ base: showHidden ? 'data-[state=checked]:bg-success' : '' }"
                data-test="toggle-show-hidden"
              />
            </div>
            <div class="border-muted flex items-center justify-between gap-3 border-t py-2">
              <div class="flex min-w-0 flex-col">
                <span class="text-default text-sm font-medium">Archived companies</span>
                <span class="text-muted text-xs">Closed or dormant teams</span>
              </div>
              <USwitch
                v-model="showArchived"
                size="sm"
                :ui="{ base: showArchived ? 'data-[state=checked]:bg-warning' : '' }"
                data-test="toggle-show-archived"
              />
            </div>
            <UButton
              color="neutral"
              variant="soft"
              size="sm"
              block
              :disabled="activeVisibilityCount === 0"
              data-test="reset-visibility"
              @click="resetVisibility"
            >
              Reset visibility
            </UButton>
          </div>
        </template>
      </UPopover>

      <!-- View toggle -->
      <div
        class="border-default bg-default inline-flex items-center gap-0.5 rounded-lg border p-0.5"
        data-test="view-toggle"
      >
        <UButton
          :color="view === 'cards' ? 'primary' : 'neutral'"
          :variant="view === 'cards' ? 'soft' : 'ghost'"
          size="sm"
          icon="i-heroicons-squares-2x2"
          aria-label="Cards view"
          data-test="view-toggle-cards"
          @click="view = 'cards'"
        />
        <UButton
          :color="view === 'table' ? 'primary' : 'neutral'"
          :variant="view === 'table' ? 'soft' : 'ghost'"
          size="sm"
          icon="i-heroicons-table-cells"
          aria-label="Table view"
          data-test="view-toggle-table"
          @click="view = 'table'"
        />
      </div>

      <!-- Create Company -->
      <UModal
        v-model:open="openModal"
        title="Create Company"
        description="Create Your Company Step By Step"
      >
        <UButton
          color="primary"
          icon="i-heroicons-plus"
          label="Create Company"
          data-test="create-company-button"
          @click="openModal = true"
        />

        <template #body>
          <AddTeamForm
            @done="
              () => {
                openModal = false
              }
            "
          />
        </template>
      </UModal>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AddTeamForm from '@/components/forms/AddTeamForm.vue'
import type { CompanyRoleFilter } from '@/composables/useCompaniesFilter'

defineProps<{
  title: string
  counts: { all: number; owner: number; employee: number }
}>()

const role = defineModel<CompanyRoleFilter>('role', { required: true })
const query = defineModel<string>('query', { required: true })
const showHidden = defineModel<boolean>('showHidden', { required: true })
const showArchived = defineModel<boolean>('showArchived', { required: true })
const view = defineModel<'cards' | 'table'>('view', { required: true })

const openModal = ref(false)

/** How many visibility filters are currently active (drives the badge). */
const activeVisibilityCount = computed(
  () => (showHidden.value ? 1 : 0) + (showArchived.value ? 1 : 0)
)

function resetVisibility() {
  showHidden.value = false
  showArchived.value = false
}
</script>
