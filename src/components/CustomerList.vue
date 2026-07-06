<script setup>
import { ref, computed } from 'vue'
import { showConfirmDialog, showToast } from 'vant'
import { state, removeCustomer, touchContact, togglePin, displayName, timeAgo } from '../store/customers'
import { dial, navigate, sms, copyText } from '../utils/actions'

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
const smsTarget = ref(null)
const smsActions = computed(() =>
  [...state.settings.smsTemplates.map((t) => ({ name: t })), { name: '空白短信' }]
)

function onSms(c) {
  smsTarget.value = c
}

function onPickSms(action) {
  const c = smsTarget.value
  smsTarget.value = null
  if (!c) return
  touchContact(c.id)
  sms(c.phone, action.name === '空白短信' ? '' : action.name)
}

async function onCopy(c) {
  const text = [c.name, c.phone, c.address].filter(Boolean).join(' ')
  const ok = await copyText(text)
  showToast(ok ? '已复制，可粘贴到微信' : '复制失败')
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
    :show="!!smsTarget"
    :actions="smsActions"
    cancel-text="取消"
    description="选择短信话术"
    close-on-click-action
    @select="onPickSms"
    @cancel="smsTarget = null"
    @update:show="(v) => { if (!v) smsTarget = null }"
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
  gap: 10px;
  margin-left: 12px;
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

.last-contact {
  font-size: 12px;
  color: var(--van-text-color-3, #969799);
}

.pin-icon {
  color: #f0a020;
  font-size: 18px;
}
</style>
