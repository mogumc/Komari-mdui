export function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return '0 B'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB'
  if (bytes < 1099511627776) return (bytes / 1073741824).toFixed(2) + ' GB'
  return (bytes / 1099511627776).toFixed(2) + ' TB'
}

export function formatUptime(seconds) {
  if (!seconds) return '-'
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  if (days > 0) return `${days}天${hours}时${mins}分`
  return `${hours}时${mins}分`
}

export function formatNetSpeed(bytesPerSec) {
  if (!bytesPerSec) return '0 B/s'
  return formatBytes(bytesPerSec) + '/s'
}

export function remainingDays(expireStr) {
  if (!expireStr) return null
  const d = new Date(expireStr)
  return Math.ceil((d - Date.now()) / 86400000)
}

// SVG chart path generators
export function chartLine(arr, maxVal, w, h) {
  if (!arr.length) return ''
  if (arr.length < 2) return `M0 ${h} L${w} ${h}`
  const step = w / (arr.length - 1)
  return arr.map((v, i) => {
    const x = (i * step).toFixed(1)
    const y = (h - Math.min(1, v / (maxVal || 1)) * h).toFixed(1)
    return `${i === 0 ? 'M' : 'L'}${x} ${y}`
  }).join(' ')
}

export function chartArea(arr, maxVal, w, h) {
  if (!arr.length) return ''
  if (arr.length < 2) return `M0 ${h} L${w} ${h} L${w} ${h} L0 ${h} Z`
  const step = w / (arr.length - 1)
  const pts = arr.map((v, i) => {
    const x = (i * step).toFixed(1)
    const y = (h - Math.min(1, v / (maxVal || 1)) * h).toFixed(1)
    return `L${x} ${y}`
  }).join(' ').replace(/^L/, 'M')
  return `${pts} L${w.toFixed(1)},${h.toFixed(1)} L0,${h.toFixed(1)} Z`
}
