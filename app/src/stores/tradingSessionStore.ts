// stores/trading-session.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { TradingSession } from '@/utils/trading/session'

export const useTradingSessionStore = defineStore('tradingSession', () => {
  // Store session data by EOA address (key: address, value: TradingSession)
  const sessions = ref<Map<string, TradingSession>>(new Map())

  // Actions to replace localStorage functions
  const loadSession = (address: string): TradingSession | null => {
    return sessions.value.get(address.toLowerCase()) || null
  }

  const saveSession = (address: string, session: TradingSession): void => {
    sessions.value.set(address.toLowerCase(), session)
  }

  const clearSession = (address: string): void => {
    sessions.value.delete(address.toLowerCase())
  }

  return {
    sessions,
    loadSession,
    saveSession,
    clearSession
  }
})
