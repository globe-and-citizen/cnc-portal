import { describe, it, expect } from 'vitest'
import * as safeModule from '../index'

describe('safe index exports', () => {
  it('exports the Safe URL utilities used by the balance section', () => {
    expect(typeof safeModule.getSafeHomeUrl).toBe('function')
    expect(typeof safeModule.openSafeAppUrl).toBe('function')
  })
})
