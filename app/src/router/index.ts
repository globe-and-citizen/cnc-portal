import { createRouter, createWebHistory } from 'vue-router'
import { useStorage } from '@vueuse/core'

// Dynamic imports for code-splitting
const HomeView = () => import('@/views/HomeView.vue')
const LoginView = () => import('@/views/LoginView.vue')
const ListIndex = () => import('@/views/team/ListIndex.vue')
const ShowIndex = () => import('@/views/team/[id]/ShowIndex.vue')
const LockedView = () => import('@/views/LockedView.vue')

// Team-specific views with dynamic imports
const CashRemunerationView = () => import('@/views/team/[id]/CashRemunerationView.vue')
const ExpenseAccountView = () => import('@/views/team/[id]/ExpenseAccountView.vue')
const BankView = () => import('@/views/team/[id]/BankView.vue')
const ContractManagementView = () => import('@/views/team/[id]/ContractManagementView.vue')
const SherTokenView = () => import('@/views/team/[id]/SherTokenView.vue')
const VestingView = () => import('@/views/team/[id]/VestingView.vue')
const WeeklyClaimView = () => import('@/views/team/[id]/WeeklyClaimView.vue')
const ClaimHistoryView = () => import('@/views/team/[id]/ClaimHistoryView.vue')
const BodElectionView = () => import('@/views/team/[id]/BodElectionView.vue')
const ProposalsView = () => import('@/views/team/[id]/ProposalsView.vue')
const ProposalDetail = () => import('@/components/sections/ProposalsView/ProposalDetail.vue')
const BodElectionDetailsView = () => import('@/views/team/[id]/BodElectionDetailsView.vue')
const DemoExample = () => import('@/views/team/[id]/DemoExample.vue')
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
          path: '/teams/:id/demo',
          name: 'team-demo',
          meta: { name: 'Team Demo' },
          component: DemoExample
        },
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
        }
      ]
    },
    // {
    //   path: '/transactions',
    //   name: 'transactions',
    //   component: TransactionsView
    // },
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
