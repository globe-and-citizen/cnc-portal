import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import LoginView from '../views/LoginView.vue'
import TeamView from '../views/TeamView.vue'
import SingleTeamView from '../views/SingleTeamView.vue'

import { AuthService } from '@/services/authService'

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
      path: '/about',
      name: 'about',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/AboutView.vue')
    }
  ]
})
router.beforeEach(async (to, from) => {
  if (!(await AuthService.isAuthenticated()) && to.name !== 'login') {
    return { name: 'login' }
  }
})
export default router
