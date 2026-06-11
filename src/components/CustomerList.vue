<script setup>
import { showConfirmDialog } from 'vant'
import { state, removeCustomer } from '../store/customers'
import { dial, navigate } from '../utils/actions'

defineProps({ customers: { type: Array, default: () => [] } })
const emit = defineEmits(['edit'])

function onDelete(customer) {
  showConfirmDialog({
    title: '删除客户',
    message: `确定删除「${customer.name}」吗？删除后无法恢复。`,
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
            <span class="name">{{ c.name }}</span>
            <van-tag v-for="t in c.tags" :key="t" plain type="primary">{{ t }}</van-tag>
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
            @click="dial(c.phone)"
          />
          <van-button
            v-if="c.address"
            icon="guide-o"
            type="primary"
            round
            class="action-btn"
            @click="navigate(c.address, state.settings.mapApp)"
          />
        </div>
      </div>
      <template #right>
        <van-button square type="danger" text="删除" class="del-btn" @click="onDelete(c)" />
      </template>
    </van-swipe-cell>
  </div>
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
  background: #fff;
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
  color: #323233;
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
  color: #646566;
  word-break: break-all;
}

.note {
  margin-top: 4px;
  font-size: 13px;
  color: #969799;
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

.del-btn {
  height: 100%;
}
</style>
