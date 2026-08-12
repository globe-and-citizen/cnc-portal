# Vue Component Standards

> **Canonical reference**: `app/src/components/__tests__/SelectComponent.spec.ts` shows the props/emits/data-test contract from the test side.
>
> See [the frontend-change skill](../../.agents/skills/cnc-frontend-change/SKILL.md) for the workflow that routes frontend changes to these standards.

## Composition API only

`<script setup lang="ts">` for every new component. No Options API, no JS-only files.

## Scope and maintainability

Keep the requested change scoped. A component should describe what it renders:

- Put pure data shaping in an existing or new utility under `app/src/utils/`.
- Put reactive or stateful behaviour in a focused `useXxx` composable.
- Search `utils/` and `composables/` before adding a near-duplicate helper.
- Keep server data in its query cache instead of mirroring it into Pinia.

If adjacent code materially risks correctness, security, or the behaviour being
edited, report it and create or use a follow-up issue. Do not expand a focused
change into opportunistic component refactoring.

## Props

Define with TypeScript interface; use `withDefaults` for optionals:

```ts
interface Props {
  options: Array<{ value: string; label: string }>;
  modelValue?: string;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: "",
  disabled: false,
});
```

Avoid `Object as PropType<…>` runtime declarations — strict TS interfaces are clearer and catch more.

## Emits

Type emits, don't rely on string-only signatures:

```ts
const emit = defineEmits<{
  "update:modelValue": [value: string];
  submit: [data: FormData];
  close: [];
}>();
```

## `data-test` is mandatory on interactive elements

Buttons, inputs, error messages, dropdowns — anything a test needs to find. CSS classes change; `data-test` is a contract.

```vue
<button data-test="submit-button" :disabled="!isValid" @click="handleSubmit">
  Submit
</button>
<UAlert
  v-if="errorMessage"
  data-test="error-message"
  color="error"
  :description="errorMessage"
/>
```

## Reactivity

- `ref()` for primitives.
- `reactive()` only when you genuinely need a deeply-reactive object (rare — most cases are better as multiple `ref`s or `computed`).
- `computed()` for derived values. **Never** mirror with a `watch` what `computed` can do.
- `shallowRef()` for large frozen datasets you'll replace wholesale.

## Notifications & errors

Two surfaces, pick the right one:

- **`useToast()`** (Nuxt UI, auto-imported) for transient global notifications. Reference: `app/src/composables/useSiwe.ts`, `app/src/App.vue`.
- **`<UAlert />`** for inline reactive errors scoped to a form / section. Reference: `app/src/components/sections/ContractManagementView/forms/TransferOwnershipForm.vue`.

```ts
const toast = useToast();
toast.add({ title: "Saved", color: "success" });
```

```vue
<UAlert v-if="errorMessage" color="error" :description="errorMessage" />
```

For mutations, surface `mutation.error` reactively via `<UAlert />` rather than wrapping `mutateAsync` in `try/catch`; see the [query guide](../../app/src/queries/README.md) for the mutation architecture:

```vue
<script setup lang="ts">
const { mutate, error, isPending } = useSubmitFormMutation();
</script>

<template>
  <UAlert v-if="error" color="error" :description="error.message" />
  <UButton :loading="isPending" @click="mutate(payload)">Submit</UButton>
</template>
```

## Accessibility

ARIA + semantic HTML + keyboard support. The tests must reach every interactive element via keyboard, and screen-readers must announce state changes.

Minimum for a custom dropdown / disclosure:

- `aria-expanded` reflects open state
- `aria-haspopup` set
- `Enter`, `Space`, and `Escape` handled
- `role="listbox"` / `role="option"` + `aria-selected` for option lists
- `aria-describedby` for error messages

## Performance

- `defineAsyncComponent(() => import('./Heavy.vue'))` for heavy / rarely-used components.
- Don't memoize prematurely. `computed` is already memoized; don't wrap it in `useMemo`-like helpers.
- Clean up listeners and intervals in `onUnmounted` — every `addEventListener` needs a partner `removeEventListener`.

## Anti-patterns

- **`v-if` + `v-for` on the same element.** Use a `computed` filtered list, or `<template v-for>` wrapping a `<li v-if>`.
- **Watchers as substitutes for `computed`.** If a watcher only sets one value from another, it's a `computed`.
- **Inline business logic.** If the script block grows past ~50 lines or you have multiple unrelated `try/catch`, extract a composable.
- **`wrapper.vm.foo` in tests.** Test the rendered DOM, not internals.
