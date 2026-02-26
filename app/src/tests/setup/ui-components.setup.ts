import { vi } from 'vitest'
import { defineComponent, h } from 'vue'

/**
 * Mock Nuxt UI components used in SidebarLayout and other UI components
 */

// Mock UDashboardSidebar
vi.mock('@nuxt/ui', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    UDashboardSidebar: defineComponent({
      name: 'UDashboardSidebar',
      props: {
        collapsible: Boolean,
        resizable: Boolean,
        class: String,
        ui: Object
      },
      emits: {
        collapsed: (value: boolean) => typeof value === 'boolean'
      },
      setup(props, { slots }) {
        return () =>
          h('div', { class: ['u-dashboard-sidebar', props.class ?? ''] }, [
            slots.header?.({ collapsed: false }),
            h('div', { class: 'u-sidebar-content' }, slots.default?.({ collapsed: false })),
            slots.footer?.({ collapsed: false })
          ])
      }
    }),
    UNavigationMenu: defineComponent({
      name: 'UNavigationMenu',
      props: {
        items: Array,
        collapsed: Boolean,
        orientation: String,
        ui: Object
      },
      setup(props, { slots }) {
        return () =>
          h('nav', { class: 'u-navigation-menu' }, [
            h(
              'ul',
              { class: 'u-navigation-list' },
              props.items?.map((item: NavigationItem) =>
                h('li', { key: item.label, class: 'u-navigation-item' }, [
                  h('a', { href: '#', class: 'u-navigation-link' }, item.label),
                  item.children
                    ? h(
                        'ul',
                        { class: 'u-navigation-sub-list' },
                        item.children.map((child: NavigationItem) =>
                          h('li', { key: child.label, class: 'u-navigation-item' }, [
                            h('a', { href: '#', class: 'u-navigation-link' }, child.label)
                          ])
                        )
                      )
                    : null
                ])
              )
            ),
            slots.default?.()
          ])
      }
    }),
    UButton: defineComponent({
      name: 'UButton',
      props: {
        label: String,
        icon: String,
        color: String,
        variant: String,
        size: String,
        block: Boolean,
        square: Boolean
      },
      setup(props, { slots }) {
        return () =>
          h('button', { class: `u-button u-button-${props.variant}` }, [
            slots.default?.() || props.label
          ])
      }
    }),
    UModal: defineComponent({
      name: 'UModal',
      props: {
        open: Boolean,
        title: String
      },
      emits: ['update:open'],
      setup(props, { slots, emit }) {
        return () =>
          props.open
            ? h('div', { class: 'u-modal', 'data-test': 'modal' }, [
                h('div', { class: 'u-modal-header' }, props.title),
                h('div', { class: 'u-modal-body' }, slots.body?.()),
                h(
                  'button',
                  {
                    class: 'u-modal-close',
                    onClick: () => emit('update:open', false),
                    'data-test': 'modal-close'
                  },
                  'Close'
                )
              ])
            : null
      }
    }),
    UKbd: defineComponent({
      name: 'UKbd',
      props: {
        value: String,
        variant: String
      },
      setup(props) {
        return () => h('kbd', { class: 'u-kbd' }, props.value)
      }
    })
  }
})

/**
 * Mock @iconify/vue Icon component
 */
vi.mock('@iconify/vue', () => ({
  Icon: defineComponent({
    name: 'IconifyIcon',
    props: {
      icon: String
    },
    setup(props, { attrs }) {
      return () =>
        h(
          'svg',
          {
            class: `icon ${props.icon ?? ''} ${String((attrs && (attrs as Record<string, unknown>).class) ?? '')}`,
            viewBox: '0 0 24 24',
            xmlns: 'http://www.w3.org/2000/svg'
          },
          [h('g')]
        )
    }
  })
}))
