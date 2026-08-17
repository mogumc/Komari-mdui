import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import 'mdui/mdui.css'
import '@fontsource/material-icons/index.css'
import 'mdui'
import App from './App.vue'
import Home from './views/Home.vue'
import Instance from './views/Instance.vue'
import './style.css'

const routes = [
  { path: '/', component: Home },
  { path: '/instance', component: Instance }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

createApp(App).use(router).mount('#app')
