# Accessibility Guidelines

## Overview

The CNC Portal must be accessible to all users, including those with disabilities. Following WCAG 2.1 Level AA standards ensures our application can be used by everyone.

## Core Principles

### Semantic HTML

Always use semantic HTML elements that convey meaning:

```html
<!-- ✅ Good: Semantic elements -->
<header>
  <nav>
    <ul>
      <li><a href="/">Home</a></li>
    </ul>
  </nav>
</header>

<main>
  <article>
    <h1>Page Title</h1>
    <section>
      <h2>Section Title</h2>
      <p>Content here</p>
    </section>
  </article>
</main>

<footer>
  <p>&copy; 2024 CNC Portal</p>
</footer>

<!-- ❌ Bad: Non-semantic divs -->
<div class="header">
  <div class="nav">
    <div class="link">Home</div>
  </div>
</div>
```

### Heading Hierarchy

Maintain proper heading structure:

```html
<!-- ✅ Good: Logical heading hierarchy -->
<h1>Main Page Title</h1>
  <h2>Section 1</h2>
    <h3>Subsection 1.1</h3>
    <h3>Subsection 1.2</h3>
  <h2>Section 2</h2>
    <h3>Subsection 2.1</h3>

<!-- ❌ Bad: Skipping heading levels -->
<h1>Main Title</h1>
  <h4>This skips h2 and h3</h4>
```

## ARIA Attributes

### ARIA Labels

Provide descriptive labels for interactive elements:

```html
<!-- ✅ Good: Descriptive ARIA labels -->
<button
  aria-label="Close dialog"
  @click="closeDialog"
>
  <IconClose />
</button>

<input
  type="search"
  aria-label="Search projects"
  placeholder="Search..."
/>

<!-- ✅ Good: aria-labelledby for complex labels -->
<div id="dialog-title">Confirm Action</div>
<div
  role="dialog"
  aria-labelledby="dialog-title"
  aria-describedby="dialog-description"
>
  <p id="dialog-description">
    Are you sure you want to proceed?
  </p>
</div>
```

### ARIA States

Communicate component states:

```html
<!-- ✅ Good: ARIA states for interactive components -->
<button
  :aria-expanded="isOpen"
  :aria-pressed="isActive"
  :aria-disabled="isDisabled"
  @click="toggle"
>
  Toggle Menu
</button>

<!-- ✅ Good: ARIA for loading states -->
<div
  v-if="isLoading"
  aria-live="polite"
  aria-busy="true"
>
  Loading...
</div>

<!-- ✅ Good: ARIA for error messages -->
<input
  type="email"
  aria-invalid="true"
  aria-describedby="email-error"
/>
<div
  id="email-error"
  role="alert"
>
  Please enter a valid email address
</div>
```

### ARIA Roles

Use appropriate ARIA roles when semantic HTML isn't sufficient:

```html
<!-- ✅ Good: Dialog role -->
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="dialog-title"
>
  <h2 id="dialog-title">Dialog Title</h2>
  <div role="document">
    Dialog content
  </div>
</div>

<!-- ✅ Good: Navigation role -->
<nav role="navigation" aria-label="Main navigation">
  <ul>
    <li><a href="/">Home</a></li>
    <li><a href="/about">About</a></li>
  </ul>
</nav>

<!-- ✅ Good: Alert role -->
<div role="alert" aria-live="assertive">
  Error: Transaction failed
</div>
```

## Keyboard Navigation

### Focusable Elements

Ensure all interactive elements are keyboard accessible:

```html
<!-- ✅ Good: Keyboard accessible custom button -->
<div
  role="button"
  tabindex="0"
  @click="handleClick"
  @keydown.enter="handleClick"
  @keydown.space.prevent="handleClick"
>
  Custom Button
</div>

<!-- ✅ Good: Skip to main content -->
<a
  href="#main-content"
  class="skip-link"
>
  Skip to main content
</a>

<main id="main-content" tabindex="-1">
  <!-- Content -->
</main>
```

### Focus Management

```typescript
// ✅ Good: Manage focus in modals
import { ref, watch, nextTick } from 'vue'

const isModalOpen = ref(false)
const modalRef = ref<HTMLElement>()
const previousFocus = ref<HTMLElement>()

const openModal = async () => {
  previousFocus.value = document.activeElement as HTMLElement
  isModalOpen.value = true
  
  await nextTick()
  modalRef.value?.focus()
}

const closeModal = () => {
  isModalOpen.value = false
  previousFocus.value?.focus()
}

// ✅ Good: Trap focus in modal
const trapFocus = (event: KeyboardEvent) => {
  if (!modalRef.value) return
  
  const focusableElements = modalRef.value.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )
  
  const firstElement = focusableElements[0] as HTMLElement
  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement
  
  if (event.key === 'Tab') {
    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault()
      lastElement.focus()
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault()
      firstElement.focus()
    }
  }
}
```

