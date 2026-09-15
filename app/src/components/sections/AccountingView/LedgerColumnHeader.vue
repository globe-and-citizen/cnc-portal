<template>
  <div class="relative flex items-center pr-2" :class="alignEnd ? 'justify-end text-right' : ''">
    <span>{{ label }}</span>
    <span
      v-if="column.getCanResize()"
      role="separator"
      :aria-label="`Resize ${label} column`"
      aria-orientation="vertical"
      :aria-valuenow="column.getSize()"
      :aria-valuemin="column.columnDef.minSize"
      :aria-valuemax="column.columnDef.maxSize"
      tabindex="0"
      class="group focus-visible:ring-primary absolute inset-y-0 right-0 w-2 translate-x-1/2 cursor-col-resize touch-none outline-none focus-visible:ring-2"
      :data-test="`ledger-${columnKey.replace(/([A-Z])/g, '-$1').toLowerCase()}-resizer`"
      @dblclick="column.resetSize()"
      @keydown.left.prevent="resize(-COLUMN_KEYBOARD_STEP)"
      @keydown.right.prevent="resize(COLUMN_KEYBOARD_STEP)"
      @mousedown.stop.prevent="startPointerResize($event)"
      @touchstart.stop.prevent="startPointerResize($event)"
    >
      <span
        class="bg-default/50 group-hover:bg-primary group-focus-visible:bg-primary absolute inset-y-1 left-1/2 w-px -translate-x-1/2"
      />
    </span>
  </div>
</template>

<script setup lang="ts">
import type { Column, Table } from '@tanstack/vue-table'
import type { LedgerRow } from '@/utils/accounting/journalLedgerPresenter'

type LedgerTableRow = LedgerRow & { isTotal: boolean }

interface Props {
  /** Column identity used by tests and the table-sizing state. */
  columnKey: string
  /** Human-readable header label and resize-control name. */
  label: string
  /** TanStack column supplied by the owning table slot. */
  column: Column<LedgerTableRow, unknown>
  /** TanStack table instance that owns the column-sizing state. */
  table: Table<LedgerTableRow>
  /** Right-align headings for numeric reporting columns. */
  alignEnd?: boolean
}

const props = withDefaults(defineProps<Props>(), { alignEnd: false })

const COLUMN_KEYBOARD_STEP = 24

function resize(delta: number): void {
  setSize(props.column.getSize() + delta)
}

function setSize(value: number): void {
  const minimum = props.column.columnDef.minSize ?? 80
  const maximum = props.column.columnDef.maxSize ?? 640
  const nextSize = Math.min(maximum, Math.max(minimum, value))

  props.table.setColumnSizing((sizes) => ({
    ...sizes,
    [props.column.id]: nextSize
  }))
}

function isTouchEvent(event: Event): event is TouchEvent {
  return 'touches' in event
}

function pointerX(event: Event): number {
  if (isTouchEvent(event) && event.touches.length) return event.touches[0]!.clientX
  return event instanceof MouseEvent ? event.clientX : 0
}

/** Resize through pointer or touch movement while keeping the keyboard path separate and accessible. */
function startPointerResize(event: MouseEvent | TouchEvent): void {
  const startX = pointerX(event)
  const startSize = props.column.getSize()
  const movingTouch = event.type === 'touchstart'
  const moveEvent = movingTouch ? 'touchmove' : 'mousemove'
  const endEvent = movingTouch ? 'touchend' : 'mouseup'

  const onMove = (nextEvent: Event) => {
    setSize(startSize + pointerX(nextEvent) - startX)
  }
  const onEnd = () => {
    document.removeEventListener(moveEvent, onMove)
    document.removeEventListener(endEvent, onEnd)
  }

  document.addEventListener(moveEvent, onMove)
  document.addEventListener(endEvent, onEnd)
}
</script>
