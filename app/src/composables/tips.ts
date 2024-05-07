import { TIPS_ADDRESS } from '@/constant'
import { ethers } from 'ethers'
import ABI from '../abi/tips.json'
import { onMounted, ref } from 'vue'
import { useToast } from './toast'
import { ToastType } from '@/types'
import type { AddressLike } from 'ethers'

export function useTips() {
  const { showToast } = useToast()
  const provider = new ethers.BrowserProvider((window as any).ethereum)

  const contract = new ethers.Contract(TIPS_ADDRESS, ABI, provider)
  const pushTipLoading = ref(false)
  const sendTipLoading = ref(false)

  async function pushTip(addresses: AddressLike[], amount: number) {
    pushTipLoading.value = true

    try {
      const tx = await contract.pushTip(addresses, {
        value: ethers.parseEther(amount.toString())
      })
      await tx.wait()

      showToast(ToastType.Success, 'Tip pushed successfully')
    } catch (error: any) {
      showToast(ToastType.Error, error.reason ? error.reason : 'Failed to push tip')
    } finally {
      pushTipLoading.value = false
    }
  }

  async function sendTip(addresses: AddressLike[], amount: number) {
    sendTipLoading.value = true

    try {
      const tx = await contract.sendTip(addresses, {
        value: ethers.parseEther(amount.toString())
      })
      await tx.wait()

      showToast(ToastType.Success, 'Tip sent successfully')
    } catch (error: any) {
      showToast(ToastType.Error, error.reason ? error.reason : 'Failed to send tip')
    } finally {
      sendTipLoading.value = false
    }
  }

  async function getBalance(address: AddressLike) {
    return await contract.getBalance(address)
  }

  onMounted(async () => {
    if (!(window as any).ethereum) showToast(ToastType.Info, 'Please install Metamask')

    await provider.send('eth_requestAccounts', [])
  })

  return {
    pushTipLoading,
    pushTip,
    sendTipLoading,
    sendTip,
    getBalance
  }
}
