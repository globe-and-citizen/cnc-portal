import { createRouter, createWebHistory } from 'vue-router'
import { useStorage } from '@vueuse/core'
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue')
    },
    {
      path: '/login',
      name: 'login',
      components: {
        login: () => import('@/views/LoginView.vue')
      }
    },
    {
      path: '/teams',
      name: 'teams',
      meta: { name: 'Teams List' },
      components: {
        default: () => import('@/views/team/ListIndex.vue')
      }
    },
    {
      path: '/teams/:id',
      component: () => import('@/views/team/[id]/ShowIndex.vue'),
      name: 'show-team',
      meta: { name: 'Team View' },
      children: [
        {
          path: '/teams/:id/demo',
          name: 'team-demo',
          meta: { name: 'Team Demo' },
          component: () => import('@/views/team/[id]/DemoExample.vue')
        },
        {
          path: '/teams/:id/accounts/bank-account',
          name: 'bank-account',
          meta: { name: 'Bank Account' },
          component: () => import('@/views/team/[id]/Accounts/BankView.vue')
        },
        {
          path: '/teams/:id/accounts/expense-account',
          name: 'expense-account',
          meta: { name: 'Expense Account' },
          component: () => import('@/views/team/[id]/Accounts/ExpenseAccountView.vue')
        },
        {
          path: '/teams/:id/accounts/payroll-account',
          name: 'payroll-account',
          meta: { name: 'Payroll Account' },
          component: () => import('@/views/team/[id]/Accounts/CashRemunerationView.vue')
        },
        {
          path: '/teams/:id/accounts/team-payroll',
          name: 'team-payroll',
          meta: { name: 'Team Payroll' },
          component: () => import('@/views/team/[id]/Accounts/WeeklyClaimView.vue')
        },
        {
          path: '/teams/:id/accounts/members/:memberAddress/payroll-history',
          name: 'payroll-history',
          meta: { name: 'Payroll History' },
          component: () => import('@/views/team/[id]/Accounts/ClaimHistoryView.vue')
        },
        {
          path: '/teams/:id/cash-remunerations/member/:memberAddress',
          name: 'cash-remunerations-member',
          meta: { name: 'Cash Remuneration Member' },
          component: () => import('@/views/team/[id]/Accounts/CashRemunerationView.vue')
        },
        {
          path: '/teams/:id/vesting',
          name: 'vesting',
          meta: { name: 'Vesting' },
          component: () => import('@/views/team/[id]/VestingView.vue')
        },

        {
          path: '/teams/:id/contract-management',
          name: 'contract-management',
          meta: { name: 'Contract Management' },
          component: () => import('@/views/team/[id]/ContractManagementView.vue')
        },
        {
          path: '/teams/:id/administration/bod-elections',
          name: 'bod-elections',
          meta: { name: 'BoD Election' },
          component: () => import('@/views/team/[id]/BodElectionView.vue')
        },
        {
          path: '/teams/:id/administration/bod-proposals',
          name: 'bod-proposals',
          meta: { name: 'Proposals' },
          component: () => import('@/views/team/[id]/ProposalsView.vue')
        },
        {
          path: '/teams/:id/administration/bod-proposals/:proposalId',
          name: 'proposal-detail',
          meta: { name: 'Proposals' },
          component: () => import('@/components/sections/ProposalsView/ProposalDetail.vue')
        },
        {
          path: '/teams/:id/administration/bod-elections-details',
          name: 'bod-elections-details',
          meta: { name: 'BoD Election Details' },
          component: () => import('@/views/team/[id]/BodElectionDetailsView.vue')
        },
        {
          path: '/teams/:id/sher-token',
          name: 'sher-token',
          meta: { name: 'SHER Token' },
          component: () => import('@/views/team/[id]/SherTokenView.vue')
        }
      ]
    }
    // {
    //   path: '/transactions',
    //   name: 'transactions',
    //   component: TransactionsView
    // },
    // {
    //   path: '/locked',
    //   name: 'LockedView',
    //   meta: { noLayout: true },
    //   component: () => import('@/views/LockScreen.vue')
    // }
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
