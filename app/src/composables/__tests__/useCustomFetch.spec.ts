import { useCustomFetch } from '@/composables/useCustomFetch'
import { describe, expect, it, vi } from 'vitest'
// const createMockResponse = (data: any): Response => {
//   const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
//   const init: ResponseInit = { status: 200, statusText: 'OK', headers: { 'Content-Type': 'application/json' } }
//   return new Response(blob, init)
// }
const createMockResponse = (data: any): Response => {
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
export async function fetchData(url: string): Promise<any> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Network response was not ok')
  }
  return response.json()
}
describe.only('useCustomFetch', () => {
  it('Should return the correct data', async () => {
    const mockData = { data: 'mocked data' }

    // Mocking the fetch function
    global.fetch = vi.fn(() => Promise.resolve(createMockResponse(mockData)))

    const dataV2 = await fetchData('https://google.com/')
    expect(await dataV2).toMatchInlineSnapshot(`
      {
        "data": "mocked data",
      }
    `)

    const { error, data, response } = await useCustomFetch<string>('https://google.com/').json()
    console.log({ data: data.value, error: error.value, response: response.value })
    expect(global.fetch).toHaveBeenCalledWith('https://google.com/')
    expect(data.value).toMatchInlineSnapshot(`
      {
        "data": "mocked data",
      }
    `)
    // expect(data.value).toEqual(mockData)
    console.log('ds', { error: error.value, data: data.value })

    expect(true).toBe(true)
  })
})
