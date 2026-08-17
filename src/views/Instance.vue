<template>
  <div class="instance-page">
    <!-- Back Header -->
    <div class="page-header">
      <router-link to="/" style="display:flex;align-items:center;gap:4px;color:#1a73e8">
        <mdui-icon name="arrow_back"></mdui-icon>
        <span style="font-size:0.9rem">返回</span>
      </router-link>
      <span class="header-title">{{ nodeName || '服务器详情' }}</span>
      <mdui-badge
        v-if="metrics"
        :style="online ? '--mdui-badge-background:#e6f4ea;--mdui-badge-color:#34a853' : '--mdui-badge-background:#fce8e6;--mdui-badge-color:#ea4335'"
      >{{ online ? '在线' : '离线' }}</mdui-badge>
    </div>

    <!-- Hardware Info Cards -->
    <div class="hw-grid" v-if="nodeInfo.cpu_name">
      <mdui-card class="hw-card" variant="filled">
        <mdui-icon name="memory" style="color:#1a73e8;font-size:20px"></mdui-icon>
        <div class="hw-text">
          <div class="hw-label">处理器</div>
          <div class="hw-value">{{ nodeInfo.cpu_name }}</div>
          <div class="hw-sub">{{ nodeInfo.cpu_cores || 0 }} 核心</div>
        </div>
      </mdui-card>
      <mdui-card class="hw-card" variant="filled">
        <mdui-icon name="laptop" style="color:#34a853;font-size:20px"></mdui-icon>
        <div class="hw-text">
          <div class="hw-label">系统</div>
          <div class="hw-value">{{ nodeInfo.os || '-' }}</div>
          <div class="hw-sub">{{ nodeInfo.arch || '-' }}</div>
        </div>
      </mdui-card>
      <mdui-card class="hw-card" variant="filled" v-if="nodeInfo.gpu_name">
        <mdui-icon name="videogame_asset" style="color:#fbbc04;font-size:20px"></mdui-icon>
        <div class="hw-text">
          <div class="hw-label">GPU</div>
          <div class="hw-value">{{ nodeInfo.gpu_name }}</div>
        </div>
      </mdui-card>
    </div>

    <!-- Real-time Charts -->
    <div class="chart-grid" v-if="metrics">
      <!-- CPU Chart -->
      <mdui-card class="chart-card">
        <div class="chart-header">
          <div class="chart-title">
            <mdui-icon name="memory" style="font-size:18px;color:#1a73e8"></mdui-icon>
            CPU
          </div>
          <span class="chart-pct" style="color:#1a73e8">{{ cpuPercent }}%</span>
        </div>
        <div class="chart-svg">
          <svg viewBox="0 0 200 60" preserveAspectRatio="none">
            <defs>
              <linearGradient id="cpuG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#1a73e8" stop-opacity="0.15"/>
                <stop offset="100%" stop-color="#1a73e8" stop-opacity="0.01"/>
              </linearGradient>
            </defs>
            <path :d="chartArea(history.cpu, 100, 200, 60)" fill="url(#cpuG)"/>
            <path :d="chartLine(history.cpu, 100, 200, 60)" fill="none" stroke="#1a73e8" stroke-width="1.5"/>
          </svg>
        </div>
        <div class="chart-sub">{{ nodeInfo.cpu_name || '' }}</div>
      </mdui-card>

      <!-- Memory Chart -->
      <mdui-card class="chart-card">
        <div class="chart-header">
          <div class="chart-title">
            <mdui-icon name="sd_storage" style="font-size:18px;color:#34a853"></mdui-icon>
            内存
          </div>
          <span class="chart-pct" style="color:#34a853">{{ memPercent }}%</span>
        </div>
        <div class="chart-svg">
          <svg viewBox="0 0 200 60" preserveAspectRatio="none">
            <defs>
              <linearGradient id="memG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#34a853" stop-opacity="0.15"/>
                <stop offset="100%" stop-color="#34a853" stop-opacity="0.01"/>
              </linearGradient>
            </defs>
            <path :d="chartArea(history.mem, 100, 200, 60)" fill="url(#memG)"/>
            <path :d="chartLine(history.mem, 100, 200, 60)" fill="none" stroke="#34a853" stroke-width="1.5"/>
          </svg>
        </div>
        <div class="chart-sub">{{ formatBytes(memUsed) }} / {{ formatBytes(memTotal) }}</div>
      </mdui-card>

      <!-- Disk Chart -->
      <mdui-card class="chart-card">
        <div class="chart-header">
          <div class="chart-title">
            <mdui-icon name="storage" style="font-size:18px;color:#fbbc04"></mdui-icon>
            磁盘
          </div>
          <span class="chart-pct" style="color:#fbbc04">{{ diskPercent }}%</span>
        </div>
        <div class="chart-svg">
          <svg viewBox="0 0 200 60" preserveAspectRatio="none">
            <defs>
              <linearGradient id="diskG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#fbbc04" stop-opacity="0.2"/>
                <stop offset="100%" stop-color="#fbbc04" stop-opacity="0.01"/>
              </linearGradient>
            </defs>
            <path :d="chartArea(history.disk, 100, 200, 60)" fill="url(#diskG)"/>
            <path :d="chartLine(history.disk, 100, 200, 60)" fill="none" stroke="#fbbc04" stroke-width="1.5"/>
          </svg>
        </div>
        <div class="chart-sub">{{ formatBytes(diskUsed) }} / {{ formatBytes(diskTotal) }}</div>
      </mdui-card>

      <!-- Network Chart -->
      <mdui-card class="chart-card">
        <div class="chart-header">
          <div class="chart-title">
            <mdui-icon name="swap_vert" style="font-size:18px;color:#1a73e8"></mdui-icon>
            网络
          </div>
          <div class="net-legend">
            <span style="color:#1a73e8">↑ {{ formatNetSpeed(netTx) }}</span>
            <span style="color:#34a853">↓ {{ formatNetSpeed(netRx) }}</span>
          </div>
        </div>
        <div class="chart-svg">
          <svg viewBox="0 0 200 60" preserveAspectRatio="none">
            <defs>
              <linearGradient id="netTxG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#1a73e8" stop-opacity="0.1"/>
                <stop offset="100%" stop-color="#1a73e8" stop-opacity="0.01"/>
              </linearGradient>
              <linearGradient id="netRxG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#34a853" stop-opacity="0.15"/>
                <stop offset="100%" stop-color="#34a853" stop-opacity="0.01"/>
              </linearGradient>
            </defs>
            <path :d="chartArea(history.netTx, netMax, 200, 60)" fill="url(#netTxG)"/>
            <path :d="chartLine(history.netTx, netMax, 200, 60)" fill="none" stroke="#1a73e8" stroke-width="1.5"/>
            <path :d="chartArea(history.netRx, netMax, 200, 60)" fill="url(#netRxG)"/>
            <path :d="chartLine(history.netRx, netMax, 200, 60)" fill="none" stroke="#34a853" stroke-width="1.5"/>
          </svg>
        </div>
        <div class="chart-sub">TCP: {{ connections.tcp }} · UDP: {{ connections.udp }}</div>
      </mdui-card>

      <!-- Process Chart -->
      <mdui-card class="chart-card">
        <div class="chart-header">
          <div class="chart-title">
            <mdui-icon name="hub" style="font-size:18px;color:#ea4335"></mdui-icon>
            进程
          </div>
          <span class="chart-pct" style="color:#ea4335">{{ processes }}</span>
        </div>
        <div class="chart-svg">
          <svg viewBox="0 0 200 60" preserveAspectRatio="none">
            <defs>
              <linearGradient id="procG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#ea4335" stop-opacity="0.15"/>
                <stop offset="100%" stop-color="#ea4335" stop-opacity="0.01"/>
              </linearGradient>
            </defs>
            <path :d="chartArea(history.proc, procMax, 200, 60)" fill="url(#procG)"/>
            <path :d="chartLine(history.proc, procMax, 200, 60)" fill="none" stroke="#ea4335" stroke-width="1.5"/>
          </svg>
        </div>
        <div class="chart-sub">
          Load: {{ loadAvg[0] }} / {{ loadAvg[1] }} / {{ loadAvg[2] }}
        </div>
      </mdui-card>

      <!-- Uptime -->
      <mdui-card class="chart-card">
        <div class="chart-header">
          <div class="chart-title">
            <mdui-icon name="schedule" style="font-size:18px;color:#9c27b0"></mdui-icon>
            运行时间
          </div>
        </div>
        <div style="flex:1;display:flex;align-items:center;justify-content:center">
          <span style="font-size:1.3rem;font-weight:600;color:#1f1f1f">{{ uptimeStr }}</span>
        </div>
        <div class="chart-sub" v-if="remainDays">{{ remainDays }}</div>
      </mdui-card>
    </div>

    <div v-else class="empty-state">
      <mdui-circular-progress indeterminate></mdui-circular-progress>
      <p>正在获取数据...</p>
    </div>

    <!-- Ping Heatmap -->
    <div class="ping-section" v-if="heatmapData.rows.length">
      <div class="section-header">
        <span class="section-title">
          <mdui-icon name="monitoring" style="font-size:20px"></mdui-icon>
          延迟监控
        </span>
        <div class="time-btns">
          <button class="time-btn" :class="{ active: pingHours === 1 }" @click="changePingHours(1)">1h</button>
          <button class="time-btn" :class="{ active: pingHours === 6 }" @click="changePingHours(6)">6h</button>
          <button class="time-btn" :class="{ active: pingHours === 24 }" @click="changePingHours(24)">24h</button>
        </div>
      </div>
      <div class="ping-grid" :class="{ loading: pingLoading }">
        <mdui-card v-for="row in heatmapData.rows" :key="row.name" class="ping-card">
          <div class="ping-task-name">{{ row.name }}</div>
          <div class="heatmap">
            <div class="heatmap-bars">
              <div
                v-for="(cell, ci) in row.cells"
                :key="ci"
                class="heatmap-bar-wrap"
                :title="cell.value !== null ? cell.value + 'ms' : '无数据'"
              >
                <div class="heatmap-bar" :style="{ height: cell.height + '%', background: cell.color }"></div>
              </div>
            </div>
            <div class="heatmap-stats">
              <span>最高 {{ row.stats.max }}ms</span>
              <span>最低 {{ row.stats.min }}ms</span>
              <span>平均 {{ row.stats.avg }}ms</span>
            </div>
          </div>
        </mdui-card>
      </div>
    </div>

    <div style="height:60px"></div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { rpcCall, createRpcSocket } from '../utils/rpc'