### Keyboard Shortcuts

```typescript
// ✅ Good: Implement keyboard shortcuts
const handleKeyboard = (event: KeyboardEvent) => {
  // Ctrl/Cmd + K for search
  if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
    event.preventDefault()
    openSearch()
  }
  
  // Escape to close modals
  if (event.key === 'Escape') {
    closeModal()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyboard)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyboard)
})
```

## Form Accessibility

### Form Labels

Always associate labels with inputs:

```html
<!-- ✅ Good: Explicit label association -->
<label for="email">Email Address</label>
<input
  id="email"
  type="email"
  name="email"
  required
  aria-required="true"
/>

<!-- ✅ Good: Implicit label -->
<label>
  Password
  <input
    type="password"
    name="password"
    required
  />
</label>

<!-- ✅ Good: Form group with fieldset -->
<fieldset>
  <legend>Preferred Contact Method</legend>
  <label>
    <input type="radio" name="contact" value="email" />
    Email
  </label>
  <label>
    <input type="radio" name="contact" value="phone" />
    Phone
  </label>
</fieldset>
```

### Error Messages

Make errors accessible:

```html
<!-- ✅ Good: Accessible error messages -->
<div>
  <label for="username">Username</label>
  <input
    id="username"
    :aria-invalid="hasError"
    aria-describedby="username-error username-hint"
  />
  <div id="username-hint">
    Username must be 3-20 characters
  </div>
  <div
    v-if="hasError"
    id="username-error"
    role="alert"
    aria-live="polite"
  >
    Username is already taken
  </div>
</div>
```

### Form Validation

```typescript
// ✅ Good: Announce validation errors
const validateForm = () => {
  const errors: string[] = []
  
  if (!email.value) {
    errors.push('Email is required')
  }
  
  if (!password.value) {
    errors.push('Password is required')
  }
  
  if (errors.length > 0) {
    // Announce errors to screen readers
    const errorMessage = `Form has ${errors.length} error${errors.length > 1 ? 's' : ''}: ${errors.join(', ')}`
    announceToScreenReader(errorMessage)
  }
  
  return errors.length === 0
}

const announceToScreenReader = (message: string) => {
  const announcement = document.createElement('div')
  announcement.setAttribute('role', 'alert')
  announcement.setAttribute('aria-live', 'assertive')
  announcement.textContent = message
  announcement.className = 'sr-only'
  
  document.body.appendChild(announcement)
  
  setTimeout(() => {
    document.body.removeChild(announcement)
  }, 1000)
}
```

## Color and Contrast

### Sufficient Contrast Ratios

Ensure text has sufficient contrast:

```css
/* ✅ Good: High contrast text */
.text-primary {
  color: #1a1a1a; /* Dark text on light background */
  background: #ffffff;
  /* Contrast ratio: 16.07:1 (AAA) */
}

.text-secondary {
  color: #4a4a4a; /* Medium text on light background */
  background: #ffffff;
  /* Contrast ratio: 9.73:1 (AAA) */
}

/* ❌ Bad: Insufficient contrast */
.text-low-contrast {
  color: #cccccc;
  background: #ffffff;
  /* Contrast ratio: 1.61:1 (Fails WCAG) */
}
```

### Don't Rely on Color Alone

```html
<!-- ❌ Bad: Color as only indicator -->
<span class="text-red-500">Error</span>
<span class="text-green-500">Success</span>

<!-- ✅ Good: Color + icon + text -->
<span class="error">
  <IconError aria-hidden="true" />
  Error: Transaction failed
</span>
<span class="success">
  <IconCheck aria-hidden="true" />
  Success: Transaction complete
</span>
```

## Images and Media

### Alternative Text

Provide meaningful alt text:

```html
<!-- ✅ Good: Descriptive alt text -->
<img
  src="/logo.png"
  alt="CNC Portal logo"
/>

<img
  src="/chart.png"
  alt="Bar chart showing token distribution: 40% ETH, 30% USDC, 30% DAI"
/>

<!-- ✅ Good: Decorative images -->
<img
  src="/decorative.png"
  alt=""
  role="presentation"
/>

<!-- ✅ Good: Icon with accessible label -->
<button aria-label="Delete item">
  <img src="/delete-icon.png" alt="" role="presentation" />
</button>
```

