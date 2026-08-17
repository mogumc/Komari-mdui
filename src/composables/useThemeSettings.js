import { ref, onMounted } from 'vue'
import { rpcCall } from '../utils/rpc'

const CACHE_KEY = 'komari_mdui_settings'

const settings = ref({})
const loading = ref(true)
let fetchPromise = null

function loadFromCache() {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      settings.value = JSON.parse(cached)
      loading.value = false
      return true
    }
  } catch {}
  return false
}

async function fetchSettings() {
  try {
    const data = await rpcCall('public:getPublicSettings')
    const raw = data.theme_settings || {}
    localStorage.setItem(CACHE_KEY, JSON.stringify(raw))
    settings.value = raw
  } catch {} finally {
    loading.value = false
    fetchPromise = null
  }
}

loadFromCache()

export function useThemeSettings() {
  onMounted(() => {
    if (!fetchPromise) {
      fetchPromise = fetchSettings()
    }
  })

  return { settings, loading }
}