import { formatBytes, formatNetSpeed, formatUptime, remainingDays, chartLine, chartArea } from '../utils/format'

const route = useRoute()
const uuid = route.query.uuid || ''
const nodeName = ref('')
const nodeInfo = ref({})
const metrics = ref(null)
const online = ref(false)

let socket = null
let pollTimer = null

// Ping state
const pingTasks = ref([])
const pingHours = ref(1)
const pingLoading = ref(false)
const pingCache = ref({})

onMounted(() => {
  fetchNodeInfo()
  fetchRecent()
  connectAndPoll()
  fetchPingData()
})

onUnmounted(() => {
  if (socket) socket.close()
  if (pollTimer) clearInterval(pollTimer)
})

async function fetchNodeInfo() {
  if (!uuid) return
  try {
    const node = await rpcCall('common:getNodes', { uuid })
    if (node) {
      nodeName.value = node.name || ''
      nodeInfo.value = node
    }
  } catch {}
}

async function fetchRecent() {
  if (!uuid) return
  try {
    const data = await rpcCall('common:getNodeRecentStatus', { uuid })
    if (data.records && data.records.length) {
      const latest = data.records[data.records.length - 1]
      metrics.value = latest
      online.value = true
      pushHistory()
    }
  } catch {}
}

function connectAndPoll() {
  if (!uuid) return
  if (socket) socket.close()
  if (pollTimer) clearInterval(pollTimer)
  socket = createRpcSocket()

  const poll = () => {
    if (socket.readyState !== WebSocket.OPEN) return
    socket.call('common:getNodesLatestStatus', { uuid }, 8000)
      .then(data => {
        const status = data && data.online !== undefined ? data : (data && data[uuid])
        if (status) {
          metrics.value = status
          online.value = status.online === true
          pushHistory()
        }
      })
      .catch(() => {})
  }

  let attempts = 0
  const checkOpen = () => {
    if (socket.readyState === WebSocket.OPEN) {
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

async function fetchPingData() {
  if (!uuid) return
  try {
    const tasks = await rpcCall('public:getPublicPingTasks')
    if (!Array.isArray(tasks)) return
    const relevant = tasks.filter(t => t.clients && t.clients.includes(uuid))
    if (!relevant.length) return
    await fetchPingRecords(relevant)
  } catch {}
}

async function fetchPingRecords(tasks) {
  const results = await Promise.all(
    tasks.map(async (task) => {
      try {
        const data = await rpcCall('public:getPingRecords', {
          uuid,
          task_id: String(task.id),
          hours: String(pingHours.value)
        })
        const records = (data.records || []).map(r => ({
          value: r.value,
          time: r.created_at || r.time || ''
        }))
        return { id: task.id, name: task.name, records }
      } catch {
        return { id: task.id, name: task.name, records: [] }
      }
    })
  )
  pingTasks.value = results
}

async function changePingHours(h) {
  if (pingLoading.value) return
  pingHours.value = h
  if (pingCache.value[h]) {
    pingTasks.value = pingCache.value[h]
    return
  }
  pingLoading.value = true
  await fetchPingData()
  pingCache.value[h] = pingTasks.value
  pingLoading.value = false
}

// ====== Computed Metrics ======
const cpuPercent = computed(() => Math.min(100, Math.round(metrics.value?.cpu ?? 0)))
const memUsed = computed(() => metrics.value?.ram ?? 0)
const memTotal = computed(() => metrics.value?.ram_total ?? 0)
const memPercent = computed(() => memTotal.value ? Math.round((memUsed.value / memTotal.value) * 100) : 0)
const diskUsed = computed(() => metrics.value?.disk ?? 0)
const diskTotal = computed(() => metrics.value?.disk_total ?? 0)
const diskPercent = computed(() => diskTotal.value ? Math.round((diskUsed.value / diskTotal.value) * 100) : 0)
const netRx = computed(() => metrics.value?.net_in ?? 0)
const netTx = computed(() => metrics.value?.net_out ?? 0)
const connections = computed(() => ({
  tcp: metrics.value?.connections ?? 0,
  udp: metrics.value?.connections_udp ?? 0
}))
const processes = computed(() => metrics.value?.process ?? 0)

const netMax = computed(() => {
  const vals = [...history.netRx, ...history.netTx]
  if (!vals.length) return 1000
  const raw = Math.max(...vals)
  return raw > 0 ? raw * 1.3 : 1000
})

const procMax = computed(() => {
  if (!history.proc.length) return 120
  const max = Math.max(...history.proc, 1)
  return Math.max(120, max * 1.3)
})

const loadAvg = computed(() => {
  if (!metrics.value) return ['-', '-', '-']
  return [
    (metrics.value.load ?? 0).toFixed(2),
    (metrics.value.load5 ?? 0).toFixed(2),
    (metrics.value.load15 ?? 0).toFixed(2)
  ]
})

const uptimeStr = computed(() => {
  const up = metrics.value?.uptime ?? 0
  if (!up) return '-'
  const days = Math.floor(up / 86400)
  const hours = Math.floor((up % 86400) / 3600)
  const mins = Math.floor((up % 3600) / 60)
  if (days > 0) return `${days}天 ${hours}时 ${mins}分`
  return `${hours}时 ${mins}分`
})

const remainDays = computed(() => {
  if (!nodeInfo.value?.expired_at) return null
  const days = remainingDays(nodeInfo.value.expired_at)
  if (days === null || days === -1 || days > 36500) return null
  if (days <= 0) return `已过期 ${Math.abs(days)} 天`
  return `${days} 天到期`
})

// ====== Chart History ======
const MAX_POINTS = 60
const history = reactive({
  cpu: [], mem: [], disk: [],
  netRx: [], netTx: [], proc: []
})

function pushHistory() {
  if (!metrics.value) return
  const m = metrics.value
  const push = (arr, v) => { arr.push(v); if (arr.length > MAX_POINTS) arr.shift() }
  push(history.cpu, Math.min(100, m.cpu ?? 0))
  push(history.mem, memPercent.value)
  push(history.disk, diskPercent.value)
  push(history.netRx, m.net_in ?? 0)
  push(history.netTx, m.net_out ?? 0)
  push(history.proc, m.process ?? 0)
}

// ====== Ping Heatmap ======
const PING_BAR_MAX = 300

function heatCellColor(val) {
  if (val < 0) return '#e0e0e0'
  if (val <= 30)  return '#34a853'
  if (val <= 80)  return '#8bc34a'
  if (val <= 150) return '#fbbc04'
  if (val <= 300) return '#ff9800'
  return '#ea4335'
}

function pingStats(cells) {
  const vals = cells.map(c => c.value).filter(v => v !== null)
  if (!vals.length) return { avg: '-', min: '-', max: '-' }
  return {
    avg: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
    min: Math.min(...vals),
    max: Math.max(...vals)
  }
}

const heatmapData = computed(() => {
  if (!pingTasks.value.length) return { rows: [] }
  const now = Date.now()
  const hours = pingHours.value
  const bucketMs = hours <= 1 ? 5 * 60000 : hours <= 6 ? 30 * 60000 : 60 * 60000
  const bucketCount = Math.ceil((hours * 3600000) / bucketMs)

  const rows = pingTasks.value.map(task => {
    const buckets = new Array(bucketCount).fill(null).map(() => ({ sum: 0, count: 0 }))
    for (const r of task.records) {
      const t = new Date(r.time).getTime()
      const idx = Math.floor((t - (now - hours * 3600000)) / bucketMs)
      if (idx >= 0 && idx < bucketCount && r.value >= 0) {
        buckets[idx].sum += r.value
        buckets[idx].count++
      }
    }
    const cells = buckets.map(b => {
      if (b.count === 0) return { value: null, height: 2, color: '#f5f5f5' }
      const avg = Math.round(b.sum / b.count)
      const h = Math.min(100, Math.max(3, (avg / PING_BAR_MAX) * 100))
      return { value: avg, height: h, color: heatCellColor(avg) }
    })
    return { name: task.name, cells, stats: pingStats(cells) }
  })
  return { rows }
})
</script>

<style scoped>
.instance-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px 16px;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  padding: 12px 16px;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #f0f0f0;
}

.header-title {
  flex: 1;
  font-size: 1.2rem;
  font-weight: 600;
  text-align: center;
  color: #1f1f1f;
}

/* Hardware Info */
.hw-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}

.hw-card {
  padding: 16px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  border-radius: 12px;
}

.hw-text {
  min-width: 0;
  overflow: hidden;
  flex: 1;
}

.hw-label {
  font-size: 0.78rem;
  color: #999;
  margin-bottom: 2px;
}

.hw-value {
  font-size: 0.95rem;
  font-weight: 600;
  color: #1f1f1f;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hw-sub {
  font-size: 0.78rem;
  color: #999;
  margin-top: 2px;
}

/* Chart Grid */
.chart-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.chart-card {
  padding: 16px;
  display: flex;
  flex-direction: column;
  min-height: 160px;
  border-radius: 12px;
}

.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.chart-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  color: #555;
}

