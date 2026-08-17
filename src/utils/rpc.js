// JSON-RPC 2.0 client for Komari RPC2 interface

let requestId = 0

/**
 * HTTP POST mode: single JSON-RPC request
 */
export function rpcCall(method, params = {}) {
  const id = ++requestId
  return fetch('/api/rpc2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id })
  })
    .then(r => r.json())
    .then(data => {
      if (data.error) throw new Error(data.error.message || 'RPC error')
      return data.result
    })
}

/**
 * WebSocket mode: persistent connection with request-response matching
 */
export function createRpcSocket() {
  let innerId = 0
  const pending = new Map()

  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
  const ws = new WebSocket(`${protocol}//${location.host}/api/rpc2`)

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      if (data.id && pending.has(data.id)) {
        const { resolve, reject } = pending.get(data.id)
        pending.delete(data.id)
        if (data.error) reject(new Error(data.error.message || 'RPC error'))
        else resolve(data.result)
      }
    } catch {}
  }

  return {
    call(method, params = {}, timeout = 10000) {
      return new Promise((resolve, reject) => {
        const id = ++innerId
        pending.set(id, { resolve, reject })
        ws.send(JSON.stringify({ jsonrpc: '2.0', method, params, id }))
        setTimeout(() => {
          if (pending.has(id)) {
            pending.delete(id)
            reject(new Error(`RPC timeout: ${method}`))
          }
        }, timeout)
      })
    },
    close() { ws.close() },
    get readyState() { return ws.readyState }
  }
}
