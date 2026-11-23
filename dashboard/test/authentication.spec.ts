import { computed, defineComponent, effectScope, h, nextTick, ref, toValue } from 'vue'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import LoginPage from '~/pages/login.vue'
import UserMenu from '~/components/UserMenu.vue'

const account = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
const token = 'dashboard-test-token'
const tokenKey = 'dashboard-auth-token'
const addressKey = 'dashboard-auth-address'
const walletAddress = ref<string>()
const connect = vi.fn()
const signMessage = vi.fn()
const disconnect = vi.fn()
const getNonce = vi.fn()
const exchangeSignature = vi.fn()

vi.mock('@wagmi/vue', () => ({
  useConnection: () => ({
    isConnected: computed(() => !!walletAddress.value),
    address: walletAddress
  }),
  useChainId: () => ref(137),
  useConnect: () => ({ connectAsync: connect }),
  useSignMessage: () => ({ signMessageAsync: signMessage }),
  useDisconnect: () => ({ disconnect }),
  useSwitchChain: () => ({ switchChainAsync: vi.fn() }),
  injected: vi.fn()
}))

vi.mock('~/api/user', () => ({ getUserNonce: (...args: unknown[]) => getNonce(...args) }))
vi.mock('~/api/auth', () => ({
  authenticateWithSiwe: (...args: unknown[]) => exchangeSignature(...args),
  validateToken: vi.fn()
}))

const push = vi.fn()
const fetchProfile = vi.fn()
let queryClient: QueryClient
const mounted: Array<{ unmount: () => void }> = []

function mountDashboard(component: Parameters<typeof mount>[0]) {
  const wrapper = mount(component, {
    global: {
      plugins: [[VueQueryPlugin, { queryClient }]],
      stubs: {
        UAlert: { template: '<div role="alert"><slot name="title" /></div>' },
        UButton: { template: '<button><slot /></button>' },
        UIcon: true,
        UDropdownMenu: {
          props: ['items'],
          template: '<button @click="items.flat().find(item => item.label === \'Log out\').onSelect()">Log out</button>'
        }
      }
    }
  })
  mounted.push(wrapper)
  return wrapper
}

async function checkRoute(path = '/') {
  const wrapper = mountDashboard(defineComponent({ render: () => h('div') }))
  const { default: guard } = await import('~/middleware/auth.global')
  const scope = effectScope()
  try {
    return await scope.run(() =>
      wrapper.vm.$.appContext.app.runWithContext(() => guard({ path } as never, {} as never))
    )
  } finally {
    await nextTick()
    scope.stop()
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
  walletAddress.value = undefined
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  vi.stubGlobal('computed', computed)
  vi.stubGlobal('toValue', toValue)
  vi.stubGlobal('definePageMeta', vi.fn())
  vi.stubGlobal('useHead', vi.fn())
  vi.stubGlobal('defineNuxtRouteMiddleware', (middleware: unknown) => middleware)
  vi.stubGlobal('useRuntimeConfig', () => ({ public: { chainId: '137', backendUrl: '' } }))
  vi.stubGlobal('useRouter', () => ({ push }))
  vi.stubGlobal('navigateTo', (path: string) => path)
  vi.stubGlobal('useColorMode', () => ({ value: 'light' }))
  vi.stubGlobal('useAppConfig', () => ({ ui: { colors: {} } }))
  vi.stubGlobal('$fetch', fetchProfile)
  connect.mockImplementation(async () => {
    walletAddress.value = account
  })
  signMessage.mockResolvedValue('signed-message')
  getNonce.mockResolvedValue({ nonce: '41vj7bz5Ow8oT5xaE' })
  exchangeSignature.mockResolvedValue({ accessToken: token })
})

