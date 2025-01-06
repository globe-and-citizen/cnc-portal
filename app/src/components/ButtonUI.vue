<template>
  <button class="btn" :class="computedClass">
    <span class="loading loading-spinner" v-if="loading"></span>
    <slot></slot>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export type ISize = 'xs' | 'sm' | 'md' | 'lg'

export type IStateColor = 'info' | 'success' | 'warning' | 'error'

export type IBrandColor = 'neutral' | 'primary' | 'secondary' | 'accent'

export type IColorType = IBrandColor | IStateColor

export type IButtonType = IColorType | 'ghost' | 'link' | 'glass'

export type IButtonShape = 'defalut' | 'circle' | 'square'

// Comment to make sure tailwind generate the css for the btn classes
/**
btn-xs btn-sm btn-md btn-lg
btn-default btn-circle btn-square
btn-primary btn-secondary btn-accent btn-neutral
btn-info btn-success btn-warning btn-error
btn-ghost btn-link btn-glass
 */

const computedClass = computed(() => {
  const classes = []

  if (variant) classes.push(`btn-${variant}`)
  if (shape) classes.push(`btn-${shape}`)
  if (size) classes.push(`btn-${size}`)
  if (block) classes.push('btn-block')
  if (wide) classes.push('btn-wide')
  if (disabled) classes.push('btn-disabled')
  if (outline) classes.push('btn-outline')
  if (active) classes.push('btn-active')
  if (noAnimation) classes.push('btn-no-animation')

  return classes.join(' ')
})

interface IButtonProps {
  block?: boolean
  wide?: boolean
  disabled?: boolean
  outline?: boolean
  active?: boolean
  loading?: boolean
  noAnimation?: boolean
  variant?: IButtonType
  shape?: IButtonShape
  size?: ISize
  tag?: 'button' | 'a' | 'input'

  // onClick?: (e: MouseEvent) => any
}
const {
  block = false,
  wide = false,
  disabled = false,
  outline = false,
  active = false,
  loading = false,
  noAnimation = false,
  variant,
  shape,
  size
  // tag
  // } = defineProps<IButtonProps>(buttonProps)
} = defineProps<IButtonProps>()
</script>
