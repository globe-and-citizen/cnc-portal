# Statistics Dashboard Integration Guide

## Overview

This guide explains how to integrate and use the Statistics API in the Nuxt Dashboard application. It covers the composable usage, component implementation, and best practices for displaying statistics.

## Architecture

The stats integration follows a clean architecture pattern:

```
Dashboard App
├── Types (TypeScript definitions)
├── Composables (API integration layer)
├── Components (UI display components)
└── Pages (Route-level components)
```

## Getting Started

### 1. Type Definitions

All statistics types are defined in `/dashboard/app/types/index.d.ts`:

```typescript
// Period type for time-based filtering
export type StatsPeriod = '7d' | '30d' | '90d' | 'all'

// Main overview statistics
export interface StatsOverview {
  totalTeams: number
  activeTeams: number
  totalMembers: number
  totalClaims: number
  // ... other fields
  growthMetrics: {
    teamsGrowth: number
    membersGrowth: number
    claimsGrowth: number
  }
  period: string
}

// Similar interfaces for other stat types:
// TeamStats, UserStats, ClaimsStats, WagesStats, etc.
```

### 2. The useStats Composable

The `useStats` composable (`/dashboard/app/composables/useStats.ts`) provides a clean API for fetching statistics:

```typescript
const {
  isLoading,
  error,
  getOverviewStats,
  getTeamsStats,
  getUsersStats,
  getClaimsStats,
  getWagesStats,
  getExpensesStats,
  getContractsStats,
  getActionsStats,
  getRecentActivity,
  refreshAllStats
} = useStats()
```

#### Key Features

- **Automatic Authentication**: Uses JWT token from `useAuthStore`
- **Error Handling**: Built-in error handling with user-friendly messages
- **Loading States**: Reactive loading state tracking
- **Type Safety**: Full TypeScript support with proper type inference

#### Usage Examples

```typescript
// Fetch overview statistics
const overview = await getOverviewStats('30d', teamId)

// Fetch team statistics with pagination
const teams = await getTeamsStats('7d', 1, 10)

// Fetch recent activity
const activity = await getRecentActivity(50, teamId)

// Refresh all stats at once
const allStats = await refreshAllStats('90d')
```

### 3. Component Integration

#### Using Stats in Vue Components

```vue
<script setup lang="ts">
import type { StatsPeriod } from '~/types'

const { getOverviewStats, isLoading, error } = useStats()

const selectedPeriod = ref<StatsPeriod>('30d')

// Fetch data with useAsyncData for SSR compatibility
const { data: stats, refresh } = await useAsyncData(
  'overview-stats',
  () => getOverviewStats(selectedPeriod.value),
  { watch: [selectedPeriod] }
)

// Manual refresh handler
const handleRefresh = async () => {
  await refresh()
}
</script>

<template>
  <div>
    <!-- Loading state -->
    <USkeleton v-if="isLoading" class="h-32 w-full" />
    
    <!-- Error state -->
    <UAlert
      v-else-if="error"
      color="error"
      :description="error.message"
    />
    
    <!-- Data display -->
    <div v-else-if="stats">
      <p>Total Teams: {{ stats.totalTeams }}</p>
      <p>Active Teams: {{ stats.activeTeams }}</p>
    </div>
  </div>
</template>
```

#### Period Selector Component

```vue
<script setup lang="ts">
import type { StatsPeriod } from '~/types'

const selectedPeriod = defineModel<StatsPeriod>({ default: '30d' })

const periodOptions = [
  { label: 'Last 7 Days', value: '7d' as StatsPeriod },
  { label: 'Last 30 Days', value: '30d' as StatsPeriod },
  { label: 'Last 90 Days', value: '90d' as StatsPeriod },
  { label: 'All Time', value: 'all' as StatsPeriod }
]
</script>

<template>
  <USelectMenu
    v-model="selectedPeriod"
    :options="periodOptions"
    value-attribute="value"
    option-attribute="label"
  />
</template>
```

### 4. Existing Implementations

#### Home Page Stats (HomeStats.vue)

