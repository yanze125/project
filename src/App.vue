<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { state, filterCustomers, allTags, saveSettings, clearAppointment, displayName, touchContact } from './store/customers'
import { dial } from './utils/actions'
import { applyTheme, applyFontSize } from './utils/theme'
import CustomerList from './components/CustomerList.vue'
import CustomerForm from './components/CustomerForm.vue'
import SettingsPanel from './components/SettingsPanel.vue'

const keyword = ref('')
const activeTag = ref('')
const showForm = ref(false)
const showSettings = ref(false)
const showSort = ref(false)
const editing = ref(null)

const list = computed(() => filterCustomers(keyword.value, activeTag.value))

const sortActions = [
  { name: '最近联系优先', value: 'recent' },
  { name: '最近添加优先', value: 'created' },
  { name: '按姓名排序', value: 'name' }
]
const sortLabel = computed(
  () => sortActions.find((a) => a.value === state.settings.sortBy)?.name || ''
)

function onSelectSort(action) {
  state.settings.sortBy = action.value
  saveSettings()
  showSort.value = false
}

// 近期预约：未来 24 小时内 + 已过期未清除的，按时间升序
const now = ref(Date.now())
setInterval(() => (now.value = Date.now()), 60 * 1000)

const upcoming = computed(() =>
  state.customers
    .filter((c) => c.appointment && c.appointment.time < now.value + 24 * 3600 * 1000)
    .sort((a, b) => a.appointment.time - b.appointment.time)
)

function apptLabel(time) {
  const d = new Date(time)
  const p = (n) => String(n).padStart(2, '0')
  const hm = `${p(d.getHours())}:${p(d.getMinutes())}`
  if (time < now.value) return `已过期 ${hm}`
  const today = new Date()
  const sameDay = d.toDateString() === today.toDateString()
  return `${sameDay ? '今天' : '明天'} ${hm}`
}

// 最近联系快捷条：联系过的前 5 位，一点回拨
const recentContacts = computed(() =>
  state.customers
    .filter((c) => c.lastContactAt && c.phone)
    .sort((a, b) => b.lastContactAt - a.lastContactAt)
    .slice(0, 5)
)

function onQuickDial(c) {
  touchContact(c.id)
  dial(c.phone)
}

function onAdd() {
  editing.value = null
  showForm.value = true
}

function onEdit(customer) {
  editing.value = customer
  showForm.value = true
}

onMounted(() => {
  applyTheme(state.settings.theme)
  applyFontSize(state.settings.fontSize)
  // 安卓长按图标"新增客户"快捷方式入口
  if (new URLSearchParams(location.search).get('action') === 'add') {
    history.replaceState(null, '', location.pathname)
    onAdd()
  }
})
watch(() => state.settings.theme, applyTheme)
watch(() => state.settings.fontSize, applyFontSize)
</script>

<template>
  <van-nav-bar title="客户速记" fixed placeholder>
    <template #right>
      <van-icon name="setting-o" size="22" @click="showSettings = true" />
    </template>
  </van-nav-bar>

  <div v-if="upcoming.length" class="appt-bar">
    <div
      v-for="c in upcoming"
      :key="c.id"
      class="appt-item"
      :class="{ expired: c.appointment.time < now }"
      @click="onEdit(c)"
    >
      <van-icon name="clock-o" class="appt-icon" />
      <span class="appt-time">{{ apptLabel(c.appointment.time) }}</span>
      <span class="appt-name">{{ displayName(c) }}</span>
      <span v-if="c.appointment.note" class="appt-note">{{ c.appointment.note }}</span>
      <van-button
        v-if="c.appointment.time < now"
        size="mini"
        plain
        class="appt-clear"
        @click.stop="clearAppointment(c.id)"
      >
        清除
      </van-button>
      <van-button
        v-else-if="c.phone"
        size="mini"
        type="success"
        icon="phone"
        class="appt-dial"
        @click.stop="dial(c.phone)"
      />
    </div>
  </div>

  <div v-if="recentContacts.length" class="recent-bar">
    <span class="recent-label">最近</span>
    <button v-for="c in recentContacts" :key="c.id" class="recent-chip" @click="onQuickDial(c)">
      <van-icon name="phone" />
      {{ displayName(c) }}
    </button>
  </div>

  <div class="search-row">
    <van-search v-model="keyword" class="search-input" placeholder="搜索姓名 / 电话 / 地址" clearable />
    <van-icon name="filter-o" class="sort-btn" :title="sortLabel" @click="showSort = true" />
  </div>

  <div v-if="allTags.length" class="tag-bar">
    <van-tag
      v-for="t in allTags"
      :key="t"
      :type="activeTag === t ? 'primary' : 'default'"
      size="large"
      round
      @click="activeTag = activeTag === t ? '' : t"
    >
      {{ t }}
    </van-tag>
  </div>

  <CustomerList :customers="list" :grouped="state.settings.sortBy === 'name' && !keyword && !activeTag" @edit="onEdit" />

  <van-empty
    v-if="!list.length"
    :description="state.customers.length ? '没有匹配的客户' : '点右下角 + 添加第一位客户'"
  />

  <van-button icon="plus" type="primary" round class="add-fab" @click="onAdd" />

  <van-action-sheet
    v-model:show="showSort"
    :actions="sortActions.map((a) => ({ ...a, color: a.value === state.settings.sortBy ? '#1989fa' : undefined }))"
    cancel-text="取消"
    description="列表排序方式（星标客户始终在最前）"
    @select="onSelectSort"
  />

  <CustomerForm v-model:show="showForm" :customer="editing" />
  <SettingsPanel v-model:show="showSettings" />
