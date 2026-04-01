import { createRouter, createWebHistory } from 'vue-router'
import DownloadsView from '@/views/DownloadsView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/downloads',
    },
    {
      path: '/downloads',
      name: 'downloads',
      component: DownloadsView,
    },
    {
      path: '/linkgrabber',
      name: 'linkgrabber',
      component: () => import('@/views/LinkGrabberView.vue'),
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
    },
  ],
})

export default router
