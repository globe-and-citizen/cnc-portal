# Performance Optimization Guidelines

## Overview

Performance is critical for user experience. The CNC Portal should load quickly, respond immediately to user interactions, and handle blockchain operations efficiently.

## Frontend Performance

### Component Optimization

#### Lazy Loading Components

```typescript
// ✅ Good: Lazy load heavy components
import { defineAsyncComponent } from 'vue'

const HeavyChart = defineAsyncComponent(() => 
  import('@/components/HeavyChart.vue')
)

const AdminPanel = defineAsyncComponent({
  loader: () => import('@/components/AdminPanel.vue'),
  loadingComponent: LoadingSpinner,
  errorComponent: ErrorDisplay,
  delay: 200,
  timeout: 3000
})
```

#### Component Memoization

```typescript
// ✅ Good: Use computed for expensive calculations
const processedData = computed(() => {
  return data.value.map(item => expensiveTransform(item))
})

// ✅ Good: Cache function results
import { useMemoize } from '@vueuse/core'

const expensiveCalculation = useMemoize((input: number) => {
  // Heavy computation
  return result
})
```

### Virtual Scrolling

```typescript
// ✅ Good: Use virtual scrolling for large lists
<template>
  <VirtualScroller
    :items="largeItemList"
    :item-height="50"
    v-slot="{ item }"
  >
    <ItemComponent :item="item" />
  </VirtualScroller>
</template>
```

### Debouncing and Throttling

```typescript
import { useDebounceFn, useThrottleFn } from '@vueuse/core'

// ✅ Good: Debounce search input
const debouncedSearch = useDebounceFn((query: string) => {
  searchStore.search(query)
}, 300)

// ✅ Good: Throttle scroll handler
const throttledScroll = useThrottleFn(() => {
  handleScroll()
}, 100)
```

## Vue Reactivity Optimization

### Choose Appropriate Reactivity APIs

```typescript
// ✅ Good: Use ref for primitives
const count = ref(0)
const message = ref('Hello')

// ✅ Good: Use reactive for objects
const user = reactive({
  name: 'John',
  email: 'john@example.com'
})

// ✅ Good: Use shallowRef for large, infrequently changing data
const largeDataset = shallowRef<BigData[]>([])

// ✅ Good: Use shallowReactive for objects with shallow updates
const config = shallowReactive({
  theme: 'dark',
  lang: 'en'
})
```

### Avoid Unnecessary Watchers

```typescript
// ❌ Bad: Watcher for derived state
watch(firstName, () => {
  fullName.value = `${firstName.value} ${lastName.value}`
})

// ✅ Good: Use computed instead
const fullName = computed(() => `${firstName.value} ${lastName.value}`)
```

### Optimize Watch Performance

```typescript
// ✅ Good: Use lazy watchers
watch(source, callback, { lazy: true })

// ✅ Good: Use flush timing appropriately
watch(source, callback, { flush: 'post' }) // After component updates

// ✅ Good: Stop watchers when no longer needed
const stop = watch(source, callback)
onUnmounted(() => stop())
```

## Bundle Size Optimization

### Code Splitting

```typescript
// ✅ Good: Route-level code splitting
const routes = [
  {
    path: '/dashboard',
    component: () => import('@/views/Dashboard.vue')
  },
  {
    path: '/admin',
    component: () => import('@/views/Admin.vue')
  }
]
```

### Tree Shaking

```typescript
// ✅ Good: Import only what you need
import { computed, ref } from 'vue'

// ❌ Bad: Import entire library
import _ from 'lodash'

// ✅ Good: Import specific functions
import debounce from 'lodash/debounce'
```

### Dynamic Imports

```typescript
// ✅ Good: Import libraries only when needed
const loadChart = async () => {
  const { Chart } = await import('chart.js')
  return new Chart(ctx, config)
}

// ✅ Good: Conditional imports
if (isDevelopment) {
  const devTools = await import('./devTools')
  devTools.init()
}
```

## Image Optimization

### Lazy Loading Images