</template>

<style>
html {
  -webkit-text-size-adjust: 100%;
}

html,
body {
  width: 100%;
  overflow-x: hidden;
  /* 禁用双击缩放，点击零延迟 */
  touch-action: manipulation;
}

body {
  margin: 0;
  background: var(--van-background, #f7f8fa);
  -webkit-tap-highlight-color: transparent;
}

#app {
  min-height: 100vh;
}

/* 字号档位：整体缩放，按钮点击区同步变大 */
html.font-large #app {
  zoom: 1.12;
}

html.font-xlarge #app {
  zoom: 1.25;
}

.search-row {
  display: flex;
  align-items: center;
  background: var(--van-background-2, #fff);
}

.search-input {
  flex: 1;
}

.sort-btn {
  padding: 0 14px;
  font-size: 22px;
  color: var(--van-text-color-2, #646566);
}

.appt-bar {
  padding: 8px 12px 0;
}

.appt-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  margin-bottom: 8px;
  border-radius: 8px;
  background: #fff7e8;
  border: 1px solid #f0a020;
  font-size: 14px;
}

.van-theme-dark .appt-item {
  background: #3a2e14;
  border-color: #8a6116;
}

.appt-item.expired {
  background: var(--van-background-2, #f2f3f5);
  border-color: var(--van-gray-5, #c8c9cc);
  color: var(--van-text-color-3, #969799);
}

.appt-icon {
  color: #f0a020;
  font-size: 16px;
}

.appt-item.expired .appt-icon {
  color: var(--van-text-color-3, #969799);
}

.appt-time {
  font-weight: 600;
  white-space: nowrap;
}

.appt-name {
  font-weight: 600;
  white-space: nowrap;
}

.appt-note {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--van-text-color-2, #646566);
}

.appt-item.expired .appt-note {
  color: inherit;
}

.appt-clear,
.appt-dial {
  margin-left: auto;
  flex-shrink: 0;
}

.appt-note + .appt-clear,
.appt-note + .appt-dial {
  margin-left: 0;
}

.recent-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px 0;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.recent-label {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--van-text-color-3, #969799);
}

.recent-chip {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 7px 14px;
  border-radius: 16px;
  border: 1px solid #07c16033;
  background: #07c16014;
  color: #0a9f56;
  font-size: 14px;
  font-family: inherit;
}

.van-theme-dark .recent-chip {
  background: #0a3d24;
  color: #4bd88a;
  border-color: #14663c;
}

.tag-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 12px;
}

.tag-bar .van-tag {
  padding: 4px 14px;
  font-size: 14px;
}

/* 固定定位的新增按钮：不依赖 JS 计算位置，大点击区适合开车场景 */
.add-fab {
  position: fixed;
  right: 20px;
  bottom: calc(28px + env(safe-area-inset-bottom));
  width: 60px;
  height: 60px;
  font-size: 26px;
  box-shadow: 0 4px 12px rgba(25, 137, 250, 0.4);
  z-index: 100;
}
</style>