The home page displays 4 key metrics using the overview stats:

```vue
<script setup lang="ts">
const { getOverviewStats } = useStats()

// Map UI period to API period format
const apiPeriod = computed<StatsPeriod>(() => {
  const periodMap: Record<Period, StatsPeriod> = {
    daily: '7d',
    weekly: '30d',
    monthly: '90d'
  }
  return periodMap[props.period] || '30d'
})

const { data: stats } = await useAsyncData(
  'home-stats',
  async () => {
    const overviewData = await getOverviewStats(apiPeriod.value)
    
    return [
      {
        title: 'Teams',
        icon: 'i-lucide-users',
        value: formatNumber(overviewData.totalTeams),
        variation: overviewData.growthMetrics.teamsGrowth
      },
      // ... other metrics
    ]
  },
  { watch: [apiPeriod] }
)
</script>
```

#### Stats Page (stats.vue)

Full-featured statistics dashboard with tabs:

```vue
<script setup lang="ts">
const selectedPeriod = ref<StatsPeriod>('30d')
const selectedTab = ref(0)

// Fetch all stat types
const { data: overviewData } = await useAsyncData(
  'stats-overview',
  () => getOverviewStats(selectedPeriod.value),
  { watch: [selectedPeriod] }
)

const { data: teamsData } = await useAsyncData(
  'stats-teams',
  () => getTeamsStats(selectedPeriod.value, 1, 10),
  { watch: [selectedPeriod] }
)

// ... other stat types
</script>

<template>
  <div>
    <!-- Period selector and refresh button -->
    <USelectMenu v-model="selectedPeriod" :options="periodOptions" />
    <UButton @click="refreshAll">Refresh</UButton>
    
    <!-- Tabbed interface -->
    <UTabs v-model="selectedTab" :items="tabs">
      <StatsOverviewSection :data="overviewData" :is-loading="isLoading" />
      <!-- ... other sections -->
    </UTabs>
  </div>
</template>
```

## Component Library

### StatsOverviewSection.vue

Displays comprehensive platform metrics in a grid layout:

- **Primary metrics**: Teams, Members, Claims, Contracts with growth badges
- **Secondary metrics**: Claims overview, Board actions, Notifications
- **Platform metrics**: Active teams, Total expenses, Hours worked

### StatsActivitySection.vue

Displays recent activity feed with:

- Activity type icons
- User and team information
- Formatted timestamps
- Empty state handling

### Placeholder Components

The following section components are created as placeholders for future expansion:

- `StatsTeamsSection.vue`
- `StatsUsersSection.vue`
- `StatsClaimsSection.vue`
- `StatsWagesSection.vue`
- `StatsExpensesSection.vue`
- `StatsContractsSection.vue`
- `StatsActionsSection.vue`

## Best Practices

### 1. Error Handling

Always handle loading and error states:

```vue
<template>
  <!-- Loading -->
  <USkeleton v-if="pending" />
  
  <!-- Error -->
  <UAlert v-else-if="error" color="error" :description="error.message" />
  
  <!-- Data -->
  <div v-else-if="data">
    <!-- Display data -->
  </div>
  
  <!-- Empty state -->
  <div v-else>
    No data available
  </div>
</template>
```

### 2. Data Formatting

Use consistent formatting utilities:

```typescript
const formatNumber = (value: number) => value?.toLocaleString('en-US') || '0'
const formatPercent = (value: number) => `${value >= 0 ? '+' : ''}${value?.toFixed(1) || 0}%`
const formatCurrency = (value: number) => value?.toLocaleString('en-US', {
  style: 'currency',
  currency: 'USD'
}) || '$0'
```

### 3. Performance Optimization

```typescript
// Use watch for reactive updates
const { data } = await useAsyncData(
  'unique-key',
  () => getStats(period.value),
  {
    watch: [period],  // Auto-refresh when period changes
    lazy: true,       // Don't block initial render
    server: false     // Client-side only (if SSR not needed)
  }
)

// Debounce rapid changes
const debouncedPeriod = refDebounced(selectedPeriod, 300)
```

