# Vue.js Component Standards

## Composition API Standards

Always use Composition API with `<script setup lang="ts">` syntax for all new components.

### Component Structure

```vue
<template>
  <!-- Template content -->
</template>

<script setup lang="ts">
// 1. Imports (external libraries first, then internal modules, then relative imports)
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { isAddress } from 'viem'
import { useToastStore } from '@/stores'
import type { ComponentProps } from './types'

// 2. Props and emits definitions
interface Props {
  modelValue?: string
  options: Array<{ value: string; label: string }>
  disabled?: boolean
  ariaLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  disabled: false,
  ariaLabel: 'Select option'
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  submit: [data: FormData]
}>()

// 3. Reactive state
const isOpen = ref(false)
const selectedValue = ref(props.modelValue)
const loading = ref(false)

// 4. Computed properties
const displayValue = computed(() => {
  const option = props.options.find(opt => opt.value === selectedValue.value)
  return option?.label || selectedValue.value
})

const isValid = computed(() => {
  return selectedValue.value.length > 0 && !props.disabled
})

// 5. Watchers
watch(() => props.modelValue, (newValue) => {
  selectedValue.value = newValue
})

// 6. Functions/methods
const toggleDropdown = () => {
  if (!props.disabled) {
    isOpen.value = !isOpen.value
  }
}

const selectOption = (value: string) => {
  selectedValue.value = value
  emit('update:modelValue', value)
  isOpen.value = false
}

// 7. Lifecycle hooks
onMounted(() => {
  // Component initialization
})

onUnmounted(() => {
  // Cleanup
})
</script>

<style scoped>
/* Component styles */
</style>
```

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

```vue
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

### Toast Notifications

```typescript
import { useToastStore } from '@/stores'

const { addSuccessToast, addErrorToast } = useToastStore()

const handleSubmit = async () => {
  try {
    loading.value = true
    await submitForm()
    addSuccessToast('Form submitted successfully')
  } catch (error) {
    console.error('Form submission failed:', error)
    addErrorToast('Failed to submit form. Please try again.')
  } finally {
    loading.value = false
  }
}
```

### Form Validation

```typescript
const email = ref('')
const emailError = ref('')

const validateEmail = () => {
  if (!email.value) {
    emailError.value = 'Email is required'
    return false
  }
  
  if (!email.value.includes('@')) {
    emailError.value = 'Invalid email format'
    return false
  }
  
  emailError.value = ''
  return true
}

// Real-time validation
watch(email, () => {
  if (emailError.value) {
    validateEmail()
  }
})
```

## Accessibility Standards

### ARIA Attributes

```vue
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

### Keyboard Navigation

```typescript
const focusedIndex = ref(0)

const handleKeydown = (event: KeyboardEvent) => {
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      focusedIndex.value = Math.min(focusedIndex.value + 1, options.length - 1)
      break
      
    case 'ArrowUp':
      event.preventDefault()
      focusedIndex.value = Math.max(focusedIndex.value - 1, 0)
      break
      
    case 'Enter':
    case ' ':
      event.preventDefault()
      selectOption(options[focusedIndex.value].value)
      break
      
    case 'Escape':
      closeDropdown()
      break
  }
}
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

### Conditional Rendering Optimization

```vue
<template>
  <!-- Use v-show for frequently toggled elements -->
  <div v-show="isVisible" class="frequently-toggled">
    Content that toggles often
  </div>
  
  <!-- Use v-if for conditionally rendered elements -->
  <div v-if="shouldRender" class="conditionally-rendered">
    Content that rarely changes
  </div>
  
  <!-- Use v-memo for expensive lists -->
  <div
    v-for="item in expensiveList"
    :key="item.id"
    v-memo="[item.id, item.updatedAt]"
  >
    {{ expensiveComputation(item) }}
  </div>
</template>
```

## Component Communication

### Parent-Child Communication

```typescript
// Child component
interface Props {
  data: UserData
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:data': [data: UserData]
  'data-changed': [changes: Partial<UserData>]
}>()

// Parent component
<template>
  <ChildComponent
    :data="userData"
    @update:data="userData = $event"
    @data-changed="handleDataChange"
  />
</template>
```

### Provide/Inject Pattern

```typescript
// Parent component
import { provide } from 'vue'

const userSettings = reactive({
  theme: 'dark',
  language: 'en'
})

provide('userSettings', userSettings)

// Child component
import { inject } from 'vue'

const userSettings = inject<UserSettings>('userSettings')
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

### Test-Friendly Component Structure

```typescript
// Expose methods and state for testing when needed
defineExpose({
  // Only expose what's necessary for testing
  validateInput,
  resetForm,
  focusInput
})
```

## Common Anti-Patterns to Avoid

### Don't Mutate Props

```typescript
// ❌ Bad: Direct prop mutation
const props = defineProps<{ value: string }>()
props.value = 'new value' // This will cause an error

// ✅ Good: Emit events for changes
const emit = defineEmits<{ 'update:value': [value: string] }>()
emit('update:value', 'new value')
```

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

```vue
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