```typescript
// ✅ Good: Use native lazy loading
<img 
  src="image.jpg" 
  loading="lazy" 
  alt="Description"
/>

// ✅ Good: Use VueUse's useIntersectionObserver
import { useIntersectionObserver } from '@vueuse/core'

const { stop } = useIntersectionObserver(
  imageRef,
  ([{ isIntersecting }]) => {
    if (isIntersecting) {
      loadImage()
      stop()
    }
  }
)
```

### Responsive Images

```typescript
// ✅ Good: Serve appropriately sized images
<picture>
  <source 
    srcset="image-small.jpg" 
    media="(max-width: 640px)"
  />
  <source 
    srcset="image-medium.jpg" 
    media="(max-width: 1024px)"
  />
  <img 
    src="image-large.jpg" 
    alt="Description"
  />
</picture>
```

## API and Data Fetching

### Request Optimization

```typescript
// ✅ Good: Cache API responses
import { useQuery } from '@tanstack/vue-query'

const { data, isLoading } = useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000 // 10 minutes
})

// ✅ Good: Parallel requests
const [users, posts, comments] = await Promise.all([
  fetchUsers(),
  fetchPosts(),
  fetchComments()
])

// ✅ Good: Batch requests
const batchedRequests = users.map(user => fetchUserDetails(user.id))
const results = await Promise.all(batchedRequests)
```

### Pagination and Infinite Scroll

```typescript
// ✅ Good: Implement pagination
const page = ref(1)
const pageSize = 20

const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
  queryKey: ['items'],
  queryFn: ({ pageParam = 1 }) => fetchItems(pageParam, pageSize),
  getNextPageParam: (lastPage, pages) => 
    lastPage.hasMore ? pages.length + 1 : undefined
})
```

### Prefetching Data

```typescript
// ✅ Good: Prefetch on hover
import { useQueryClient } from '@tanstack/vue-query'

const queryClient = useQueryClient()

const prefetchUser = (userId: string) => {
  queryClient.prefetchQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId)
  })
}

// In component
<a 
  @mouseenter="prefetchUser(user.id)"
  :href="`/users/${user.id}`"
>
  {{ user.name }}
</a>
```

## Web3 Performance

### Batch Contract Reads

```typescript
// ✅ Good: Use multicall for batch reads
import { useReadContracts } from 'wagmi'

const { data } = useReadContracts({
  contracts: [
    {
      address: TOKEN_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [address1]
    },
    {
      address: TOKEN_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [address2]
    }
  ]
})
```

### Optimize Event Listening

```typescript
// ✅ Good: Filter events efficiently
import { useWatchContractEvent } from 'wagmi'

// Only listen to relevant events
useWatchContractEvent({
  address: CONTRACT_ADDRESS,
  abi: CONTRACT_ABI,
  eventName: 'Transfer',
  args: {
    from: userAddress // Filter by specific address
  },
  onLogs: handleTransferLogs
})
```

### Cache Contract Calls

```typescript
// ✅ Good: Cache contract reads
const useTokenBalance = (address: Ref<Address>) => {
  return useQuery({
    queryKey: ['tokenBalance', address],
    queryFn: async () => {
      return await readContract({
        address: TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address.value]
      })
    },
    staleTime: 10000, // 10 seconds
    enabled: computed(() => !!address.value)
  })
}
```

## Rendering Performance

### v-show vs v-if

```typescript
// ✅ Good: Use v-show for frequently toggled elements
<div v-show="isVisible">
  Expensive component that toggles frequently
</div>

// ✅ Good: Use v-if for rarely shown elements
<AdminPanel v-if="isAdmin" />
```

### Key Optimization

```typescript
// ✅ Good: Use stable keys for lists
<div
  v-for="item in items"
  :key="item.id"
>
  {{ item.name }}
</div>

// ❌ Bad: Using index as key for dynamic lists
<div
  v-for="(item, index) in items"
  :key="index"
>
  {{ item.name }}
</div>
```

### Avoid Inline Functions in Templates

```typescript
// ❌ Bad: Creating new function on each render
<button @click="() => handleClick(item.id)">
  Click
</button>

// ✅ Good: Use method reference
const handleItemClick = (id: string) => {
  handleClick(id)
}

<button @click="handleItemClick(item.id)">
  Click
</button>
```

## Memory Management

### Clean Up Resources

