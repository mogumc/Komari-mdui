<template>
  <div id="app-root">
    <mdui-top-app-bar scroll-behavior="shadow">
      <mdui-top-app-bar-title>
        <router-link to="/" style="color:inherit;text-decoration:none;display:flex;align-items:center;gap:8px">
          <span style="font-weight:600">{{ siteName || 'Komari' }}</span>
        </router-link>
      </mdui-top-app-bar-title>
      <div style="flex:1"></div>
      <mdui-chip
        v-if="wsConnected"
        icon="check_circle"
        style="--mdui-chip-label-color: #34a853; margin-right: 8px"
      >在线</mdui-chip>
      <mdui-chip
        v-else
        icon="error"
        style="--mdui-chip-label-color: #ea4335; margin-right: 8px"
      >离线</mdui-chip>
      <mdui-button-icon icon="person" href="/admin" target="_blank"></mdui-button-icon>
    </mdui-top-app-bar>

    <main class="main-content">
      <router-view />
    </main>

    <footer class="app-footer">
      <span v-if="version">Komari {{ version }}</span>
      <span v-else>Komari</span>
      <span style="margin: 0 8px">·</span>
      <span>Komari-MDUI Theme</span>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { rpcCall } from './utils/rpc'

const siteName = ref('')
const version = ref('')

onMounted(async () => {
  try {
    const info = await rpcCall('common:getPublicInfo')
    if (info) siteName.value = info.sitename || ''
  } catch {}
  try {
    const ver = await rpcCall('common:getVersion')
    if (ver) version.value = ver.version || ''
  } catch {}
})
</script>

<style scoped>
#app-root {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  padding-top: 64px;
}

.app-footer {
  text-align: center;
  padding: 16px;
  font-size: 0.8rem;
  color: #999;
  border-top: 1px solid #f0f0f0;
}
</style>
