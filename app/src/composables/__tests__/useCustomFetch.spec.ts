import { useCustomFetch } from '@/composables/useCustomFetch'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
// const createMockResponse = (data: any): Response => {
//   const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
//   const init: ResponseInit = { status: 200, statusText: 'OK', headers: { 'Content-Type': 'application/json' } }
//   return new Response(blob, init)
// }
const createMockResponse = (data: unknown): Response => {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
    headers: new Headers({ 'Content-Type': 'application/json' }),
    redirected: false,
    statusText: 'OK',
    type: 'basic',
    url: '',
    clone: () => createMockResponse(data),
    body: null,
    bodyUsed: false,
    arrayBuffer: async () => new ArrayBuffer(0),
    blob: async () => new Blob(),
    formData: async () => new FormData(),
    text: async () => ''
  } as Response
}

const createMock401Response = (data: unknown): Response => {
  return {
    ok: false,
    status: 401,
    json: () => Promise.resolve(data),
    headers: new Headers({ 'Content-Type': 'application/json' }),
    redirected: false,
    statusText: 'Unauthorized',
    type: 'basic',
    url: '',
    clone: () => createMock401Response(data),
    body: null,
    bodyUsed: false,
    arrayBuffer: async () => new ArrayBuffer(0),
    blob: async () => new Blob(),
    formData: async () => new FormData(),
    text: async () => ''
  } as Response
}
export async function fetchData(url: string) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Network response was not ok')
  }
  return response.json()
}

describe('useCustomFetch', () => {
  const originalLocation = window.location

  beforeEach(() => {
    // Mock the window.location object
    const mockedLocation = {
      ...originalLocation,
      reload: vi.fn()
    }
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: mockedLocation
    })
  })

  afterEach(() => {
    // Restore the original window.location
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation
    })
  })
  it('Should return the correct data', async () => {
    const mockData = { data: 'mocked data' }

    setActivePinia(createPinia())
    // Mocking the fetch function
    global.fetch = vi.fn(() => Promise.resolve(createMockResponse(mockData)))

    // const dataV2 = await fetchData('https://google.com/')
    // expect(await dataV2).toMatchInlineSnapshot(`
    //   {
    //     "data": "mocked data",
    //   }
    // `)

    const { error, data, response } = await useCustomFetch<string>('https://google.com/').json()
    expect(error.value).toBe(null)
    expect(response.value?.ok).toBe(true)
    expect(data.value).toStrictEqual({ data: 'mocked data' })
  })

  it('should return an error when the fetch fails', async () => {
    const mockData = { data: 'Error' }

    // Mocking the fetch function
    global.fetch = vi.fn(() => Promise.resolve(createMock401Response(mockData)))

    // Mock widows.location.reload
    window.location.reload = vi.fn()

    const { error, data, response } = await useCustomFetch<string>('https://google.com/').json()
    // expect(global.fetch).toHaveBeenCalledWith('https://google.com/')

    expect(data.value).toBe(null)
    expect(response.value?.ok).toBe(false)
    expect(error.value).toMatchInlineSnapshot(`[Error: Unauthorized]`)
  })
})
