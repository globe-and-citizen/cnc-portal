# State Management with Pinia

## Overview

The CNC Portal uses Pinia for centralized state management. Pinia provides a type-safe, modular approach to managing application state with excellent TypeScript support and Vue 3 Composition API integration.

## Store Structure

### Store Definition Pattern

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// ✅ Good: Setup store with Composition API syntax
export const useMyStore = defineStore('myStore', () => {
  // State (use ref)
  const count = ref(0)
  const items = ref<Item[]>([])
  const loading = ref(false)
  const error = ref<Error | null>(null)

  // Getters (use computed)
  const doubleCount = computed(() => count.value * 2)
  const hasItems = computed(() => items.value.length > 0)
  const isReady = computed(() => !loading.value && !error.value)

  // Actions (regular functions)
  const increment = () => {
    count.value++
  }

  const fetchItems = async () => {
    loading.value = true
    error.value = null
    try {
      const response = await api.get('/items')
      items.value = response.data
    } catch (err) {
      error.value = err as Error
    } finally {
      loading.value = false
    }
  }

  // Return everything that should be publicly accessible
  return {
    // State
    count,
    items,
    loading,
    error,
    // Getters
    doubleCount,
    hasItems,
    isReady,
    // Actions
    increment,
    fetchItems
  }
})
```

## State Organization

### State Types

```typescript
// ✅ Good: Define types for store state
interface User {
  id: string
  name: string
  email: string
  role: UserRole
}

interface UserState {
  currentUser: User | null
  users: User[]
  loading: boolean
  error: Error | null
}

export const useUserStore = defineStore('user', () => {
  // Initialize with typed state
  const currentUser = ref<User | null>(null)
  const users = ref<User[]>([])
  const loading = ref(false)
  const error = ref<Error | null>(null)

  // ... rest of the store
})
```

### Nested State

```typescript
// ✅ Good: Use reactive for complex nested objects
import { reactive } from 'vue'

