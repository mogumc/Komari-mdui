<template>
  <div class="home-page">
    <!-- Compact Toolbar: Stats + Group Filter in one row -->
    <div class="toolbar" v-if="nodes.length">
      <div class="toolbar-stats">
        <span class="stat-item">
          <mdui-icon name="dns" style="font-size:15px"></mdui-icon>
          {{ onlineCount }}/{{ nodes.length }} 在线
        </span>
        <span class="stat-sep">|</span>
        <span class="stat-item">↑{{ formatNetSpeed(totalNetOut) }}</span>
        <span class="stat-item">↓{{ formatNetSpeed(totalNetIn) }}</span>
      </div>
      <div class="toolbar-groups" v-if="groupList.length > 1">
        <button
          v-for="g in groupList"
          :key="g"
          class="group-btn"
          :class="{ active: activeGroup === g }"
          @click="activeGroup = g"
        >{{ g === '__all__' ? '全部' : g || '未分组' }}</button>
      </div>
    </div>

    <!-- Server Cards Grid -->
    <div class="card-grid" v-if="displayNodes.length">
      <mdui-card
        v-for="node in displayNodes"
        :key="node.uuid"
        class="server-card"
        clickable
        @click="goInstance(node.uuid)"
      >
        <!-- Card Header -->
        <div class="card-header">
          <div class="card-title-row">
            <span class="server-name">{{ node.name }}</span>
            <mdui-badge v-if="isOnline(node.uuid)" style="--mdui-badge-background:#e6f4ea;--mdui-badge-color:#34a853">
              在线
            </mdui-badge>
            <mdui-badge v-else style="--mdui-badge-background:#fce8e6;--mdui-badge-color:#ea4335">
              离线
            </mdui-badge>
          </div>
          <div class="card-meta">
            <span v-if="node.os"><mdui-icon name="computer" style="font-size:14px"></mdui-icon> {{ node.os }}</span>
            <span v-if="node.region"><mdui-icon name="location_on" style="font-size:14px"></mdui-icon> {{ node.region }}</span>
          </div>
          <div class="card-tags" v-if="getTags(node).length">
            <mdui-chip
              v-for="t in getTags(node)"
              :key="t"
              variant="outlined"
              style="--mdui-chip-outline-color:#e0e0e0;height:24px;font-size:0.75rem"
            >{{ t }}</mdui-chip>
          </div>
        </div>

        <!-- Card Body: Live Metrics -->
        <div class="card-body" v-if="liveData[node.uuid]">
          <div class="metric-row">
            <span class="metric-label">CPU</span>
            <mdui-linear-progress
              :value="cpuUsage(node.uuid)"
              :max="100"
              style="flex:1;--mdui-linear-progress-indicator-color:#1a73e8"
            ></mdui-linear-progress>
            <span class="metric-val">{{ cpuUsage(node.uuid) }}%</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">内存</span>
            <mdui-linear-progress
              :value="memUsage(node.uuid)"
              :max="100"
              style="flex:1;--mdui-linear-progress-indicator-color:#34a853"
            ></mdui-linear-progress>
            <span class="metric-val">{{ memUsage(node.uuid) }}%</span>
          </div>
        </div>
        <div class="card-body placeholder" v-else>
          <span class="no-data">{{ isOnline(node.uuid) ? '等待数据...' : '节点离线' }}</span>
        </div>

        <!-- Card Footer -->
        <div class="card-footer" v-if="liveData[node.uuid]">
          <span>
            <mdui-icon name="swap_vert" style="font-size:14px"></mdui-icon>
            ↑{{ formatNetSpeed(liveData[node.uuid].net_out) }}
            ↓{{ formatNetSpeed(liveData[node.uuid].net_in) }}
          </span>
          <span>
            <mdui-icon name="schedule" style="font-size:14px"></mdui-icon>
            {{ formatUptime(liveData[node.uuid].uptime) }}
          </span>
        </div>
      </mdui-card>
    </div>

    <div v-else-if="!nodes.length" class="empty-state">
      <mdui-icon name="dns" style="font-size:48px;color:#ccc"></mdui-icon>
      <p>暂无服务器数据</p>
    </div>

    <div v-else class="empty-state">
      <mdui-icon name="search_off" style="font-size:48px;color:#ccc"></mdui-icon>
      <p>没有匹配的节点</p>
    </div>

    <div style="height:40px"></div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { rpcCall, createRpcSocket } from '../utils/rpc'
import { formatBytes, formatNetSpeed, formatUptime } from '../utils/format'

const router = useRouter()
const nodes = ref([])
const liveData = reactive({})
const wsConnected = ref(false)
const activeGroup = ref('__all__')
let socket = null
let pollTimer = null

// Groups
const groupList = computed(() => {
  const set = new Set(['__all__'])
  for (const n of nodes.value) {
    const g = (n.group || '').trim()
    if (g) set.add(g)
  }
  return [...set]
})

