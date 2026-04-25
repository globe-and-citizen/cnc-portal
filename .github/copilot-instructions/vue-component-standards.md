# Vue.js Component Standards

## Composition API Standards

Always use Composition API with `<script setup lang="ts">` syntax for all new components.

### Component Structure

## Props and Events

### Props Definition

Always define props with TypeScript interfaces and provide defaults where appropriate:

```typescript
interface Props {
  // Required props (no default value)
  options: Array<{ value: string; label: string }>
  
  // Optional props (with defaults)
  modelValue?: string
  disabled?: boolean
  placeholder?: string
  
  // Complex types
  validator?: (value: string) => boolean
  formatValue?: (value: string) => string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  disabled: false,
  placeholder: 'Select an option'
})
```

### Event Emissions

Use `defineEmits` with proper TypeScript typing:

```typescript
const emit = defineEmits<{
  'update:modelValue': [value: string]
  submit: [data: FormData]
  close: []
  error: [error: Error]
}>()

// Usage
emit('update:modelValue', newValue)
emit('submit', formData)
emit('close')
emit('error', new Error('Something went wrong'))
```

## Data-Test Attributes

All interactive elements must have `data-test` attributes for testing:

```html
<template>
  <div class="component">
    <button 
      data-test="submit-button"
      :disabled="!isValid"
      @click="handleSubmit"
    >
      Submit
    </button>
    
    <input 
      data-test="email-input"
      v-model="email"
      type="email"
    />
    
    <div 
      data-test="error-message"
      v-if="hasError"
    >
      {{ errorMessage }}
    </div>
  </div>
</template>
```

## Reactivity Best Practices

### Use Appropriate Reactivity APIs

```typescript
// Use ref() for primitive values
const count = ref(0)
const message = ref('Hello')
const isVisible = ref(true)

// Use reactive() for objects that need deep reactivity
const user = reactive({
  name: 'John',
  email: 'john@example.com',
  preferences: {
    theme: 'dark',
    notifications: true
  }
})

// Use shallowRef() for large objects that don't need deep reactivity
const largeDataset = shallowRef([])

// Use computed() for derived state
const fullName = computed(() => `${user.firstName} ${user.lastName}`)
const isFormValid = computed(() => {
  return email.value.includes('@') && password.value.length >= 8
})
```

### Avoid Unnecessary Watchers

```typescript
// ❌ Bad: Unnecessary watcher
const count = ref(0)
const doubledCount = ref(0)

watch(count, (newCount) => {
  doubledCount.value = newCount * 2
})

// ✅ Good: Use computed instead
const count = ref(0)
const doubledCount = computed(() => count.value * 2)
```

## Error Handling in Components

### Notifications

Two complementary surfaces — pick the right one:

- **`useToast()` (Nuxt UI)** for transient, global notifications (success after an action, network/wallet failures the user must notice). Auto-imported. Reference call sites: `app/src/composables/useSiwe.ts`, `app/src/App.vue`.
- **`<UAlert />`** for inline, reactive errors scoped to a form or section. Reference: `app/src/components/sections/ContractManagementView/forms/TransferOwnershipForm.vue`.

Prefer `<UAlert />` over `try/catch + toast` when the error is tied to a specific form field or mutation — it composes naturally with the TanStack Query mutation pattern (see `AGENTS.md`).

```typescript
// Global notification
const toast = useToast()

const handleSubmit = async () => {
  loading.value = true
  await submitForm()
  toast.add({ title: 'Form submitted successfully', color: 'success' })
  loading.value = false
}
```

```vue
<!-- Inline reactive error -->
<UAlert v-if="errorMessage" color="error" :description="errorMessage" />
```

For mutations, surface `mutation.error` reactively via `<UAlert />` rather than wrapping `mutateAsync` in `try/catch`:

```vue
<script setup lang="ts">
const { mutate, error, isPending } = useSubmitFormMutation()
</script>

<template>
  <UAlert v-if="error" color="error" :description="error.message" />
  <UButton :loading="isPending" @click="mutate(payload)">Submit</UButton>
</template>
```

## Accessibility Standards

### ARIA Attributes

```html
<template>
  <button
    data-test="dropdown-trigger"
    :aria-expanded="isOpen"
    :aria-describedby="errorId"
    aria-haspopup="true"
    :aria-label="ariaLabel"
    role="button"
    tabindex="0"
    @click="toggleDropdown"
    @keydown.enter="toggleDropdown"
    @keydown.space.prevent="toggleDropdown"
    @keydown.escape="closeDropdown"
  >
    {{ displayValue }}
  </button>
  
  <ul
    v-if="isOpen"
    data-test="dropdown-options"
    role="listbox"
    :aria-activedescendant="focusedOptionId"
  >
    <li
      v-for="(option, index) in options"
      :key="option.value"
      :id="`option-${index}`"
      role="option"
      :aria-selected="option.value === modelValue"
      @click="selectOption(option.value)"
    >
      {{ option.label }}
    </li>
  </ul>
</template>
```

## Performance Optimization

### Lazy Loading Components

```typescript
// Use defineAsyncComponent for heavy components
import { defineAsyncComponent } from 'vue'

const HeavyComponent = defineAsyncComponent(
  () => import('./HeavyComponent.vue')
)
```

## Component Testing Helpers

### Component Props Interface for Testing

```typescript
// Export interfaces for testing
export interface ComponentProps {
  modelValue?: string
  options: Array<{ value: string; label: string }>
  disabled?: boolean
}

export interface ComponentData {
  isOpen: boolean
  focusedIndex: number
  loading: boolean
}

export interface ComponentMethods {
  toggleDropdown: () => void
  selectOption: (value: string) => void
  validateInput: () => boolean
}
```

## Common Anti-Patterns to Avoid

### Avoid Memory Leaks

```typescript
// ❌ Bad: Not cleaning up event listeners
onMounted(() => {
  window.addEventListener('scroll', handleScroll)
})

// ✅ Good: Clean up in onUnmounted
onMounted(() => {
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
```

### Don't Use v-if and v-for Together

```html
<!-- ❌ Bad: v-if and v-for on same element -->
<li v-for="user in users" v-if="user.isActive" :key="user.id">
  {{ user.name }}
</li>

<!-- ✅ Good: Use computed property or template wrapper -->
<li v-for="user in activeUsers" :key="user.id">
  {{ user.name }}
</li>

<!-- Or use template wrapper -->
<template v-for="user in users" :key="user.id">
  <li v-if="user.isActive">
    {{ user.name }}
  </li>
</template>
```
