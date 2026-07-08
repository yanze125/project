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

// 补齐缺失字段，兼容老版本数据和旧 JSON 备份
function normalizeCustomer(item) {
  const now = Date.now()
  const appt =
    item.appointment && typeof item.appointment.time === 'number'
      ? { time: item.appointment.time, note: String(item.appointment.note || '') }
      : null
  return {
    id: item.id || genId(),
    name: String(item.name || ''),
    phone: String(item.phone || ''),
    address: String(item.address || ''),
    note: String(item.note || ''),
    tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
    pinned: !!item.pinned,
    lastContactAt: typeof item.lastContactAt === 'number' ? item.lastContactAt : null,
    appointment: appt,
    createdAt: item.createdAt || now,
    updatedAt: item.updatedAt || now
  }
}

export const DEFAULT_SMS_TEMPLATES = [
  '师傅已到上车点，看到请出发',
  '距您还有约5分钟，请提前准备',
  '已到附近，具体位置发我一下'
]

export const state = reactive({
  customers: load(STORAGE_KEY, []).map(normalizeCustomer),
  settings: {
    mapApp: 'amap',
    sortBy: 'recent',
    theme: 'light',
    fontSize: 'normal',
    smsTemplates: DEFAULT_SMS_TEMPLATES,
    wecomWebhook: '',
    driverName: '',
    driverPhone: '',
    ...load(SETTINGS_KEY, {})
  }
})

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.customers))
}

export function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings))
}

export function addCustomer(data) {
  state.customers.unshift(normalizeCustomer(data))
  persist()
}

export function updateCustomer(id, data) {
  const c = state.customers.find((c) => c.id === id)
  if (!c) return
  Object.assign(c, data, { updatedAt: Date.now() })
  persist()
}

// 返回被删客户与原位置，供"撤销"恢复
export function removeCustomer(id) {
  const i = state.customers.findIndex((c) => c.id === id)
  if (i < 0) return null
  const [customer] = state.customers.splice(i, 1)
  persist()
  return { customer, index: i }
}

export function restoreCustomer(customer, index) {
  const i = Math.min(Math.max(index, 0), state.customers.length)
  state.customers.splice(i, 0, customer)
  persist()
}

// 拨号/导航时记录最近联系时间，供"最近联系"排序
export function touchContact(id) {
  const c = state.customers.find((c) => c.id === id)
  if (!c) return
  c.lastContactAt = Date.now()
  persist()
}

export function togglePin(id) {
  const c = state.customers.find((c) => c.id === id)
  if (!c) return
  c.pinned = !c.pinned
  persist()
}

export function clearAppointment(id) {
  const c = state.customers.find((c) => c.id === id)
  if (!c) return
  c.appointment = null
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
    if (!item || typeof item !== 'object') continue
    if (!item.name && !item.phone && !item.address) continue
    if (item.id && existing.has(item.id)) continue
    state.customers.push(normalizeCustomer(item))
    added++
  }
  if (added) persist()
  return added
}

// 空姓名时的展示兜底
export function displayName(c) {
  return c.name || c.phone || '未命名客户'
}

// 相对时间：卡片"x前联系过"徽标
export function timeAgo(ts) {
  if (typeof ts !== 'number') return ''
  const diff = Date.now() - ts
  if (diff < 60 * 1000) return '刚刚'
  if (diff < 3600 * 1000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 24 * 3600 * 1000) return `${Math.floor(diff / 3600000)}小时前`
  return `${Math.floor(diff / 86400000)}天前`
}

export const allTags = computed(() => [
  ...new Set(state.customers.flatMap((c) => c.tags || []))
])

const zhCollator = new Intl.Collator('zh-Hans-CN')

function compareBy(sortBy) {
  if (sortBy === 'name') return (a, b) => zhCollator.compare(a.name, b.name)
  if (sortBy === 'created') return (a, b) => b.createdAt - a.createdAt
  // recent：没联系过的按最后编辑时间排
  return (a, b) => (b.lastContactAt ?? b.updatedAt) - (a.lastContactAt ?? a.updatedAt)
}

export function filterCustomers(keyword, tag) {
  const kw = (keyword || '').trim().toLowerCase()
  const cmp = compareBy(state.settings.sortBy)
  return state.customers
    .filter((c) => {
      if (tag && !(c.tags || []).includes(tag)) return false
      if (!kw) return true
      return [c.name, c.phone, c.address, c.note, ...(c.tags || [])].some((v) =>
        String(v || '').toLowerCase().includes(kw)
      )
    })
    .sort((a, b) => (b.pinned - a.pinned) || cmp(a, b))
}
