<template>
  <div class="home-page">
    <!-- Stats Bar -->
    <div class="stats-card" v-if="nodes.length">
      <div class="stats-grid">
        <div class="stat-cell">
          <div class="stat-cell-label">在线</div>
          <div class="stat-cell-val">{{ onlineCount }} / {{ nodes.length }}</div>
        </div>
        <div class="stat-cell">
          <div class="stat-cell-label">地区</div>
          <div class="stat-cell-val">{{ uniqueRegions }}</div>
        </div>
        <div class="stat-cell">
          <div class="stat-cell-label">流量</div>
          <div class="stat-cell-val">↑{{ formatBytes(totalTrafficUp) }}</div>
          <div class="stat-cell-val">↓{{ formatBytes(totalTrafficDown) }}</div>
        </div>
        <div class="stat-cell">
          <div class="stat-cell-label">网速</div>
          <div class="stat-cell-val">↑{{ formatNetSpeed(totalNetOut) }}/s</div>
          <div class="stat-cell-val">↓{{ formatNetSpeed(totalNetIn) }}/s</div>
        </div>
      </div>
    </div>

    <!-- Group Filter -->
    <div class="group-bar" v-if="groupList.length > 1">
      <span class="group-label">分组</span>
      <div class="toolbar-groups">
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
        :class="{ offline: !isOnline(node.uuid) }"
        clickable
        @click="goInstance(node.uuid)"
      >
        <!-- Card Header -->
        <div class="card-header">
          <div class="card-title-row">
            <span class="server-name">{{ node.name }}</span>
            <span class="status-dot" :class="isOnline(node.uuid) ? 'on' : 'off'"></span>
          </div>
        </div>

        <!-- Tags -->
        <div class="card-tags" v-if="getTags(node).length">
          <span class="tag-pill" v-for="t in getTags(node)" :key="t">{{ t }}</span>
        </div>

        <div class="card-sep"></div>

        <!-- HW Summary -->
        <div class="hw-summary" v-if="node.cpu_cores">
          <span><mdui-icon name="memory" style="font-size:13px;color:#1a73e8"></mdui-icon> {{ node.cpu_cores }}核</span>
          <span><mdui-icon name="sd_storage" style="font-size:13px;color:#34a853"></mdui-icon> {{ formatBytes(node.mem_total) }}</span>
          <span><mdui-icon name="storage" style="font-size:13px;color:#fbbc04"></mdui-icon> {{ formatBytes(node.disk_total) }}</span>
        </div>

        <!-- Progress Bars -->
        <div class="card-metrics" v-if="liveData[node.uuid]">
          <div class="pbar-row">
            <span class="pbar-label">CPU</span>
            <div class="pbar-track"><div class="pbar-fill" :style="{ width: cpuUsage(node.uuid) + '%', background: barColor(cpuUsage(node.uuid)) }"></div></div>
            <span class="pbar-val">{{ cpuUsage(node.uuid) }}%</span>
          </div>
          <div class="pbar-row">
            <span class="pbar-label">内存</span>
            <div class="pbar-track"><div class="pbar-fill" :style="{ width: memUsage(node.uuid) + '%', background: barColor(memUsage(node.uuid)) }"></div></div>
            <span class="pbar-val">{{ memUsage(node.uuid) }}%</span>
          </div>
          <div class="pbar-row" v-if="node.swap_total > 0">
            <span class="pbar-label">Swap</span>
            <div class="pbar-track"><div class="pbar-fill" :style="{ width: swapUsage(node.uuid) + '%', background: barColor(swapUsage(node.uuid)) }"></div></div>
            <span class="pbar-val">{{ swapUsage(node.uuid) }}%</span>
          </div>
          <div class="pbar-row">
            <span class="pbar-label">磁盘</span>
            <div class="pbar-track"><div class="pbar-fill" :style="{ width: diskUsage(node.uuid) + '%', background: barColor(diskUsage(node.uuid)) }"></div></div>
            <span class="pbar-val">{{ diskUsage(node.uuid) }}%</span>
          </div>
        </div>
        <div class="card-metrics placeholder" v-else>
          <span class="no-data">{{ isOnline(node.uuid) ? '等待数据...' : '节点离线' }}</span>
        </div>

        <div class="card-sep"></div>

        <!-- Bottom info rows -->
        <div class="info-rows" v-if="liveData[node.uuid]">
          <div class="info-row">
            <span class="info-key">网络</span>
            <span class="info-val">↑{{ formatNetSpeed(liveData[node.uuid].net_out) }}/s ↓{{ formatNetSpeed(liveData[node.uuid].net_in) }}/s</span>
          </div>
          <div class="info-row">
            <span class="info-key">负载</span>
            <span class="info-val">{{ loadStr(node.uuid) }}</span>
          </div>
          <div class="info-row">
            <span class="info-key">到期</span>
            <span class="info-val">{{ expireStr(node) }}</span>
            <span class="info-sep">|</span>
            <span class="info-key">运行</span>
            <span class="info-val">{{ isOnline(node.uuid) ? formatUptime(liveData[node.uuid].uptime) : '离线' }}</span>
          </div>
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
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { rpcCall, createRpcSocket } from '../utils/rpc'
import { formatBytes, formatNetSpeed, formatUptime, remainingDays } from '../utils/format'

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
  list.sort((a, b) => {
    const aOn = isOnline(a.uuid) ? 0 : 1
    const bOn = isOnline(b.uuid) ? 0 : 1
    return aOn - bOn
  })
  return list
})