export const useFormStore = defineStore('form', () => {
  const formData = reactive({
    personal: {
      name: '',
      email: '',
      phone: ''
    },
    address: {
      street: '',
      city: '',
      country: ''
    },
    preferences: {
      theme: 'light' as 'light' | 'dark',
      notifications: true
    }
  })

  const resetForm = () => {
    Object.assign(formData, {
      personal: { name: '', email: '', phone: '' },
      address: { street: '', city: '', country: '' },
      preferences: { theme: 'light', notifications: true }
    })
  }

  return { formData, resetForm }
})
```

## Getters (Computed Properties)

### Simple Getters

```typescript
export const useTeamStore = defineStore('team', () => {
  const members = ref<TeamMember[]>([])

  // ✅ Good: Derived state with computed
  const activeMembers = computed(() => 
    members.value.filter(m => m.status === 'active')
  )

  const memberCount = computed(() => members.value.length)

  const hasMembersWithRole = (role: string) => computed(() =>
    members.value.some(m => m.role === role)
  )

  return {
    members,
    activeMembers,
    memberCount,
    hasMembersWithRole
  }
})
```

### Getters with Parameters

```typescript
export const useProductStore = defineStore('product', () => {
  const products = ref<Product[]>([])

  // ✅ Good: Getter function for parameterized access
  const getProductById = (id: string) => {
    return products.value.find(p => p.id === id)
  }

  const getProductsByCategory = (category: string) => {
    return products.value.filter(p => p.category === category)
  }

  // ✅ Good: Computed for common filtered lists
  const availableProducts = computed(() =>
    products.value.filter(p => p.inStock && !p.discontinued)
  )

  return {
    products,
    getProductById,
    getProductsByCategory,
    availableProducts
  }
})
```

## Actions

### Async Actions

```typescript
export const useApiStore = defineStore('api', () => {
  const data = ref<ApiData | null>(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  // ✅ Good: Async action with proper error handling
  const fetchData = async (id: string) => {
    loading.value = true
    error.value = null

    try {
      const response = await api.get(`/data/${id}`)
      data.value = response.data
      return response.data
    } catch (err) {
      error.value = err as Error
      console.error('Failed to fetch data:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // ✅ Good: Action that depends on other actions
  const refreshData = async () => {
    if (!data.value?.id) return
    await fetchData(data.value.id)
  }

  return {
    data,
    loading,
    error,
    fetchData,
    refreshData
  }
})
```

### Action Composition

```typescript
export const useCartStore = defineStore('cart', () => {
  const items = ref<CartItem[]>([])
  const { addSuccessToast, addErrorToast } = useToastStore()

  // ✅ Good: Compose actions with other stores
  const addItem = (product: Product, quantity: number) => {
    const existingItem = items.value.find(i => i.productId === product.id)

    if (existingItem) {
      existingItem.quantity += quantity
    } else {
      items.value.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity
      })
    }

    addSuccessToast(`${product.name} added to cart`)
  }

  const removeItem = (productId: string) => {
    const index = items.value.findIndex(i => i.productId === productId)
    if (index > -1) {
      const item = items.value[index]
      items.value.splice(index, 1)
      addSuccessToast(`${item.name} removed from cart`)
    }
  }

  return {
    items,
    addItem,
    removeItem
  }
})
```

## Store Communication

### Accessing Other Stores

```typescript
// ✅ Good: Import and use other stores within store
import { useAuthStore } from './authStore'
import { useTeamStore } from './teamStore'

export const useProjectStore = defineStore('project', () => {
  const projects = ref<Project[]>([])
  
  // Access other stores inside actions
  const fetchUserProjects = async () => {
    const authStore = useAuthStore()
    const teamStore = useTeamStore()

    if (!authStore.isAuthenticated) {
      throw new Error('User must be authenticated')
    }

    const userId = authStore.currentUser?.id
    const teamId = teamStore.currentTeam?.id

    const response = await api.get('/projects', {
      params: { userId, teamId }
    })

    projects.value = response.data
  }

  return {
    projects,
    fetchUserProjects
  }
})
```

### Shared State Patterns

```typescript
// ✅ Good: Create a shared store for common data
export const useAppStore = defineStore('app', () => {
  const isOnline = ref(true)
  const isMobile = ref(false)
  const theme = useStorage('theme', 'light')

  const updateNetworkStatus = () => {
    isOnline.value = navigator.onLine
  }

  onMounted(() => {
    window.addEventListener('online', updateNetworkStatus)
    window.addEventListener('offline', updateNetworkStatus)
  })

  return {
    isOnline,
    isMobile,
    theme,
    updateNetworkStatus
  }
})
```

## Persistence

### Local Storage Integration

```typescript
import { useStorage } from '@vueuse/core'

// ✅ Good: Use VueUse's useStorage for persistence
export const useCurrencyStore = defineStore('currency', () => {
  // Automatically syncs with localStorage
  const currency = useStorage('currency', {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$'
  })

  const setCurrency = (newCurrency: Currency) => {
    currency.value = newCurrency
  }

  return {
    currency,
    setCurrency
  }
})
```

### Session Storage

```typescript
import { useSessionStorage } from '@vueuse/core'

export const useFormDraftStore = defineStore('formDraft', () => {
  // Persists only for the session
  const draft = useSessionStorage<FormData | null>('formDraft', null)

  const saveDraft = (data: FormData) => {
    draft.value = data
  }

  const clearDraft = () => {
    draft.value = null
  }

  return {
    draft,
    saveDraft,
    clearDraft
  }
})
```

## Store Composition Patterns

### Base Store Pattern

```typescript
// ✅ Good: Create reusable store composition
export function useAsyncStore<T>(
  storeName: string,
  fetchFn: () => Promise<T>
) {
  return defineStore(storeName, () => {
    const data = ref<T | null>(null)
    const loading = ref(false)
    const error = ref<Error | null>(null)

    const fetch = async () => {
      loading.value = true
      error.value = null
      try {
        data.value = await fetchFn()
      } catch (err) {
        error.value = err as Error
      } finally {
        loading.value = false
      }
    }

    const reset = () => {
      data.value = null
      error.value = null
      loading.value = false
    }

    return {
      data,
      loading,
      error,
      fetch,
      reset
    }
  })
}

// Usage
const useUsersStore = useAsyncStore('users', () => api.get('/users'))
```

## State Reset

### Reset Individual Store

```typescript
export const useCounterStore = defineStore('counter', () => {
  const count = ref(0)
  const multiplier = ref(1)

  const increment = () => {
    count.value++
  }

  // ✅ Good: Provide reset method
  const $reset = () => {
    count.value = 0
    multiplier.value = 1
  }

  return {
    count,
    multiplier,
    increment,
    $reset
  }
})
```

### Reset All Stores

```typescript
// ✅ Good: Global store reset utility
import { getActivePinia } from 'pinia'

export function resetAllStores() {
  const pinia = getActivePinia()
  if (!pinia) return

  pinia._s.forEach((store) => {
    if ('$reset' in store && typeof store.$reset === 'function') {
      store.$reset()
    }
  })
}
```

## State Subscriptions

### Watch Store Changes

```typescript
export const useNotificationStore = defineStore('notification', () => {
  const notifications = ref<Notification[]>([])

  // ✅ Good: Subscribe to store changes
  const setupNotificationWatcher = () => {
    watch(
      () => notifications.value.length,
      (newCount, oldCount) => {
        if (newCount > oldCount) {
          // Play notification sound or show toast
          console.log('New notification received')
        }
      }
    )
  }

  return {
    notifications,
    setupNotificationWatcher
  }
})
```

### Subscribe to Specific State

```typescript
export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(null)

  // ✅ Good: Watch specific state changes
  watch(token, (newToken) => {
    if (newToken) {
      // Set default auth header
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
    } else {
      delete api.defaults.headers.common['Authorization']
    }
  })

  return {
    user,
    token
  }
})
```

## Testing Stores

### Testing with createPinia

```typescript
import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useCounterStore } from './counterStore'

