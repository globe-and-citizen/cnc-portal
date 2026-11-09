import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import apiClient from '@/lib/axios'
import { mockUserStore } from '@/tests/mocks'

vi.mock('@/views/LoginView.vue', () => ({
  default: { template: '<div>Login</div>' }
}))

vi.mock('@/views/team/[id]/ShowIndex.vue', () => ({
  default: { template: '<div>Team</div>' }
}))

describe('Restoring a saved session', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUserStore.isAuth = false
  })

  it('[AC-US-AUTH-001-08] waits for verification before entering a protected route', async () => {
    vi.resetModules()
    const { default: startupRouter } = await import('@/router/index')
    const verification = Promise.withResolvers<{ data: object }>()
    vi.mocked(apiClient.get).mockReturnValueOnce(verification.promise)
    mockUserStore.token = 'saved-token'
    mockUserStore.confirmSession.mockImplementationOnce(() => {
      mockUserStore.isAuth = true
      return true
    })

    const navigation = startupRouter.push('/teams/123')
    await flushPromises()

    expect(apiClient.get).toHaveBeenCalledWith(
      'auth/token',
      expect.objectContaining({ headers: { Authorization: 'Bearer saved-token' } })
    )
    expect(startupRouter.currentRoute.value.matched).toHaveLength(0)
    expect(mockUserStore.confirmSession).not.toHaveBeenCalled()

    verification.resolve({ data: {} })
    await navigation
    expect(mockUserStore.confirmSession).toHaveBeenCalledWith('saved-token')
    expect(startupRouter.currentRoute.value.name).toBe('show-team')
  })

  it('redirects to sign-in after verification fails and leaves the saved token available', async () => {
    vi.resetModules()
    const { default: startupRouter } = await import('@/router/index')
    mockUserStore.token = 'saved-token'
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('Verification unavailable'))

    await startupRouter.push('/teams/123')

    expect(startupRouter.currentRoute.value.name).toBe('login')
    expect(mockUserStore.confirmSession).not.toHaveBeenCalled()
    expect(mockUserStore.clearUserData).not.toHaveBeenCalled()
  })
})
