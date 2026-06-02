import { mount, type ComponentMountingOptions, type VueWrapper } from '@vue/test-utils'
import { h, type Component, type ComponentPublicInstance } from 'vue'
import { TooltipProvider } from 'reka-ui'
import { vi } from 'vitest'
import { createTestingPinia, type TestingOptions, type TestingPinia } from '@pinia/testing'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { setMockRoute, type MockRoute } from '@/tests/mocks/router.mock'

type Plugins = NonNullable<NonNullable<ComponentMountingOptions<Component>['global']>['plugins']>

/**
 * Pinia behavior for {@link renderWithProviders}.
 * - default / `TestingOptions` → installs `createTestingPinia({ createSpy: vi.fn, ...options })`
 * - `TestingPinia` instance → installed as-is (lets a spec read `pinia.state`)
 * - `false` → installs no Pinia (rely solely on the global `vi.mock('@/stores/*')`)
 */
export type PiniaOption = TestingPinia | TestingOptions | false

export interface RenderOptions<C extends Component> extends ComponentMountingOptions<C> {
  /** See {@link PiniaOption}. Defaults to `createTestingPinia({ createSpy: vi.fn })`. */
  pinia?: PiniaOption
  /**
   * Overrides the globally-mocked route (default `{ params: { id: '1' } }`).
   * Reset before every test by the global `beforeEach`, so it never leaks.
   */
  route?: Partial<MockRoute>
  /**
   * Installs `VueQueryPlugin` with a real `QueryClient` (opt-in).
   * - `true` → fresh client with retries disabled
   * - a `QueryClient` instance → installed as-is
   *
   * NOTE: TanStack Query hooks are mocked globally, so this only changes behavior
   * in specs that `vi.unmock('@tanstack/vue-query')` to exercise the real client.
   */
  queryClient?: QueryClient | boolean
  /**
   * Wraps the component in reka-ui's `<TooltipProvider>` ancestor. Off by default
   * because `UTooltip` is stubbed globally; enable only when the component renders
   * reka-ui tooltip primitives directly. When enabled, the returned wrapper targets
   * the inner component (so `setProps` is unavailable — drive props via the DOM).
   */
  tooltipProvider?: boolean
}

const isTestingPinia = (value: TestingPinia | TestingOptions): value is TestingPinia =>
  'state' in value && 'install' in value

const resolvePinia = (option: PiniaOption | undefined): TestingPinia | null => {
  if (option === false) return null
  if (option && isTestingPinia(option)) return option
  return createTestingPinia({ createSpy: vi.fn, ...option })
}

const resolveQueryClient = (option: QueryClient | boolean | undefined): QueryClient | null => {
  if (!option) return null
  if (option instanceof QueryClient) return option
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

/**
 * The default mounting path for component specs. Installs the providers nearly every
 * spec needs — `createTestingPinia` and the route stub — and centralizes the
 * `global.plugins` boilerplate that ~115 specs duplicate today.
 *
 * It is a drop-in for `mount`: the returned wrapper targets the component itself, so
 * `props`, `emitted()`, `setProps`, `findComponent`, etc. all behave as usual.
 *
 * @example
 * const wrapper = renderWithProviders(BodApprovalModal, { props: { loading: false, row } })
 *
 * @example // opt out of Pinia, point the route at a different team
 * renderWithProviders(MyView, { pinia: false, route: { params: { id: '42' } } })
 */
export function renderWithProviders<C extends Component>(
  component: C,
  options: RenderOptions<C> = {}
): VueWrapper<ComponentPublicInstance> {
  const {
    pinia,
    route,
    queryClient,
    tooltipProvider,
    global: globalOptions = {},
    ...mountOptions
  } = options

  if (route) setMockRoute(route)

  const plugins: Plugins = [...(globalOptions.plugins ?? [])]
  const piniaInstance = resolvePinia(pinia)
  if (piniaInstance) plugins.push(piniaInstance)
  const client = resolveQueryClient(queryClient)
  if (client) plugins.push([VueQueryPlugin, { queryClient: client }])

  const mergedGlobal = { ...globalOptions, plugins }

  if (tooltipProvider) {
    const host = mount(TooltipProvider, {
      global: mergedGlobal,
      slots: { default: () => h(component, mountOptions.props ?? {}) }
    })
    return host.findComponent(
      component as Component
    ) as unknown as VueWrapper<ComponentPublicInstance>
  }

  return mount(component, {
    ...mountOptions,
    global: mergedGlobal
  }) as unknown as VueWrapper<ComponentPublicInstance>
}
