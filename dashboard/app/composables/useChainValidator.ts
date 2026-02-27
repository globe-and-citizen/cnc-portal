import { useChainId, useSwitchChain } from '@wagmi/vue'
import { computed } from 'vue'

export const useChainValidator = () => {
  const config = useRuntimeConfig()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()

  const expectedChainId = computed(() => Number(config.public.chainId))
  const isCorrectChain = computed(() => chainId.value === expectedChainId.value)

  const switchToCorrectChain = async () => {
    if (!isCorrectChain.value && chainId.value) {
      try {
        await switchChain({ chainId: expectedChainId.value })
      } catch (error) {
        console.error('Failed to switch chain:', error)
        throw error
      }
    }
  }

  return {
    chainId,
    expectedChainId,
    isCorrectChain,
    switchToCorrectChain
  }
}
