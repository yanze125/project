<script setup>
import { ref, computed } from 'vue'
import { state, filterCustomers, allTags } from './store/customers'
import CustomerList from './components/CustomerList.vue'
import CustomerForm from './components/CustomerForm.vue'
import SettingsPanel from './components/SettingsPanel.vue'

const keyword = ref('')
const activeTag = ref('')
const showForm = ref(false)
const showSettings = ref(false)
const editing = ref(null)

const list = computed(() => filterCustomers(keyword.value, activeTag.value))

function onAdd() {
  editing.value = null
  showForm.value = true
}

function onEdit(customer) {
  editing.value = customer
  showForm.value = true
}
</script>

<template>
  <van-nav-bar title="客户速记" fixed placeholder>
    <template #right>
      <van-icon name="setting-o" size="22" @click="showSettings = true" />
    </template>
  </van-nav-bar>

  <van-search v-model="keyword" placeholder="搜索姓名 / 电话 / 地址" clearable />

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

  <CustomerList :customers="list" @edit="onEdit" />

  <van-empty
    v-if="!list.length"
    :description="state.customers.length ? '没有匹配的客户' : '点右下角 + 添加第一位客户'"
  />

  <van-button icon="plus" type="primary" round class="add-fab" @click="onAdd" />

  <CustomerForm v-model:show="showForm" :customer="editing" />
  <SettingsPanel v-model:show="showSettings" />
</template>

<style>
body {
  margin: 0;
  background: #f7f8fa;
  -webkit-tap-highlight-color: transparent;
}

.tag-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0 12px 8px;
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