describe('Counter Store', () => {
  beforeEach(() => {
    // Create a fresh pinia instance for each test
    setActivePinia(createPinia())
  })

  it('should increment counter', () => {
    const store = useCounterStore()
    expect(store.count).toBe(0)
    
    store.increment()
    expect(store.count).toBe(1)
  })

  it('should reset counter', () => {
    const store = useCounterStore()
    store.increment()
    store.increment()
    expect(store.count).toBe(2)
    
    store.$reset()
    expect(store.count).toBe(0)
  })
})
```

### Testing with createTestingPinia

```typescript
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { describe, it, expect, vi } from 'vitest'
import MyComponent from './MyComponent.vue'

describe('MyComponent', () => {
  it('should use store correctly', () => {
    const wrapper = mount(MyComponent, {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              counter: { count: 5 }
            }
          })
        ]
      }
    })

    expect(wrapper.text()).toContain('5')
  })
})
```

## Performance Optimization

### Memoization in Getters

```typescript
export const useExpensiveStore = defineStore('expensive', () => {
  const data = ref<LargeDataset[]>([])

  // ✅ Good: Memoized expensive computation
  const processedData = computed(() => {
    return data.value.map(item => ({
      ...item,
      computed: expensiveCalculation(item)
    }))
  })

  return {
    data,
    processedData
  }
})
```

### Lazy Loading Stores

```typescript
// ✅ Good: Load store only when needed
const loadUserStore = async () => {
  const { useUserStore } = await import('@/stores/userStore')
  return useUserStore()
}

// In component
const loadData = async () => {
  const userStore = await loadUserStore()
  await userStore.fetchUsers()
}
```

## Common Anti-Patterns to Avoid

### Don't Mutate State Directly from Components

```typescript
// ❌ Bad: Direct state mutation from component
const counterStore = useCounterStore()
counterStore.count++ // Don't do this

// ✅ Good: Use actions
counterStore.increment()
```

### Don't Use Store Outside Setup

```typescript
// ❌ Bad: Using store outside setup
const myStore = useMyStore() // Called at module level

export default defineComponent({
  setup() {
    // This will cause issues
  }
})

// ✅ Good: Use store inside setup or composables
export default defineComponent({
  setup() {
    const myStore = useMyStore() // Called in setup
    return { myStore }
  }
})
```

### Avoid Circular Dependencies

```typescript
// ❌ Bad: Circular store dependencies
// storeA imports storeB and storeB imports storeA

// ✅ Good: Extract shared logic to a composable or separate store
// Create a third store or composable that both can use
```

### Don't Store Reactive Objects from Other Sources

```typescript
// ❌ Bad: Storing props or other reactive objects
export const useBadStore = defineStore('bad', () => {
  const externalData = ref(null)
  
  const setData = (props) => {
    externalData.value = props // Don't store reactive objects
  }
})

// ✅ Good: Store plain values
export const useGoodStore = defineStore('good', () => {
  const data = ref(null)
  
  const setData = (props) => {
    data.value = { ...toRaw(props) } // Store plain copy
  }
})
```

## Store Organization Tips

### File Structure

```
stores/
├── index.ts           # Export all stores
├── authStore.ts       # Authentication state
├── userStore.ts       # User data
├── teamStore.ts       # Team management
├── currencyStore.ts   # Currency preferences
└── toastStore.ts      # UI notifications
```

### Index File Pattern

```typescript
// stores/index.ts
// ✅ Good: Central export point
export { useAuthStore } from './authStore'
export { useUserStore } from './userStore'
export { useTeamStore } from './teamStore'
export { useCurrencyStore } from './currencyStore'
export { useToastStore } from './toastStore'

// Re-export types
export type { User } from './userStore'
export type { Team } from './teamStore'
```