### 4. Authentication

The composable automatically handles authentication:

```typescript
const token = authStore.getToken()
if (!token) {
  error.value = { message: 'Authentication required', code: 'AUTH_REQUIRED' }
  return null
}
```

### 5. Type Safety

Always use proper types:

```typescript
// ✅ Good
const stats = ref<StatsOverview | null>(null)

// ❌ Bad
const stats = ref<any>(null)
```

## Extending the Stats Feature

### Adding a New Stat Type

1. **Define the type** in `types/index.d.ts`:

```typescript
export interface NewStatType {
  total: number
  active: number
  period: string
}
```

2. **Add composable function** in `composables/useStats.ts`:

```typescript
const getNewStats = async (period: StatsPeriod = '30d'): Promise<NewStatType | null> => {
  return await fetchStats<NewStatType>('/new-stats', { period })
}

return {
  // ... existing functions
  getNewStats
}
```

3. **Create section component** in `components/stats/`:

```vue
<script setup lang="ts">
import type { NewStatType } from '~/types'

defineProps<{
  data: NewStatType | null | undefined
  isLoading: boolean
}>()
</script>

<template>
  <UPageCard title="New Statistics">
    <!-- Display logic -->
  </UPageCard>
</template>
```

4. **Add to stats page**:

```vue
const { data: newStats } = await useAsyncData(
  'stats-new',
  () => getNewStats(selectedPeriod.value),
  { watch: [selectedPeriod] }
)
```

### Adding Charts/Visualizations

To add charts, install a charting library:

```bash
npm install chart.js vue-chartjs
```

Example implementation:

```vue
<script setup lang="ts">
import { Line } from 'vue-chartjs'

const chartData = computed(() => ({
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
  datasets: [{
    label: 'Claims',
    data: [12, 19, 3, 5, 2]
  }]
}))
</script>

<template>
  <Line :data="chartData" />
</template>
```

## Troubleshooting

### Authentication Errors

**Problem**: `401 Unauthorized` errors

**Solution**: Ensure user is authenticated and token is valid:

```typescript
const authStore = useAuthStore()
if (!authStore.isAuthenticated) {
  navigateTo('/login')
}
```

### CORS Errors

**Problem**: CORS errors when calling API

**Solution**: Verify `nuxt.config.ts` has correct backend URL:

```typescript
runtimeConfig: {
  public: {
    backendUrl: process.env.NUXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'
  }
}
```

### Type Errors

**Problem**: TypeScript type mismatches

**Solution**: Ensure types match API response:

```typescript
// Use optional chaining for nested properties
const growth = data?.growthMetrics?.teamsGrowth ?? 0
```

### Data Not Updating

**Problem**: Stats don't update when period changes

**Solution**: Ensure watch is configured correctly:

```typescript
const { data } = await useAsyncData(
  'stats-key',
  () => getStats(period.value),
  { watch: [period] }  // Must include watched refs
)
```

## Testing

### Component Testing

```typescript
import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import StatsOverviewSection from './StatsOverviewSection.vue'

describe('StatsOverviewSection', () => {
  it('should display stats when data is provided', () => {
    const wrapper = mount(StatsOverviewSection, {
      props: {
        data: {
          totalTeams: 45,
          activeTeams: 32,
          // ... other fields
        },
        isLoading: false
      }
    })
    
    expect(wrapper.text()).toContain('45')
    expect(wrapper.text()).toContain('32')
  })
  
  it('should show loading state', () => {
    const wrapper = mount(StatsOverviewSection, {
      props: {
        data: null,
        isLoading: true
      }
    })
    
    expect(wrapper.findComponent({ name: 'USkeleton' }).exists()).toBe(true)
  })
})
```

## Resources

- [Nuxt 3 Documentation](https://nuxt.com/docs)
- [Nuxt UI Documentation](https://ui.nuxt.com)
- [Stats API Documentation](./stats-api.md)
- [Vue Test Utils](https://test-utils.vuejs.org)
