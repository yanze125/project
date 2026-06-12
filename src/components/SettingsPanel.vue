<script setup>
import { ref } from 'vue'
import { showToast, showConfirmDialog } from 'vant'
import { state, saveSettings, mergeCustomers, clearCustomers } from '../store/customers'
import { exportJSON, exportCSV, readJSONFile } from '../utils/backup'

defineProps({ show: Boolean })
const emit = defineEmits(['update:show'])

const fileInput = ref(null)

function onExportJSON() {
  if (!state.customers.length) return showToast('暂无数据可导出')
  exportJSON(state.customers)
}

function onExportCSV() {
  if (!state.customers.length) return showToast('暂无数据可导出')
  exportCSV(state.customers)
}

async function onImportFile(e) {
  const file = e.target.files[0]
  e.target.value = ''
  if (!file) return
  try {
    const data = await readJSONFile(file)
    const added = mergeCustomers(data)
    showToast(added ? `已导入 ${added} 位客户` : '没有新增客户（已存在或文件为空）')
  } catch (err) {
    showToast(err.message)
  }
}

function onMapChange() {
  saveSettings()
}

// 清空不可恢复，双重确认防误触
async function onClearAll() {
  if (!state.customers.length) return showToast('暂无数据')
  try {
    await showConfirmDialog({
      title: '清空所有客户',
      message: `将删除全部 ${state.customers.length} 位客户，且无法恢复。\n建议先导出 JSON 备份。`,
      confirmButtonText: '继续',
      confirmButtonColor: '#ee0a24'
    })
    await showConfirmDialog({
      title: '再次确认',
      message: '确定要清空吗？此操作不可恢复！',
      confirmButtonText: '清空',
      confirmButtonColor: '#ee0a24'
    })
    clearCustomers()
    showToast('已清空全部客户')
  } catch {
    /* 用户取消 */
  }
}
</script>

<template>
  <van-popup
    :show="show"
    position="bottom"
    round
    closeable
    @update:show="emit('update:show', $event)"
  >
    <div class="panel-title">设置</div>

    <van-cell-group inset title="导航地图">
      <van-radio-group v-model="state.settings.mapApp" @change="onMapChange">
        <van-cell title="高德地图" clickable @click="state.settings.mapApp = 'amap'; onMapChange()">
          <template #right-icon><van-radio name="amap" /></template>
        </van-cell>
        <van-cell title="百度地图" clickable @click="state.settings.mapApp = 'baidu'; onMapChange()">
          <template #right-icon><van-radio name="baidu" /></template>
        </van-cell>
      </van-radio-group>
    </van-cell-group>

    <van-cell-group inset title="数据备份">
      <van-cell title="导出 JSON 备份" is-link icon="down" @click="onExportJSON" />
      <van-cell title="导出 CSV（Excel 可打开）" is-link icon="description" @click="onExportCSV" />
      <van-cell title="导入 JSON 备份" is-link icon="upgrade" @click="fileInput.click()" />
    </van-cell-group>

    <van-cell-group inset title="数据清理">
      <van-cell
        title="一键清空所有客户"
        icon="delete-o"
        class="danger-cell"
        clickable
        @click="onClearAll"
      />
    </van-cell-group>

    <div class="panel-stat">共 {{ state.customers.length }} 位客户，数据保存在本机浏览器中，换手机前请先导出备份</div>

    <input
      ref="fileInput"
      type="file"
      accept=".json,application/json"
      style="display: none"
      @change="onImportFile"
    />
  </van-popup>
</template>

<style scoped>
.panel-title {
  padding: 16px;
  font-size: 17px;
  font-weight: 600;
  text-align: center;
}

.danger-cell :deep(.van-cell__title),
.danger-cell :deep(.van-icon) {
  color: #ee0a24;
}

.panel-stat {
  padding: 16px 24px calc(24px + env(safe-area-inset-bottom));
  font-size: 13px;
  color: #969799;
  text-align: center;
}
</style>