.chart-pct {
  font-size: 1.1rem;
  font-weight: 600;
}

.net-legend {
  display: flex;
  gap: 12px;
  font-size: 0.82rem;
  font-weight: 500;
}

.chart-svg {
  flex: 1;
  min-height: 10px;
}

.chart-svg svg {
  width: 100%;
  height: 60px;
}

.chart-sub {
  font-size: 0.78rem;
  color: #999;
  margin-top: 8px;
}

/* Empty */
.empty-state {
  text-align: center;
  padding: 60px 0;
  color: #bbb;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

/* Ping Section */
.ping-section {
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  color: #1f1f1f;
}

.time-btns {
  display: flex;
  gap: 4px;
}

.time-btn {
  padding: 4px 12px;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  background: #fff;
  color: #888;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.15s;
}

.time-btn:hover {
  color: #555;
  border-color: #ccc;
}

.time-btn.active {
  background: #f0f0f0;
  color: #1a73e8;
  border-color: #d0d0d0;
}

.ping-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 12px;
}

.ping-grid.loading {
  opacity: 0.5;
  pointer-events: none;
}

.ping-card {
  padding: 16px;
  border-radius: 12px;
}

.ping-task-name {
  font-weight: 600;
  font-size: 0.9rem;
  color: #1f1f1f;
  margin-bottom: 12px;
}

.heatmap-bars {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 48px;
  margin-bottom: 8px;
}

.heatmap-bar-wrap {
  flex: 1;
  min-width: 2px;
  height: 100%;
  display: flex;
  align-items: flex-end;
}

.heatmap-bar {
  width: 100%;
  border-radius: 1px 1px 0 0;
  min-height: 2px;
  transition: transform 0.15s ease;
}

.heatmap-bar:hover {
  transform: scaleY(1.3);
  transform-origin: bottom;
}

.heatmap-stats {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #999;
  padding-top: 8px;
  border-top: 1px solid #f5f5f5;
}

@media (max-width: 700px) {
  .chart-grid {
    grid-template-columns: 1fr;
  }
  .hw-grid {
    grid-template-columns: 1fr;
  }
}
</style>
