import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Converter from '../views/Converter.vue'
import About from '../views/About.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/converter',
    name: 'Converter',
    component: Converter
  },
  {
    path: '/about',
    name: 'About',
    component: About
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router