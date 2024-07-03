import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import LoginView from '../views/LoginView.vue'
import TeamView from '../views/TeamView.vue'
import SingleTeamView from '../views/SingleTeamView.vue'
import TransactionsView from '@/views/TransactionsView.vue'
import ToastDemoView from '@/views/ToastDemoView.vue'
import RolesView from '@/views/RolesView.vue'
import { useStorage } from '@vueuse/core'

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
      children: [
        {
          path: ':id',
          name: 'singleteam',
          component: SingleTeamView
        },
        {
          path: '',
          name: 'teams',
          component: TeamView
        }
      ]
    },
    {
      path: '/transactions',
      name: 'transactions',
      component: TransactionsView
    },
    {
      path: '/toast-demo',
      name: 'toast-demo',
      component: ToastDemoView
    },
    {
      path: '/roles',
      children: [
        {
          path: '',
          name: 'roles',
          component: RolesView
        }
      ]
    }
  ]
})
const isAuth = useStorage('isAuth', false)
router.beforeEach(async (to) => {
  // Redirect to login page if not authenticated
  if (!isAuth.value && to.name !== 'login') {
    return { name: 'login' }
  }
})
export default router
