import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import LoginView from '../views/LoginView.vue'
import TransactionsView from '@/views/TransactionsView.vue'
import CashRemunerationView from '@/views/team/[id]/CashRemunerationView.vue'
import ExpenseAccountView from '@/views/team/[id]/ExpenseAccountView.vue'
import ListIndex from '@/views/team/ListIndex.vue'
import ShowIndex from '@/views/team/[id]/ShowIndex.vue'
import { useStorage } from '@vueuse/core'
import BankView from '@/views/team/[id]/BankView.vue'
import ContractManagementView from '@/views/team/[id]/ContractManagementView.vue'
import AdministrationView from '@/views/team/[id]/AdministrationView.vue'
import SherTokenView from '@/views/team/[id]/SherTokenView.vue'
import VestingView from '@/views/team/[id]/VestingView.vue'
import WeeklyClaimView from '@/views/team/[id]/WeeklyClaimView.vue'

import ClaimHistoryView from '@/views/team/[id]/ClaimHistoryView.vue'

import BodElectionView from '@/views/team/[id]/BodElectionView.vue'


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/login',
      name: 'login',
      components: {
        login: LoginView
      }
    },
    {
      path: '/teams',
      name: 'teams',
      meta: { name: 'Teams List' },
      components: {
        default: ListIndex
      }
    },
    {
      path: '/teams/:id',
      component: ShowIndex,
      name: 'show-team',
      meta: { name: 'Team View' },
      children: [
        {
          path: '/teams/:id/cash-remunerations/weekly-claim',
          name: 'weekly-claim',
          meta: { name: 'Cash Remuneration-weekly claim' },
          component: WeeklyClaimView
        },
        {
          path: '/teams/:id/cash-remunerations/claim-history',
          name: 'claim-history',
          meta: { name: 'Cash Remuneration-claim history' },
          component: ClaimHistoryView
        },
        {
          path: '/teams/:id/cash-remunerations',
          name: 'cash-remunerations',
          meta: { name: 'Cash Remuneration' },
          component: CashRemunerationView
        },
        {
          path: '/teams/:id/cash-remunerations/member/:memberAddress',
          name: 'cash-remunerations-member',
          meta: { name: 'Cash Remuneration Member' },
          component: CashRemunerationView
        },
        {
          path: '/teams/:id/expense-account',
          name: 'expense-account',
          meta: { name: 'Expense Account' },
          component: ExpenseAccountView
        },
        {
          path: '/teams/:id/vesting',
          name: 'vesting',
          meta: { name: 'Vesting' },
          component: VestingView
        },
        {
          path: '/teams/:id/bank',
          name: 'bank',
          meta: { name: 'Team Bank' },
          component: BankView
        },
        {
          path: '/teams/:id/contract-management',
          name: 'contract-management',
          meta: { name: 'Contract Management' },
          component: ContractManagementView
        },
        {
          path: '/teams/:id/administration',
          name: 'administration',
          meta: { name: 'Contract Administration' },
          component: AdministrationView
        },
        {
          path: '/teams/:id/administration/bod-elections',
          name: 'bod-elections',
          meta: { name: 'BoD Election' },
          component: BodElectionView
        },
        {
          path: '/teams/:id/sher-token',
          name: 'sher-token',
          meta: { name: 'SHER Token' },
          component: SherTokenView
        }
      ]
    },
    {
      path: '/transactions',
      name: 'transactions',
      component: TransactionsView
    }
  ]
})
const isAuth = useStorage('isAuth', false)
router.beforeEach(async (to) => {
  // Redirect to login page if not authenticated
  if (!isAuth.value && to.name !== 'login') {
    return { name: 'login' }
  }
  // Redirect to home page if logged in
  if (to.name === 'login' && isAuth.value) {
    return { name: 'home' }
  }
})
// router.
export default router