afterEach(() => {
  mounted.splice(0).forEach(wrapper => wrapper.unmount())
  queryClient.clear()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('Backoffice authentication', () => {
  /**
   * Covers:
   * - [AC-US-AUTH-002-01]
   * - [AC-US-AUTH-002-02]
   * - [AC-US-AUTH-002-04]
   */
  it('connects the wallet before signing and restores the resulting admin session', async () => {
    const login = mountDashboard(LoginPage)
    await login.get('button').trigger('click')
    await flushPromises()
    expect(connect).toHaveBeenCalledOnce()
    expect(signMessage).not.toHaveBeenCalled()

    await login.get('button').trigger('click')
    await flushPromises()
    expect(signMessage).toHaveBeenCalledWith({
      message: expect.stringContaining(account)
    })
    expect(exchangeSignature).toHaveBeenCalledWith(expect.any(String), 'signed-message')
    expect(localStorage.getItem(tokenKey)).toContain(token)
    expect(localStorage.getItem(addressKey)).toContain(account)
    expect(push).toHaveBeenCalledWith('/')

    fetchProfile.mockResolvedValue({ roles: ['ROLE_ADMIN'] })
    await expect(checkRoute()).resolves.toBeUndefined()
  })

  it('[AC-US-AUTH-002-05] clears the saved session, disconnects and returns to sign-in', async () => {
    localStorage.setItem(tokenKey, token)
    localStorage.setItem(addressKey, account)
    const menu = mountDashboard(UserMenu)
    await menu.get('button').trigger('click')
    await nextTick()

    expect(disconnect).toHaveBeenCalledOnce()
    expect(push).toHaveBeenCalledWith('/login')
    expect(localStorage.getItem(tokenKey)).toBeNull()
    expect(localStorage.getItem(addressKey)).toBeNull()
  })

  it.each(['ROLE_ADMIN', 'ROLE_SUPER_ADMIN'])('[AC-US-AUTH-002-03] admits a verified %s session', async (role) => {
    localStorage.setItem(tokenKey, token)
    localStorage.setItem(addressKey, account)
    fetchProfile.mockResolvedValue({ roles: [role] })
    await expect(checkRoute()).resolves.toBeUndefined()
    expect(fetchProfile).toHaveBeenCalledWith(
      `user/${account}`,
      expect.objectContaining({ headers: { Authorization: `Bearer ${token}` } })
    )
  })

  it.each([tokenKey, addressKey])('[AC-US-AUTH-002-06] sends incomplete sessions to sign-in without a profile request (%s)', async (missing) => {
    if (missing === tokenKey) localStorage.setItem(addressKey, account)
    else localStorage.setItem(tokenKey, token)
    await expect(checkRoute()).resolves.toBe('/login')
    expect(fetchProfile).not.toHaveBeenCalled()
  })

  it('[AC-US-AUTH-002-07] sends an authenticated non-admin to access denied', async () => {
    localStorage.setItem(tokenKey, token)
    localStorage.setItem(addressKey, account)
    fetchProfile.mockResolvedValue({ roles: ['ROLE_USER'] })
    await expect(checkRoute()).resolves.toBe('/access-denied')
  })

  it.each([401, 404])('[AC-US-AUTH-002-08] discards a session when profile verification returns %s', async (statusCode) => {
    localStorage.setItem(tokenKey, token)
    localStorage.setItem(addressKey, account)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    fetchProfile.mockRejectedValue({ statusCode })
    await expect(checkRoute()).resolves.toBe('/login')
    await nextTick()
    expect(localStorage.getItem(tokenKey)).toBeNull()
    expect(localStorage.getItem(addressKey)).toBeNull()
  })

  it.each([
    [{ code: 4001 }, 'Request cancelled'],
    [{ name: 'SwitchChainError' }, 'Wrong network'],
    [{ name: 'FetchError', statusCode: 401 }, 'Authentication failed'],
    [{ name: 'FetchError' }, 'Network error']
  ])('[AC-US-AUTH-002-09] surfaces the corresponding sign-in error', async (failure, message) => {
    walletAddress.value = account
    signMessage.mockRejectedValue(failure)
    const login = mountDashboard(LoginPage)
    await login.get('button').trigger('click')
    await flushPromises()
    expect(login.get('[role="alert"]').text()).toContain(message)
    expect(push).not.toHaveBeenCalled()
    expect(localStorage.getItem(tokenKey)).toBeNull()
  })
})
