import { computed, ref } from 'vue'
import { describe, expect, it } from 'vitest'
import { useTransactionInline } from '../useTransactionInline'

type TxFixture = {
  from: string
  to: string
  amount: string | number
  token: string
}

const CONTRACT = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
const ALT_CONTRACT = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
const EXTERNAL = '0xcccccccccccccccccccccccccccccccccccccccc'
const EXTERNAL_TWO = '0xdddddddddddddddddddddddddddddddddddddddd'

describe('useTransactionInline', () => {
  it('derives incoming direction/prefix/class and inline external sender', () => {
    const contractAddress = ref(CONTRACT)
    const inline = useTransactionInline(contractAddress)
    const tx: TxFixture = {
      from: EXTERNAL,
      to: CONTRACT.toUpperCase(),
      amount: '10',
      token: 'USDC'
    }

    expect(inline.getDirection(tx)).toBe('in')
    expect(inline.getValuePrefix(tx)).toBe('+')
    expect(inline.getValueClass(tx)).toBe('text-success font-medium')
    expect(inline.getInlineUser(tx)).toEqual({ label: '', address: EXTERNAL })
  })

  it('derives outgoing direction/prefix/class and inline receiver with array contracts', () => {
    const contractAddresses = computed(() => [CONTRACT, ALT_CONTRACT])
    const inline = useTransactionInline(contractAddresses)
    const tx: TxFixture = {
      from: ALT_CONTRACT.toUpperCase(),
      to: EXTERNAL,
      amount: 5,
      token: 'ETH'
    }

    expect(inline.getDirection(tx)).toBe('out')
    expect(inline.getValuePrefix(tx)).toBe('-')
    expect(inline.getValueClass(tx)).toBe('text-error font-medium')
    expect(inline.getInlineUser(tx)).toEqual({ label: '→', address: EXTERNAL })
  })

  it('returns neutral values when amount/token is non-value or flow is not contract-bound', () => {
    const contractAddress = ref(CONTRACT)
    const inline = useTransactionInline(contractAddress)

    const zeroAmountTx: TxFixture = {
      from: EXTERNAL,
      to: CONTRACT,
      amount: 0,
      token: 'USDC'
    }
    expect(inline.getDirection(zeroAmountTx)).toBe(null)

    const placeholderTokenTx: TxFixture = {
      from: EXTERNAL,
      to: CONTRACT,
      amount: '15',
      token: '-'
    }
    expect(inline.getDirection(placeholderTokenTx)).toBe(null)

    const bothExternalTx: TxFixture = {
      from: EXTERNAL,
      to: EXTERNAL_TWO,
      amount: '15',
      token: 'USDC'
    }
    expect(inline.getDirection(bothExternalTx)).toBe(null)
    expect(inline.getValuePrefix(bothExternalTx)).toBe('')
    expect(inline.getValueClass(bothExternalTx)).toBe('')
    expect(inline.getInlineUser(bothExternalTx)).toBe(null)

    const bothContractTx: TxFixture = {
      from: CONTRACT,
      to: CONTRACT,
      amount: '15',
      token: 'USDC'
    }
    expect(inline.getDirection(bothContractTx)).toBe(null)
    expect(inline.getInlineUser(bothContractTx)).toBe(null)

    const malformedTx = {
      from: undefined,
      to: CONTRACT,
      amount: '15',
      token: 'USDC'
    } as unknown as TxFixture
    expect(inline.getDirection(malformedTx)).toBe('in')
  })
})
