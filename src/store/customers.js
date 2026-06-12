import { reactive, computed } from 'vue'

const STORAGE_KEY = 'taxi-contacts:customers'
const SETTINGS_KEY = 'taxi-contacts:settings'

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function genId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10)
}

export const state = reactive({
  customers: load(STORAGE_KEY, []),
  settings: { mapApp: 'amap', ...load(SETTINGS_KEY, {}) }
})

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.customers))
}

export function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings))
}

export function addCustomer(data) {
  const now = Date.now()
  state.customers.unshift({ id: genId(), createdAt: now, updatedAt: now, ...data })
  persist()
}

export function updateCustomer(id, data) {
  const c = state.customers.find((c) => c.id === id)
  if (!c) return
  Object.assign(c, data, { updatedAt: Date.now() })
  persist()
}

export function removeCustomer(id) {
  const i = state.customers.findIndex((c) => c.id === id)
  if (i >= 0) state.customers.splice(i, 1)
  persist()
}

export function clearCustomers() {
  state.customers.splice(0)
  persist()
}

// 导入合并：按 id 去重，不覆盖已有数据；返回新增条数
export function mergeCustomers(list) {
  if (!Array.isArray(list)) return 0
  const existing = new Set(state.customers.map((c) => c.id))
  let added = 0
  for (const item of list) {
    if (!item || typeof item !== 'object' || !item.name) continue
    if (item.id && existing.has(item.id)) continue
    const now = Date.now()
    state.customers.push({
      id: item.id || genId(),
      name: String(item.name),
      phone: String(item.phone || ''),
      address: String(item.address || ''),
      note: String(item.note || ''),
      tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
      createdAt: item.createdAt || now,
      updatedAt: item.updatedAt || now
    })
    added++
  }
  if (added) persist()
  return added
}

export const allTags = computed(() => [
  ...new Set(state.customers.flatMap((c) => c.tags || []))
])

export function filterCustomers(keyword, tag) {
  const kw = (keyword || '').trim().toLowerCase()
  return state.customers.filter((c) => {
    if (tag && !(c.tags || []).includes(tag)) return false
    if (!kw) return true
    return [c.name, c.phone, c.address, c.note, ...(c.tags || [])].some((v) =>
      String(v || '').toLowerCase().includes(kw)
    )
  })
}
