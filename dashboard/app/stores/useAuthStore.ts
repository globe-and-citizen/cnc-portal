import { createSharedComposable, useLocalStorage } from '@vueuse/core';

export interface AuthState {
  isAuthenticated: boolean;
  address: string | null;
  token: string | null;
}

const _useAuthStore = () => {
  const token = useLocalStorage<string | null>('dashboard-auth-token', null);
  const address = useLocalStorage<string | null>('dashboard-auth-address', null);

  const isAuthenticated = computed(() => !!token.value && !!address.value);

  const setAuth = (authToken: string, userAddress: string) => {
    token.value = authToken;
    address.value = userAddress;
  };

  const clearAuth = () => {
    token.value = null;
    address.value = null;
  };

  const getToken = () => token.value;

  return {
    token,
    address,
    isAuthenticated,
    setAuth,
    clearAuth,
    getToken,
  };
};

export const useAuthStore = createSharedComposable(_useAuthStore);
