<script setup>
import { ref } from 'vue'
import { showToast, showConfirmDialog } from 'vant'
import { state, saveSettings, mergeCustomers, clearCustomers } from '../store/customers'
import { exportJSON, exportCSV, exportVCF, readJSONFile } from '../utils/backup'

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

function onExportVCF() {
  if (!state.customers.length) return showToast('暂无数据可导出')
  const { count, skipped } = exportVCF(state.customers)
  if (!count) return showToast('客户都没有电话号码，无法导出')
  showToast(skipped ? `已导出 ${count} 位（跳过 ${skipped} 位无电话）` : `已导出 ${count} 位客户`)
}

function setOption(key, value) {
  state.settings[key] = value
  saveSettings()
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

// 短信话术增删
const newTpl = ref('')

function addTpl() {
  const t = newTpl.value.trim()
  if (!t) return
  if (state.settings.smsTemplates.includes(t)) return showToast('已有相同话术')
  state.settings.smsTemplates.push(t)
  saveSettings()
  newTpl.value = ''
}

function removeTpl(i) {
  state.settings.smsTemplates.splice(i, 1)
  saveSettings()
}

// 相对路径，本地与 Pages 子路径部署都可达
function openTank() {
  window.open('./tank.html')
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

    <van-cell-group inset title="外观">
      <van-cell title="主题">
        <template #value>
          <div class="opt-btns">
            <van-button
              v-for="o in [['light', '浅色'], ['dark', '深色'], ['auto', '跟随系统']]"
              :key="o[0]"
              size="small"
              :type="state.settings.theme === o[0] ? 'primary' : 'default'"
              @click="setOption('theme', o[0])"
            >
              {{ o[1] }}
            </van-button>
          </div>
        </template>
      </van-cell>
      <van-cell title="字号">
        <template #value>
          <div class="opt-btns">
            <van-button
              v-for="o in [['normal', '标准'], ['large', '大'], ['xlarge', '特大']]"
              :key="o[0]"
              size="small"
              :type="state.settings.fontSize === o[0] ? 'primary' : 'default'"
              @click="setOption('fontSize', o[0])"
            >
              {{ o[1] }}
            </van-button>
          </div>
        </template>
      </van-cell>
    </van-cell-group>

    <van-cell-group inset title="短信话术（点客户卡片短信按钮时可选）">
      <van-cell v-for="(t, i) in state.settings.smsTemplates" :key="i" :title="t">
        <template #right-icon>
          <van-icon name="cross" class="tpl-del" @click="removeTpl(i)" />
        </template>
      </van-cell>
      <van-field v-model="newTpl" placeholder="输入新话术后点添加" clearable>
        <template #button>
          <van-button size="small" type="primary" plain @click="addTpl">添加</van-button>
        </template>
      </van-field>
    </van-cell-group>

    <van-cell-group inset title="数据备份">
      <van-cell title="导出 JSON 备份" is-link icon="down" @click="onExportJSON" />
      <van-cell title="导出 CSV（Excel 可打开）" is-link icon="description" @click="onExportCSV" />
      <van-cell title="导出到手机通讯录 (.vcf)" is-link icon="contact-o" @click="onExportVCF" />
      <van-cell title="导入 JSON 备份" is-link icon="upgrade" @click="fileInput.click()" />
    </van-cell-group>

    <van-cell-group inset title="休息一下">
      <van-cell title="🎮 坦克大战（无敌版）" is-link @click="openTank" />
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

.opt-btns {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}

.opt-btns .van-button {
  white-space: nowrap;
  flex-shrink: 0;
}

.tpl-del {
  color: var(--van-text-color-3, #969799);
  font-size: 16px;
  padding: 4px;
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
