import { describe, expect, it } from 'vitest'
import { signerRoleCopy } from '@/utils/safe/signerRole'

describe('signerRoleCopy', () => {
  it('reports the permission check while the owner list loads', () => {
    const copy = signerRoleCopy({ isLoading: true, isOwner: false })

    expect(copy.label).toBe('Checking permissions…')
    expect(copy.noticeTitle).toBe('Checking signer permissions')
    expect(copy.transferHint).toBe('Only a Safe signer can create a transfer proposal.')
  })

  it('describes signer capabilities for a Safe owner', () => {
    const copy = signerRoleCopy({ isLoading: false, isOwner: true })

    expect(copy.label).toBe('Safe signer')
    expect(copy.noticeTitle).toBe('Signer wallet connected')
    expect(copy.description).toContain('propose transfers')
    expect(copy.transferHint).toBe('Create a transfer proposal for signer approval.')
  })

  it('describes the read-only role for any other wallet', () => {
    const copy = signerRoleCopy({ isLoading: false, isOwner: false })

    expect(copy.label).toBe('Viewer / depositor')
    expect(copy.noticeTitle).toBe('Safe information is read-only for this wallet')
    expect(copy.description).toContain('deposit funds')
    expect(copy.transferHint).toBe('Only a Safe signer can create a transfer proposal.')
  })
})