### Video and Audio

```html
<!-- ✅ Good: Video with captions -->
<video controls>
  <source src="video.mp4" type="video/mp4" />
  <track
    kind="captions"
    src="captions.vtt"
    srclang="en"
    label="English"
    default
  />
</video>
```

## Dynamic Content

### Live Regions

Announce dynamic content changes:

```html
<!-- ✅ Good: Polite announcements -->
<div aria-live="polite" aria-atomic="true">
  {{ statusMessage }}
</div>

<!-- ✅ Good: Assertive announcements for critical updates -->
<div aria-live="assertive" role="alert">
  {{ errorMessage }}
</div>

<!-- ✅ Good: Loading state -->
<div
  v-if="isLoading"
  role="status"
  aria-live="polite"
>
  <span class="sr-only">Loading...</span>
  <LoadingSpinner aria-hidden="true" />
</div>
```

### Screen Reader Only Content

```css
/* ✅ Good: Screen reader only class */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

```html
<!-- ✅ Good: Additional context for screen readers -->
<button>
  <IconTrash aria-hidden="true" />
  <span class="sr-only">Delete item</span>
</button>

<a href="/profile">
  Profile
  <span class="sr-only">(opens in new window)</span>
</a>
```

## Tables

### Accessible Data Tables

```html
<!-- ✅ Good: Table with proper headers -->
<table>
  <caption>Transaction History</caption>
  <thead>
    <tr>
      <th scope="col">Date</th>
      <th scope="col">Type</th>
      <th scope="col">Amount</th>
      <th scope="col">Status</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>2024-01-15</td>
      <td>Transfer</td>
      <td>100 USDC</td>
      <td>Complete</td>
    </tr>
  </tbody>
</table>

<!-- ✅ Good: Complex table with row and column headers -->
<table>
  <thead>
    <tr>
      <th scope="col">Token</th>
      <th scope="col">Price</th>
      <th scope="col">Change 24h</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">ETH</th>
      <td>$2,500</td>
      <td>+5.2%</td>
    </tr>
  </tbody>
</table>
```

## Modal Dialogs

### Accessible Modals

```vue
<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="modal-overlay"
      @click.self="close"
    >
      <div
        ref="modalRef"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        :aria-describedby="descriptionId"
        tabindex="-1"
        @keydown="handleKeydown"
      >
        <h2 :id="titleId">{{ title }}</h2>
        <p :id="descriptionId">{{ description }}</p>
        
        <slot />
        
        <div class="modal-actions">
          <button @click="confirm">Confirm</button>
          <button @click="close">Cancel</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onUnmounted } from 'vue'

const props = defineProps<{
  isOpen: boolean
  title: string
  description: string
}>()

const emit = defineEmits<{
  close: []
  confirm: []
}>()

const modalRef = ref<HTMLElement>()
const titleId = `modal-title-${Math.random()}`
const descriptionId = `modal-desc-${Math.random()}`
const previousFocus = ref<HTMLElement>()

watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    previousFocus.value = document.activeElement as HTMLElement
    await nextTick()
    modalRef.value?.focus()
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
    previousFocus.value?.focus()
  }
})

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    close()
  }
}

const close = () => {
  emit('close')
}

const confirm = () => {
  emit('confirm')
}

onUnmounted(() => {
  document.body.style.overflow = ''
})
</script>
```

## Testing Accessibility

### Automated Testing

```typescript
// ✅ Good: Test for accessibility violations
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { axe } from 'vitest-axe'
import MyComponent from './MyComponent.vue'

describe('MyComponent Accessibility', () => {
  it('should not have accessibility violations', async () => {
    const wrapper = mount(MyComponent)
    const results = await axe(wrapper.element)
    expect(results).toHaveNoViolations()
  })
})
```

### Manual Testing Checklist

- [ ] All interactive elements are keyboard accessible
- [ ] Focus indicators are visible
- [ ] Color contrast meets WCAG AA standards
- [ ] Alt text provided for images
- [ ] Form inputs have associated labels
- [ ] ARIA attributes used correctly
- [ ] Heading hierarchy is logical
- [ ] Dynamic content changes are announced
- [ ] Modals trap focus and can be closed with Escape
- [ ] Skip links provided for navigation
- [ ] Tables have proper headers
- [ ] Error messages are associated with form fields

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [axe DevTools](https://www.deque.com/axe/devtools/)
