import { describe, it, expect } from 'vitest'
import { parseErrorV2 } from '@/lib/logging'

describe('parseErrorV2', () => {
  it('renders name plus the first sentence of the message', () => {
    expect(parseErrorV2(new Error('Boom happened. Then more detail.'))).toBe('Error: Boom happened')
  })

  it('keeps the whole message when there is no sentence break', () => {
    expect(parseErrorV2(new Error('Boom happened'))).toBe('Error: Boom happened')
  })

  it('labels an empty message as unknown', () => {
    expect(parseErrorV2(new Error(''))).toBe('Error: Unknown error')
  })

  it('carries the concrete error subclass name', () => {
    expect(parseErrorV2(new TypeError('bad input. details'))).toBe('TypeError: bad input')
  })
})
