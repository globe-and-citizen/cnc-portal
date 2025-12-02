import { WagmiPlugin } from '@wagmi/vue';
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query';
import { wagmiConfig } from '~/utils/wagmi.config';

export default defineNuxtPlugin((nuxtApp) => {
  const queryClient = new QueryClient();

  nuxtApp.vueApp.use(WagmiPlugin, { config: wagmiConfig });
  nuxtApp.vueApp.use(VueQueryPlugin, { queryClient });
});
