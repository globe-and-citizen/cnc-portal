import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import LoginView from '../views/LoginView.vue'
import TeamView from '../views/TeamView.vue'
import SingleTeamView from '../views/SingleTeamView.vue'
import TransactionsView from '@/views/TransactionsView.vue'
import CashRemunerationView from '@/views/CashRemunerationView.vue'
import ListIndex from '@/views/team/ListIndex.vue'
import ShowIndex from '@/views/team/[id]/ShowIndex.vue'
import { useStorage } from '@vueuse/core'
import BankView from '@/views/team/[id]/BankView.vue'

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
      path: '/bank',
      name: 'bank',
      components: HomeView
    },
    {
      path: '/admin',
      name: 'admin',
      components: HomeView
    },
    {
      path: '/contracts',
      name: 'contracts',
      components: HomeView
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
        // {
        //   path: '',
        //   name: 'teams',
        //   component: ListIndex
        // },
        // {
        //   path: ':id',
        //   name: 'show-team',
        //   component: ShowIndex
        // },
        {
          path: '/teams/:id/cash-remunerations',
          name: 'cash-remunerations',
          component: CashRemunerationView
        },
        {
          path: '/teams/:id/bank',
          name: 'bank',
          component: BankView
        }
      ]
    },
    {
      path: '/teams-old',
      children: [
        {
          path: ':id',
          name: 'singleteam',
          component: SingleTeamView
        },
        {
          path: '',
          name: 'old-teams',
          component: TeamView
        },
        {
          path: '/teams/:id/cash-remunerations',
          name: 'cash-remunerations',
          component: CashRemunerationView
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