// Stats
const onlineCount = computed(() => nodes.value.filter(n => isOnline(n.uuid)).length)
const uniqueRegions = computed(() => {
  const set = new Set()
  for (const n of nodes.value) { if (n.region) set.add(n.region) }
  return set.size
})
const totalNetOut = computed(() => Object.values(liveData).reduce((s, d) => s + (d.online ? (d.net_out ?? 0) : 0), 0))
const totalNetIn = computed(() => Object.values(liveData).reduce((s, d) => s + (d.online ? (d.net_in ?? 0) : 0), 0))
const totalTrafficUp = computed(() => Object.values(liveData).reduce((s, d) => s + (d.online ? (d.net_total_up ?? 0) : 0), 0))
const totalTrafficDown = computed(() => Object.values(liveData).reduce((s, d) => s + (d.online ? (d.net_total_down ?? 0) : 0), 0))

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

function isOnline(uuid) { return liveData[uuid]?.online === true }

function cpuUsage(uuid) {
  const d = liveData[uuid]
  return d ? Math.min(100, Math.round(d.cpu ?? 0)) : 0
}

function memUsage(uuid) {
  const d = liveData[uuid]
  if (!d || !d.ram_total) return 0
  return Math.min(100, Math.round((d.ram / d.ram_total) * 100))
}

function swapUsage(uuid) {
  const d = liveData[uuid]
  if (!d || !d.swap_total) return 0
  return Math.min(100, Math.round((d.swap / d.swap_total) * 100))
}

function diskUsage(uuid) {
  const d = liveData[uuid]
  if (!d || !d.disk_total) return 0
  return Math.min(100, Math.round((d.disk / d.disk_total) * 100))
}

function barColor(pct) {
  if (pct <= 50) return '#34a853'
  if (pct <= 90) return '#fbbc04'
  return '#ea4335'
}

function loadStr(uuid) {
  const d = liveData[uuid]
  if (!d) return '-'
  return `${(d.load ?? 0).toFixed(2)} | ${(d.load5 ?? 0).toFixed(2)} | ${(d.load15 ?? 0).toFixed(2)}`
}

function expireStr(node) {
  if (!node.expired_at) return '-'
  const days = remainingDays(node.expired_at)
  if (days === null || days > 36500) return '长期'
  if (days <= 0) return `过期${Math.abs(days)}天`
  return `${days}天`
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
  padding: 16px;
}

/* Stats Card */
.stats-card {
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 12px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 8px;
  text-align: center;
}

.stat-cell-label {
  font-size: 0.75rem;
  color: #999;
  margin-bottom: 2px;
}

.stat-cell-val {
  font-size: 0.85rem;
  color: #1f1f1f;
  font-weight: 500;
  line-height: 1.4;
}

/* Group Bar */
.group-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding: 8px 12px;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 10px;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.group-bar::-webkit-scrollbar { display: none; }

.group-label {
  font-size: 0.8rem;
  color: #888;
  flex-shrink: 0;
}

.toolbar-groups {
  display: flex;
  align-items: center;
  gap: 4px;
  overflow-x: auto;
  scrollbar-width: none;
}

.toolbar-groups::-webkit-scrollbar { display: none; }

.group-btn {
  padding: 3px 10px;
  border: 1px solid #e8e8e8;
  border-radius: 14px;
  background: #fff;
  color: #888;
  font-size: 0.78rem;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}

.group-btn:hover { color: #555; border-color: #ccc; }
.group-btn.active { background: #f0f0f0; color: #1f1f1f; border-color: #ddd; font-weight: 500; }

/* Card Grid */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr));
  gap: 16px;
}

.server-card {
  padding: 16px;
  border-radius: 10px;
  transition: box-shadow 0.2s;
}

.server-card:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.server-card.offline {
  opacity: 0.7;
}

/* Card Header */
.card-header { margin-bottom: 8px; }

.card-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.server-name {
  font-size: 1rem;
  font-weight: 600;
  color: #1f1f1f;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-dot.on { background: #34a853; }
.status-dot.off { background: #ea4335; }

/* Tags */
.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
}

.tag-pill {
  font-size: 0.7rem;
  padding: 1px 8px;
  border-radius: 10px;
  background: #f5f5f5;
  color: #888;
  border: 1px solid #eee;
}

/* Separator */
.card-sep {
  height: 1px;
  background: #f0f0f0;
  margin: 8px 0;
}

/* HW Summary */
.hw-summary {
  display: flex;
  justify-content: space-around;
  font-size: 0.78rem;
  color: #888;
  margin-bottom: 4px;
}

.hw-summary span {
  display: flex;
  align-items: center;
  gap: 3px;
}

/* Progress Bars */
.card-metrics {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.card-metrics.placeholder {
  align-items: center;
  padding: 8px 0;
}

.no-data {
  font-size: 0.82rem;
  color: #bbb;
}

.pbar-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.pbar-label {
  font-size: 0.78rem;
  color: #888;
  width: 30px;
  flex-shrink: 0;
}

.pbar-track {
  flex: 1;
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
}

.pbar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease, background 0.3s;
}

.pbar-val {
  font-size: 0.78rem;
  color: #555;
  width: 32px;
  text-align: right;
  flex-shrink: 0;
}

/* Info Rows */
.info-rows {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  color: #999;
}

.info-key {
  color: #aaa;
  flex-shrink: 0;
}

.info-val {
  color: #666;
}

.info-sep {
  color: #e0e0e0;
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
  .card-grid { grid-template-columns: 1fr; }
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
