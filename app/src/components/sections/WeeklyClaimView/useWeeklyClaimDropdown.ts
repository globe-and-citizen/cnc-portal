import { ref, computed, watch, nextTick, onMounted, onUnmounted, type Ref } from 'vue'

/**
 * Module-level (singleton) open-state shared by every WeeklyClaimActionDropdown
 * instance. Each kebab menu owns a unique symbol and is considered open only
 * while it matches this ref, so opening one menu closes any other that was open.
 */
export const openDropdownId = ref<symbol | null>(null)

/**
 * Encapsulates a WeeklyClaimActionDropdown kebab menu: the shared "only one
 * open at a time" logic plus the teleported, fixed-positioned menu that is
 * never clipped by the surrounding table/card overflow.
 *
 * @param anchorRef element the menu is positioned against (the trigger wrapper)
 */
export function useWeeklyClaimDropdownMenu(anchorRef: Ref<HTMLElement | null>) {
  const instanceId = Symbol('weekly-claim-dropdown')
  const menuRef = ref<HTMLElement | null>(null)
  // Kept hidden until the first measure so the menu never flashes at (0,0).
  const menuStyle = ref<Record<string, string>>({ position: 'fixed', visibility: 'hidden' })

  const isOpen = computed<boolean>(() => openDropdownId.value === instanceId)

  const toggleDropdown = (): void => {
    // Opening this one implicitly closes whichever other instance was open,
    // since they all share `openDropdownId`.
    openDropdownId.value = isOpen.value ? null : instanceId
  }

  const closeDropdown = (): void => {
    if (isOpen.value) openDropdownId.value = null
  }

  // Place the menu to the left of the trigger (flipping right if there isn't
  // room), vertically centered and clamped inside the viewport so tall menus on
  // bottom rows are never cut off.
  const updateMenuPosition = (): void => {
    const anchor = anchorRef.value
    const menu = menuRef.value
    if (!anchor) return

    const rect = anchor.getBoundingClientRect()
    const menuWidth = menu?.offsetWidth || 208
    const menuHeight = menu?.offsetHeight || 0
    const gap = 8
    const margin = 8

    let left = rect.left - menuWidth - gap
    if (left < margin) {
      left = Math.min(rect.right + gap, window.innerWidth - menuWidth - margin)
    }

    let top = rect.top + rect.height / 2 - menuHeight / 2
    const maxTop = window.innerHeight - menuHeight - margin
    if (top > maxTop) top = maxTop
    if (top < margin) top = margin

    menuStyle.value = {
      position: 'fixed',
      left: `${Math.round(left)}px`,
      top: `${Math.round(top)}px`,
      visibility: 'visible'
    }
  }

  const repositionMenu = (): void => {
    if (isOpen.value) updateMenuPosition()
  }

  const handleClickOutside = (event: MouseEvent): void => {
    const target = event.target as Node
    // The menu is teleported out of the trigger, so a click inside it must be
    // treated as "inside" too — otherwise it closes before the item's own
    // handler runs.
    const insideTrigger = anchorRef.value?.contains(target)
    const insideMenu = menuRef.value?.contains(target)
    if (!insideTrigger && !insideMenu) closeDropdown()
  }

  // Re-measure once the menu is in the DOM (v-if just rendered it).
  watch(isOpen, async (open) => {
    if (!open) return
    menuStyle.value = { position: 'fixed', visibility: 'hidden' }
    await nextTick()
    updateMenuPosition()
  })

  onMounted(() => {
    // setTimeout so the listener is added after the current click event.
    setTimeout(() => document.addEventListener('click', handleClickOutside), 0)
    // Keep the fixed-positioned menu anchored to its trigger while open.
    window.addEventListener('scroll', repositionMenu, true)
    window.addEventListener('resize', repositionMenu)
  })

  onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
    window.removeEventListener('scroll', repositionMenu, true)
    window.removeEventListener('resize', repositionMenu)
  })

  return { isOpen, menuRef, menuStyle, toggleDropdown, closeDropdown }
}
