<template>
  <div id="app-root">
    <header class="top-bar">
      <router-link to="/" class="top-bar-title">
        <span>{{ siteName || 'Komari' }}</span>
      </router-link>
      <div style="flex:1"></div>
      <span class="ws-status" :class="wsConnected ? 'on' : 'off'">
        <span class="ws-dot"></span>
        {{ wsConnected ? '在线' : '离线' }}
      </span>
      <mdui-button-icon icon="person" href="/admin" target="_blank"></mdui-button-icon>
    </header>

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
import { ref, provide, onMounted, onUnmounted, watch } from 'vue'
import { rpcCall } from './utils/rpc'
import { useThemeSettings } from './composables/useThemeSettings'

const siteName = ref('')
const version = ref('')
const wsConnected = ref(false)
let statusTimer = null

const { settings } = useThemeSettings()

provide('wsConnected', wsConnected)

watch(() => settings.value.backgroundImage, (url) => {
  if (url) {
    document.body.style.backgroundImage = `url(${url})`
    document.body.style.backgroundSize = 'cover'
    document.body.style.backgroundPosition = 'center'
    document.body.style.backgroundAttachment = 'fixed'
  } else {
    document.body.style.backgroundImage = ''
    document.body.style.backgroundSize = ''
    document.body.style.backgroundPosition = ''
    document.body.style.backgroundAttachment = ''
  }
}, { immediate: true })

onMounted(async () => {
  try {
    const info = await rpcCall('common:getPublicInfo')
    if (info) siteName.value = info.sitename || ''
  } catch {}
  try {
    const ver = await rpcCall('common:getVersion')
    if (ver) version.value = ver.version || ''
  } catch {}
  checkStatus()
  statusTimer = setInterval(checkStatus, 5000)
})

onUnmounted(() => {
  if (statusTimer) clearInterval(statusTimer)
})

async function checkStatus() {
  try {
    await rpcCall('common:getVersion')
    wsConnected.value = true
  } catch {
    wsConnected.value = false
  }
}
</script>

<style scoped>
#app-root {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.top-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  height: 52px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  background: #ffffff;
  border-bottom: 1px solid #f0f0f0;
  gap: 8px;
}

.top-bar-title {
  font-size: 1.05rem;
  font-weight: 600;
  color: #1f1f1f;
  text-decoration: none;
}

.ws-status {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.8rem;
  color: #999;
  margin-right: 4px;
}

.ws-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  display: inline-block;
}

.ws-status.on .ws-dot {
  background: #34a853;
}

.ws-status.off .ws-dot {
  background: #ea4335;
}

.main-content {
  flex: 1;
  padding-top: 52px;
}

.app-footer {
  text-align: center;
  padding: 16px;
  font-size: 0.8rem;
  color: #999;
  border-top: 1px solid #f0f0f0;
}
</style>