```typescript
// ✅ Good: Clean up event listeners
onMounted(() => {
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})

// ✅ Good: Cancel pending requests
const abortController = new AbortController()

const fetchData = async () => {
  await fetch('/api/data', { signal: abortController.signal })
}

onUnmounted(() => {
  abortController.abort()
})
```

### Avoid Memory Leaks

```typescript
// ✅ Good: Stop watchers
const stopWatch = watch(source, callback)
onUnmounted(() => stopWatch())

// ✅ Good: Clear intervals/timeouts
const interval = setInterval(update, 1000)
onUnmounted(() => clearInterval(interval))

// ✅ Good: Unsubscribe from stores
const unsubscribe = store.$subscribe(callback)
onUnmounted(() => unsubscribe())
```

## Build Optimization

### Vite Configuration

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    // ✅ Good: Enable minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    
    // ✅ Good: Optimize chunk splitting
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['vue', 'vue-router', 'pinia'],
          'web3': ['wagmi', 'viem'],
          'ui': ['@headlessui/vue', 'daisyui']
        }
      }
    }
  }
})
```

## Monitoring Performance

### Performance Metrics

```typescript
// ✅ Good: Measure component performance
import { onMounted } from 'vue'

onMounted(() => {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      console.log('Component render time:', entry.duration)
    }
  })
  
  observer.observe({ entryTypes: ['measure'] })
  
  performance.mark('component-start')
  // Component logic
  performance.mark('component-end')
  performance.measure('component', 'component-start', 'component-end')
})
```

### Web Vitals

```typescript
// ✅ Good: Track Core Web Vitals
import { onCLS, onFID, onLCP } from 'web-vitals'

onCLS(console.log) // Cumulative Layout Shift
onFID(console.log) // First Input Delay
onLCP(console.log) // Largest Contentful Paint
```

## CSS Performance

### Optimize CSS

```css
/* ✅ Good: Use efficient selectors */
.button { }
.button--primary { }

/* ❌ Bad: Avoid expensive selectors */
div > ul > li:first-child { }
[class*="button"] { }

/* ✅ Good: Use contain for independent components */
.component {
  contain: layout style paint;
}

/* ✅ Good: Use will-change sparingly */
.animated-element {
  will-change: transform;
}
```

### Avoid Layout Thrashing

```typescript
// ❌ Bad: Interleaved reads and writes
element.style.height = element.offsetHeight + 10 + 'px'
element.style.width = element.offsetWidth + 10 + 'px'

// ✅ Good: Batch reads, then writes
const height = element.offsetHeight
const width = element.offsetWidth
element.style.height = height + 10 + 'px'
element.style.width = width + 10 + 'px'
```

## Common Performance Anti-Patterns

```typescript
// ❌ Bad: Deep watchers on large objects
watch(largeObject, callback, { deep: true })

// ✅ Good: Watch specific properties
watch(() => largeObject.value.specificProp, callback)

// ❌ Bad: Unoptimized loops
for (let i = 0; i < array.length; i++) {
  document.body.appendChild(createNode(array[i]))
}

// ✅ Good: Batch DOM updates
const fragment = document.createDocumentFragment()
for (let i = 0; i < array.length; i++) {
  fragment.appendChild(createNode(array[i]))
}
document.body.appendChild(fragment)

// ❌ Bad: Synchronous blocking operations
const result = expensiveSync()

// ✅ Good: Use Web Workers for heavy computation
const worker = new Worker('worker.js')
worker.postMessage(data)
worker.onmessage = (e) => {
  const result = e.data
}
```

## Performance Checklist

- [ ] Lazy load routes and heavy components
- [ ] Use virtual scrolling for large lists
- [ ] Implement pagination or infinite scroll
- [ ] Debounce/throttle frequent operations
- [ ] Cache API responses appropriately
- [ ] Optimize images (lazy loading, responsive)
- [ ] Use appropriate reactivity APIs
- [ ] Batch contract reads with multicall
- [ ] Clean up resources on unmount
- [ ] Monitor and track performance metrics
- [ ] Use code splitting and tree shaking
- [ ] Optimize bundle size
- [ ] Avoid memory leaks
- [ ] Use efficient CSS selectors
