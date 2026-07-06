<script setup>
import { ref, computed } from 'vue'
import { showConfirmDialog, showToast } from 'vant'
import { state, removeCustomer, touchContact, togglePin, displayName, timeAgo } from '../store/customers'
import { dial, navigate, sms, copyText, shareText, openWeixin, getMyLocation, buildMarkerLink } from '../utils/actions'

defineProps({ customers: { type: Array, default: () => [] } })
const emit = defineEmits(['edit'])

function onDial(c) {
  touchContact(c.id)
  dial(c.phone)
}

function onNavigate(c) {
  touchContact(c.id)
  navigate(c.address, state.settings.mapApp)
}

// 短信话术选择
// 注意：close-on-click-action 会先发 update:show 再发 select，
// 所以"面板开关"和"目标客户"必须分开存，关面板不能清客户
const showSms = ref(false)
const smsCustomer = ref(null)
const smsActions = computed(() =>
  [...state.settings.smsTemplates.map((t) => ({ name: t })), { name: '空白短信' }]
)

function onSms(c) {
  smsCustomer.value = c
  showSms.value = true
}

function onPickSms(action) {
  const c = smsCustomer.value
  if (!c) return
  touchContact(c.id)
  sms(c.phone, action.name === '空白短信' ? '' : action.name)
}

async function onCopy(c) {
  const text = [c.name, c.phone, c.address].filter(Boolean).join(' ')
  const ok = await copyText(text)
  showToast(ok ? '已复制，可粘贴到微信' : '复制失败')
}

// 微信联动面板
const showWx = ref(false)
const wxCustomer = ref(null)
const WX_SEND_INFO = '发送客户信息'
const WX_SEND_LOC = '发送我的位置'
const WX_ADD_FRIEND = '复制号码·去微信加好友'

const wxActions = computed(() => [
  ...state.settings.smsTemplates.map((t) => ({ name: t })),
  { name: WX_SEND_INFO },
  { name: WX_SEND_LOC },
  { name: WX_ADD_FRIEND, color: '#07c160' }
])

function onWx(c) {
  wxCustomer.value = c
  showWx.value = true
}

async function shareWithHint(text) {
  const r = await shareText(text)
  if (r === 'copied') showToast('已复制，去微信粘贴发送')
  else if (r === false) showToast('分享失败')
}

async function onPickWx(action) {
  const c = wxCustomer.value
  if (!c) return
  touchContact(c.id)
  if (action.name === WX_ADD_FRIEND) {
    await copyText(c.phone)
    showToast('号码已复制：微信里 添加朋友→手机号→粘贴')
    setTimeout(openWeixin, 800) // 让 toast 先被看到
  } else if (action.name === WX_SEND_LOC) {
    try {
      const { lng, lat } = await getMyLocation()
      await shareWithHint(`我的位置：${buildMarkerLink(lng, lat, '司机位置')}`)
    } catch {
      showToast('定位失败，请检查定位权限')
    }
  } else if (action.name === WX_SEND_INFO) {
    await shareWithHint([c.name, c.phone, c.address].filter(Boolean).join(' '))
  } else {
    await shareWithHint(action.name)
  }
}

function onDelete(customer) {
  showConfirmDialog({
    title: '删除客户',
    message: `确定删除「${displayName(customer)}」吗？删除后无法恢复。`,
    confirmButtonText: '删除',
    confirmButtonColor: '#ee0a24'
  })
    .then(() => removeCustomer(customer.id))
    .catch(() => {})
}
</script>

<template>
  <div class="list">
    <van-swipe-cell v-for="c in customers" :key="c.id">
      <div class="card" @click="emit('edit', c)">
        <div class="info">
          <div class="name-row">
            <van-icon v-if="c.pinned" name="star" class="pin-icon" />
            <span class="name">{{ displayName(c) }}</span>
            <van-tag v-for="t in c.tags" :key="t" plain type="primary">{{ t }}</van-tag>
            <span v-if="c.lastContactAt" class="last-contact">{{ timeAgo(c.lastContactAt) }}联系过</span>
          </div>
          <div v-if="c.phone" class="phone">{{ c.phone }}</div>
          <div v-if="c.address" class="address">{{ c.address }}</div>
          <div v-if="c.note" class="note">{{ c.note }}</div>
        </div>
        <div class="actions" @click.stop>
          <van-button
            v-if="c.phone"
            icon="phone"
            type="success"
            round
            class="action-btn"
            @click="onDial(c)"
          />
          <van-button
            v-if="c.phone"
            icon="chat-o"
            round
            class="action-btn sms-btn"
            @click="onSms(c)"
          />
          <van-button
            v-if="c.phone"
            icon="wechat"
            round
            class="action-btn wx-btn"
            @click="onWx(c)"
          />
          <van-button
            v-if="c.address"
            icon="guide-o"
            type="primary"
            round
            class="action-btn"
            @click="onNavigate(c)"
          />
        </div>
      </div>
      <template #right>
        <van-button square text="复制" class="copy-btn" @click="onCopy(c)" />
        <van-button
          square
          type="primary"
          :text="c.pinned ? '取消星标' : '星标'"
          class="pin-btn"
          @click="togglePin(c.id)"
        />
        <van-button square type="danger" text="删除" class="del-btn" @click="onDelete(c)" />
      </template>
    </van-swipe-cell>
  </div>

  <van-action-sheet
    v-model:show="showSms"
    :actions="smsActions"
    cancel-text="取消"
    description="选择短信话术"
    close-on-click-action
    @select="onPickSms"
  />

  <van-action-sheet
    v-model:show="showWx"
    :actions="wxActions"
    cancel-text="取消"
    description="微信联动：选话术分享，或加好友/发位置"
    close-on-click-action
    @select="onPickWx"
  />
</template>

<style scoped>
.list {
  padding: 0 12px 88px;
}

.van-swipe-cell {
  margin-bottom: 10px;
  border-radius: 10px;
  overflow: hidden;
}

.card {
  display: flex;
  align-items: center;
  background: var(--van-background-2, #fff);
  padding: 14px;
}

.info {
  flex: 1;
  min-width: 0;
}

.name-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.name {
  font-size: 18px;
  font-weight: 600;
  color: var(--van-text-color, #323233);
}

.phone {
  margin-top: 6px;
  font-size: 17px;
  color: #1989fa;
  letter-spacing: 0.5px;
}

.address {
  margin-top: 4px;
  font-size: 15px;
  color: var(--van-text-color-2, #646566);
  word-break: break-all;
}

.note {
  margin-top: 4px;
  font-size: 13px;
  color: var(--van-text-color-3, #969799);
  word-break: break-all;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
  margin-left: 12px;
  width: 106px; /* 两列网格，最多 2x2 个按钮 */
  flex-shrink: 0;
}

/* 开车场景：大点击区 */
.action-btn {
  width: 48px;
  height: 48px;
  font-size: 22px;
}

.del-btn,
.pin-btn,
.copy-btn {
  height: 100%;
}

.copy-btn {
  background: var(--van-gray-5, #c8c9cc);
  color: #fff;
  border: none;
}

/* 短信按钮：与拨号区分的青绿色 */
.sms-btn {
  background: #00b578;
  border-color: #00b578;
  color: #fff;
}

/* 微信按钮：微信品牌绿 */
.wx-btn {
  background: #07c160;
  border-color: #07c160;
  color: #fff;
}

.last-contact {
  font-size: 12px;
  color: var(--van-text-color-3, #969799);
}

.pin-icon {
  color: #f0a020;
  font-size: 18px;
}
</style>
