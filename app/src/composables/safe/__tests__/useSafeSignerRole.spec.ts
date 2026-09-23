import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import type { SafeInfo } from '@/types/safe'
import { useSafeSignerRole } from '@/composables/safe/useSafeSignerRole'
import { mockUserStore } from '@/tests/mocks/store.mock'

const OWNER = '0x1111111111111111111111111111111111111111'

const safeInfo = (owners: string[]): SafeInfo => ({
  address: '0x2222222222222222222222222222222222222222',
  chain: 'polygon',
  balance: '0',
  symbol: 'POL',
  owners,
  threshold: 1,
  nonce: 0,
  version: '1.4.1'
})

describe('[US-SAFE-006] useSafeSignerRole', () => {
  it('recognises the connected wallet as a signer regardless of address casing', () => {
    mockUserStore.address = OWNER.toUpperCase().replace('0X', '0x')
    const { isConnectedUserOwner } = useSafeSignerRole(ref(safeInfo([OWNER])))

    expect(isConnectedUserOwner.value).toBe(true)
  })

  it('treats a wallet outside the owner list as a viewer', () => {
    mockUserStore.address = '0x9999999999999999999999999999999999999999'
    const { isConnectedUserOwner } = useSafeSignerRole(ref(safeInfo([OWNER])))

    expect(isConnectedUserOwner.value).toBe(false)
  })

  it('stays false until the Safe owners are known', () => {
    mockUserStore.address = OWNER
    const info = ref<SafeInfo | undefined>(undefined)
    const { isConnectedUserOwner } = useSafeSignerRole(info)

    expect(isConnectedUserOwner.value).toBe(false)
    info.value = safeInfo([OWNER])
    expect(isConnectedUserOwner.value).toBe(true)
  })
})