// Filtered + sorted nodes
const displayNodes = computed(() => {
  let list = [...nodes.value]
  if (activeGroup.value !== '__all__') {
    list = list.filter(n => (n.group || '').trim() === activeGroup.value)
  }
  list.sort((a, b) => (a.weight ?? 0) - (b.weight ?? 0))
  // online first
  list.sort((a, b) => {
    const aOn = isOnline(a.uuid) ? 0 : 1
    const bOn = isOnline(b.uuid) ? 0 : 1
    return aOn - bOn
  })
  return list
})

// Stats
const onlineCount = computed(() => {
  return nodes.value.filter(n => isOnline(n.uuid)).length
})
const totalNetOut = computed(() => {
  return Object.values(liveData).reduce((s, d) => s + (d.online ? (d.net_out ?? 0) : 0), 0)
})
const totalNetIn = computed(() => {
  return Object.values(liveData).reduce((s, d) => s + (d.online ? (d.net_in ?? 0) : 0), 0)
})

watch(activeGroup, () => {})

onMounted(() => {
  fetchNodes()
  connectAndPoll()
})

onUnmounted(() => {
  if (socket) socket.close()
  if (pollTimer) clearInterval(pollTimer)
})

async function fetchNodes() {
  try {
    const data = await rpcCall('common:getNodes')
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      nodes.value = Object.values(data)
    } else if (Array.isArray(data)) {
      nodes.value = data
    }
  } catch {}
}

function connectAndPoll() {
  if (socket) socket.close()
  if (pollTimer) clearInterval(pollTimer)
  socket = createRpcSocket()

  const poll = () => {
    if (socket.readyState !== WebSocket.OPEN) return
    socket.call('common:getNodesLatestStatus', {}, 8000)
      .then(data => {
        wsConnected.value = true
        if (data && typeof data === 'object') {
          for (const [uuid, status] of Object.entries(data)) {
            liveData[uuid] = status
          }
        }
      })
      .catch(() => { wsConnected.value = false })
  }

  let attempts = 0
  const checkOpen = () => {
    if (socket.readyState === WebSocket.OPEN) {
      wsConnected.value = true
      poll()
      pollTimer = setInterval(poll, 3000)
    } else if (attempts < 30) {
      attempts++
      setTimeout(checkOpen, 300)
    } else {
      connectAndPoll()
    }
  }
  checkOpen()
}

function isOnline(uuid) {
  return liveData[uuid]?.online === true
}

function cpuUsage(uuid) {
  const d = liveData[uuid]
  if (!d) return 0
  return Math.min(100, Math.round(d.cpu ?? 0))
}

function memUsage(uuid) {
  const d = liveData[uuid]
  if (!d) return 0
  const used = d.ram ?? 0
  const total = d.ram_total ?? 0
  if (!total) return 0
  return Math.min(100, Math.round((used / total) * 100))
}

function getTags(node) {
  return (node.tags || '').split(';').map(t => t.trim()).filter(Boolean)
}

function goInstance(uuid) {
  router.push({ path: '/instance', query: { uuid } })
}
</script>

<style scoped>
.home-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px 16px;
}

/* Toolbar */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.toolbar-stats {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.82rem;
  color: #888;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

.stat-sep {
  color: #e0e0e0;
}

.toolbar-groups {
  display: flex;
  align-items: center;
  gap: 4px;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.toolbar-groups::-webkit-scrollbar {
  display: none;
}

.group-btn {
  padding: 4px 12px;
  border: 1px solid #e8e8e8;
  border-radius: 16px;
  background: #fff;
  color: #888;
  font-size: 0.8rem;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
  line-height: 1.5;
}

.group-btn:hover {
  color: #555;
  border-color: #ccc;
}

.group-btn.active {
  background: #f0f0f0;
  color: #1f1f1f;
  border-color: #ddd;
  font-weight: 500;
}

/* Card Grid */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.server-card {
  padding: 20px;
  border-radius: 12px;
  transition: box-shadow 0.2s, transform 0.2s;
}

.server-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  transform: translateY(-2px);
}

.card-header {
  margin-bottom: 16px;
}

.card-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.server-name {
  font-size: 1.05rem;
  font-weight: 600;
  color: #1f1f1f;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.card-meta {
  display: flex;
  gap: 12px;
  font-size: 0.82rem;
  color: #888;
  margin-bottom: 8px;
}

.card-meta span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

/* Card Body */
.card-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 12px;
}

.card-body.placeholder {
  align-items: center;
  padding: 12px 0;
}

.no-data {
  font-size: 0.85rem;
  color: #bbb;
}

.metric-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.metric-label {
  font-size: 0.8rem;
  color: #888;
  width: 32px;
  flex-shrink: 0;
}

.metric-val {
  font-size: 0.8rem;
  color: #555;
  width: 36px;
  text-align: right;
  flex-shrink: 0;
}

/* Card Footer */
.card-footer {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: #999;
  padding-top: 12px;
  border-top: 1px solid #f5f5f5;
}

.card-footer span {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 60px 0;
  color: #bbb;
}

.empty-state p {
  margin-top: 12px;
  font-size: 1rem;
}

@media (max-width: 700px) {
  .card-grid {
    grid-template-columns: 1fr;
  }
  .toolbar {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
