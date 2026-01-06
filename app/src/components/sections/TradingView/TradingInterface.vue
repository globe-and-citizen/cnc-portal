<template>
  <div class="space-y-8 animate-fade-in">
    <!-- Header -->
    <!-- <div>
      <h1 class="text-3xl font-bold mb-2">Trading</h1>
      <p class="text-gray-500">Enter a Polymarket URL to place a trade</p>
    </div> -->

    <!-- Trading Input -->
    <!-- <div class="card bg-base-100 shadow-xl p-6">
      <div class="flex gap-4">
        <div class="relative flex-1">
          <icon
            icon="heroicons:magnifying-glass"
            class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
          />
          <input
            type="text"
            placeholder="Paste Polymarket event or market URL..."
            v-model="marketUrl"
            @keydown.enter="handleTrade"
            class="input input-bordered w-full pl-12 h-14 text-lg focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        <button
          @click="handleTrade"
          :disabled="!marketUrl.trim()"
          class="btn btn-primary h-14 px-8 text-lg"
        >
          Trade
          <icon icon="heroicons:arrow-right" class="w-5 h-5 ml-2" />
        </button>
      </div>
    </div> -->

    <!-- Account Stats -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="card bg-base-100 shadow-xl p-5">
        <div class="flex flex-col items-center text-center gap-2">
          <div class="p-2.5 rounded-lg bg-primary/10">
            <icon icon="heroicons:wallet" class="w-5 h-5 text-primary" />
          </div>
          <p class="text-2xl font-bold font-mono">${{ formatCurrency(accountBalance) }}</p>
          <p class="text-sm text-gray-500">Account Balance</p>
        </div>
      </div>

      <div class="card bg-base-100 shadow-xl p-5">
        <div class="flex flex-col items-center text-center gap-2">
          <div :class="`p-2.5 rounded-lg ${totalPnl >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`">
            <icon
              icon="heroicons:currency-dollar"
              :class="`w-5 h-5 ${totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`"
            />
          </div>
          <p
            :class="`text-2xl font-bold font-mono ${totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`"
          >
            {{ totalPnl >= 0 ? '+' : '' }}${{ totalPnl.toFixed(2) }}
          </p>
          <p class="text-sm text-gray-500">Total P&L</p>
        </div>
      </div>

      <div class="card bg-base-100 shadow-xl p-5">
        <div class="flex flex-col items-center text-center gap-2">
          <div
            :class="`p-2.5 rounded-lg ${pnlPercentage >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`"
          >
            <icon
              icon="heroicons:trending-up"
              :class="`w-5 h-5 ${pnlPercentage >= 0 ? 'text-green-500' : 'text-red-500'}`"
            />
          </div>
          <p
            :class="`text-2xl font-bold font-mono ${pnlPercentage >= 0 ? 'text-green-500' : 'text-red-500'}`"
          >
            {{ pnlPercentage >= 0 ? '+' : '' }}{{ pnlPercentage.toFixed(1) }}%
          </p>
          <p class="text-sm text-gray-500">Performance</p>
        </div>
      </div>
    </div>

    <!-- Trades Table -->
    <!-- <div>
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold">Your Trades</h2>
        <div class="tabs">
          <a
            v-for="tab in filterTabs"
            :key="tab.value"
            :class="['tab tab-bordered', filter === tab.value ? 'tab-active' : '']"
            @click="setFilter(tab.value)"
          >
            {{ tab.label }}
          </a>
        </div>
      </div>

      <div class="card bg-base-100 shadow-xl overflow-hidden">
        <div class="overflow-x-auto">
          <table class="table">
            <thead>
              <tr>
                <th class="text-gray-500">Market</th>
                <th class="text-gray-500">Position</th>
                <th class="text-gray-500 text-right">Shares</th>
                <th class="text-gray-500 text-right">Entry</th>
                <th class="text-gray-500 text-right">P&L</th>
                <th class="text-gray-500">Status</th>
                <th class="text-gray-500 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="filteredTrades.length === 0">
                <td colspan="7" class="text-center text-gray-500 py-8">No trades found</td>
              </tr>
              <tr v-else v-for="trade in filteredTrades" :key="trade.id">
                <td class="font-medium max-w-[250px]">
                  <span class="line-clamp-1">{{ trade.market }}</span>
                </td>
                <td>
                  <span class="badge badge-outline font-mono">
                    {{ trade.outcome }}
                  </span>
                </td>
                <td class="text-right font-mono">
                  {{ trade.shares }}
                </td>
                <td class="text-right font-mono text-gray-500">
                  ${{ trade.entryPrice.toFixed(2) }}
                </td>
                <td
                  :class="`text-right font-mono font-semibold ${
                    calculatePnlPercent(trade) >= 0 ? 'text-green-500' : 'text-red-500'
                  }`"
                >
                  {{ calculatePnlPercent(trade) >= 0 ? '+' : ''
                  }}{{ calculatePnlPercent(trade).toFixed(1) }}%
                </td>
                <td>
                  <span
                    v-if="trade.status === 'open'"
                    class="badge bg-primary/20 text-primary border-primary/30"
                  >
                    Open
                  </span>
                  <span
                    v-else-if="trade.result === 'won'"
                    class="badge bg-green-500/20 text-green-500 border-green-500/30"
                  >
                    Won
                  </span>
                  <span v-else class="badge bg-red-500/20 text-red-500 border-red-500/30">
                    Lost
                  </span>
                </td>
                <td class="text-right">
                  <button
                    v-if="trade.status === 'open'"
                    @click="handleSell(trade)"
                    class="btn btn-sm btn-error gap-1.5"
                  >
                    <icon icon="heroicons:arrow-trending-down" class="w-3.5 h-3.5" />
                    Sell
                  </button>
                  <button
                    v-else
                    @click="handleWithdraw(trade)"
                    :disabled="trade.result === 'lost'"
                    class="btn btn-sm btn-outline gap-1.5"
                  >
                    <icon icon="heroicons:wallet" class="w-3.5 h-3.5" />
                    Withdraw
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div> -->

    <YourTradesSection />
    <!-- Trading Modal -->
    <TradingModal
      v-if="isModalOpen"
      :market-url="marketUrl"
      :is-open="isModalOpen"
      @close="isModalOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import TradingModal from './TradingModal.vue'
import { toast } from 'vue-sonner' // or your preferred toast library
import YourTradesTable from './YourTradesTable.vue'
import YourTradesSection from './YourTradesSection.vue'

type TradeStatus = 'open' | 'resolved'
type FilterType = 'all' | 'open' | 'resolved'

interface Trade {
  id: string
  market: string
  outcome: string
  type: 'buy' | 'sell'
  shares: number
  entryPrice: number
  currentPrice: number
  status: TradeStatus
  result?: 'won' | 'lost'
  pnl: number
  date: string
}

const trades: Trade[] = [
  {
    id: '1',
    market: 'Will Bitcoin reach $150,000 by end of 2025?',
    outcome: 'Yes',
    type: 'buy',
    shares: 500,
    entryPrice: 0.42,
    currentPrice: 0.58,
    status: 'open',
    pnl: 80.0,
    date: '2024-12-20'
  },
  {
    id: '2',
    market: 'Will the Fed cut rates in January 2025?',
    outcome: 'No',
    type: 'buy',
    shares: 1000,
    entryPrice: 0.67,
    currentPrice: 0.72,
    status: 'open',
    pnl: 50.0,
    date: '2024-12-18'
  },
  {
    id: '3',
    market: 'Will Ethereum ETF be approved by Q1 2025?',
    outcome: 'Yes',
    type: 'buy',
    shares: 250,
    entryPrice: 0.78,
    currentPrice: 1.0,
    status: 'resolved',
    result: 'won',
    pnl: 55.0,
    date: '2024-12-15'
  },
  {
    id: '4',
    market: 'Will Apple release AR glasses in 2024?',
    outcome: 'Yes',
    type: 'buy',
    shares: 300,
    entryPrice: 0.35,
    currentPrice: 0.0,
    status: 'resolved',
    result: 'lost',
    pnl: -105.0,
    date: '2024-12-10'
  },
  {
    id: '5',
    market: 'Will SpaceX Starship reach orbit in 2024?',
    outcome: 'Yes',
    type: 'buy',
    shares: 800,
    entryPrice: 0.55,
    currentPrice: 1.0,
    status: 'resolved',
    result: 'won',
    pnl: 360.0,
    date: '2024-12-05'
  }
]

// Reactive state
const marketUrl = ref('')
const isModalOpen = ref(false)
const filter = ref<FilterType>('all')

// Filter tabs
const filterTabs: Array<{ value: FilterType; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'resolved', label: 'Resolved' }
]

// Computed properties
const filteredTrades = computed(() => {
  if (filter.value === 'all') return trades
  return trades.filter((trade) => trade.status === filter.value)
})

const accountBalance = computed(() => 12450.75)

const totalPnl = computed(() => trades.reduce((sum, trade) => sum + trade.pnl, 0))

const totalInvested = computed(() =>
  trades.reduce((sum, trade) => sum + trade.shares * trade.entryPrice, 0)
)

const pnlPercentage = computed(() =>
  totalInvested.value > 0 ? (totalPnl.value / totalInvested.value) * 100 : 0
)

// Methods
const handleTrade = () => {
  if (marketUrl.value.trim()) {
    isModalOpen.value = true
  }
}

const setFilter = (value: FilterType) => {
  filter.value = value
}

const handleSell = (trade: Trade) => {
  toast.success(`Selling ${trade.shares} shares of "${trade.market}"`)
}

const handleWithdraw = (trade: Trade) => {
  toast.success(`Withdrawing $${Math.abs(trade.pnl).toFixed(2)} from "${trade.market}"`)
}

const calculatePnlPercent = (trade: Trade): number => {
  return ((trade.currentPrice - trade.entryPrice) / trade.entryPrice) * 100
}

const formatCurrency = (value: number): string => {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2 })
}
</script>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.line-clamp-1 {
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
}
</style>
