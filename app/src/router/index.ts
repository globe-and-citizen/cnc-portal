import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import LoginView from '../views/LoginView.vue'
// import TransactionsView from '@/views/TransactionsView.vue'
import TransactionTimelineDemoView from '@/views/TransactionTimelineDemoView.vue'
import CashRemunerationView from '@/views/team/[id]/CashRemunerationView.vue'
import ExpenseAccountView from '@/views/team/[id]/ExpenseAccountView.vue'
import ListIndex from '@/views/team/ListIndex.vue'
import ShowIndex from '@/views/team/[id]/ShowIndex.vue'
import { useStorage } from '@vueuse/core'
import BankView from '@/views/team/[id]/BankView.vue'
import ContractManagementView from '@/views/team/[id]/ContractManagementView.vue'
import SherTokenView from '@/views/team/[id]/SherTokenView.vue'
import VestingView from '@/views/team/[id]/VestingView.vue'
import WeeklyClaimView from '@/views/team/[id]/WeeklyClaimView.vue'
import ClaimHistoryView from '@/views/team/[id]/ClaimHistoryView.vue'
import BodElectionView from '@/views/team/[id]/BodElectionView.vue'
import ProposalsView from '@/views/team/[id]/ProposalsView.vue'
import ProposalDetail from '@/components/sections/ProposalsView/ProposalDetail.vue'
import BodElectionDetailsView from '@/views/team/[id]/BodElectionDetailsView.vue'
import BankTestView from '@/views/BankTestView.vue'
import LockedView from '@/views/LockedView.vue'
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
          meta: { name: 'Team Weekly Claim' },
          component: WeeklyClaimView
        },
        {
          path: '/teams/:id/cash-remunerations/members/:memberAddress/claim-history',
          name: 'claim-history',
          meta: { name: 'Claim History' },
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
          path: '/teams/:id/administration/bod-elections',
          name: 'bod-elections',
          meta: { name: 'BoD Election' },
          component: BodElectionView
        },
        {
          path: '/teams/:id/administration/bod-proposals',
          name: 'bod-proposals',
          meta: { name: 'Proposals' },
          component: ProposalsView
        },
        {
          path: '/teams/:id/administration/bod-proposals/:proposalId',
          name: 'proposal-detail',
          meta: { name: 'Proposals' },
          component: ProposalDetail
        },
        {
          path: '/teams/:id/administration/bod-elections-details',
          name: 'bod-elections-details',
          meta: { name: 'BoD Election Details' },
          component: BodElectionDetailsView
        },
        {
          path: '/teams/:id/sher-token',
          name: 'sher-token',
          meta: { name: 'SHER Token' },
          component: SherTokenView
        },
        {
          path: '/teams/:id/bank-test',
          name: 'bank-test',
          meta: { name: 'Bank Testing' },
          component: BankTestView
        }
      ]
    },
    // {
    //   path: '/transactions',
    //   name: 'transactions',
    //   component: TransactionsView
    // },
    {
      path: '/timeline-demo',
      name: 'timeline-demo',
      meta: { name: 'Transaction Timeline Demo' },
      component: TransactionTimelineDemoView
    },
    {
      path: '/locked',
      name: 'LockedView',
      meta: { noLayout: true },
      component: LockedView
    }
  ]
})
const isAuth = useStorage('isAuth', false)
router.beforeEach(async (to) => {
  // Skip auth redirects when visiting the locked session view
  if (to.path === '/locked') {
    return true
  }

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
