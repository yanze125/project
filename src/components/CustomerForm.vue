<script setup>
import { ref, computed, watch } from 'vue'
import { showToast } from 'vant'
import { addCustomer, updateCustomer, allTags, displayName } from '../store/customers'
import { parseCustomerText } from '../utils/parse'
import { exportSingleVCF } from '../utils/backup'

const props = defineProps({
  show: Boolean,
  customer: { type: Object, default: null }
})
const emit = defineEmits(['update:show'])

const blank = () => ({ name: '', phone: '', address: '', note: '', tags: [], appointment: null })
const form = ref(blank())
const newTag = ref('')
const showApptPicker = ref(false)
const apptDate = ref([])
const apptTime = ref([])

watch(
  () => props.show,
  (visible) => {
    if (visible) {
      form.value = props.customer
        ? {
            ...props.customer,
            tags: [...(props.customer.tags || [])],
            appointment: props.customer.appointment ? { ...props.customer.appointment } : null
          }
        : blank()
      newTag.value = ''
    }
  }
)

const apptText = computed(() => {
  if (!form.value.appointment) return ''
  const d = new Date(form.value.appointment.time)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
})

function openApptPicker() {
  const base = form.value.appointment ? new Date(form.value.appointment.time) : new Date()
  const p = (n) => String(n).padStart(2, '0')
  apptDate.value = [String(base.getFullYear()), p(base.getMonth() + 1), p(base.getDate())]
  apptTime.value = [p(base.getHours()), p(base.getMinutes())]
  showApptPicker.value = true
}

function confirmAppt() {
  const [y, mo, d] = apptDate.value.map(Number)
  const [h, mi] = apptTime.value.map(Number)
  const time = new Date(y, mo - 1, d, h, mi).getTime()
  form.value.appointment = { time, note: form.value.appointment?.note || '' }
  showApptPicker.value = false
}

function clearAppt() {
  form.value.appointment = null
}

// 智能粘贴识别：读剪贴板失败(权限/内核)时降级为手动粘贴框
const showPasteBox = ref(false)
const pasteText = ref('')

async function onSmartPaste() {
  try {
    const text = await navigator.clipboard.readText()
    if (!text || !text.trim()) {
      showPasteBox.value = true
      return
    }
    applyParsed(text)
  } catch {
    showPasteBox.value = true
  }
}

function applyParsed(text) {
  const r = parseCustomerText(text)
  if (!r.phone && !r.name && !r.address) {
    showToast('没有识别到电话/姓名/地址')
    return
  }
  if (r.name) form.value.name = r.name
  if (r.phone) form.value.phone = r.phone
  if (r.address) form.value.address = r.address
  if (r.note) form.value.note = r.note
  showToast('已识别填入，请核对')
}

function onManualParse() {
  showPasteBox.value = false
  applyParsed(pasteText.value)
  pasteText.value = ''
}

// 下载单条 vCard，手机打开即存入系统通讯录
function onSaveToContacts() {
  if (!props.customer?.phone) return
  exportSingleVCF(props.customer, displayName(props.customer))
  showToast('已生成名片文件，打开后即可存入通讯录')
}

const tagOptions = computed(() => [
  ...new Set([...allTags.value, ...form.value.tags])
])

function toggleTag(tag) {
  const i = form.value.tags.indexOf(tag)
  i >= 0 ? form.value.tags.splice(i, 1) : form.value.tags.push(tag)
}

function addTag() {
  const tag = newTag.value.trim()
  if (tag && !form.value.tags.includes(tag)) form.value.tags.push(tag)
  newTag.value = ''
}

function save() {
  const name = form.value.name.trim()
  const phone = form.value.phone.trim()
  const address = form.value.address.trim()
  if (!phone) {
    showToast('请填写电话')
    return
  }
  const data = {
    name,
    phone,
    address,
    note: form.value.note.trim(),
    tags: form.value.tags,
    appointment: form.value.appointment
  }
  if (props.customer) {
    updateCustomer(props.customer.id, data)
  } else {
    addCustomer(data)
  }
  emit('update:show', false)
  showToast('已保存')
}
</script>

<template>
  <van-popup
    :show="show"
    position="bottom"
    round
    closeable
    class="form-popup"
    @update:show="emit('update:show', $event)"
  >
    <div class="form-title">{{ customer ? '编辑客户' : '新增客户' }}</div>
    <div v-if="!customer" class="paste-row">
      <van-button size="small" plain type="primary" icon="description" @click="onSmartPaste">
        粘贴识别
      </van-button>
      <span class="paste-tip">复制微信里的客户信息后点这里自动填表</span>
    </div>
    <van-form @submit="save">
      <van-cell-group inset>
        <van-field
          v-model="form.name"
          label="姓名"
          placeholder="可选，如：张先生"
          clearable
        />
        <van-field
          v-model="form.phone"
          label="电话"
          type="tel"
          required
          placeholder="手机号或固话"
          clearable
        />
        <van-field
          v-model="form.address"
          label="地址"
          type="textarea"
          rows="2"
          autosize
          placeholder="常用上车点或目的地"
          clearable
        />
        <van-field
          v-model="newTag"
          label="标签"
          placeholder="输入新标签后点添加"
          clearable
        >
          <template #button>
            <van-button size="small" type="primary" plain @click="addTag">添加</van-button>
          </template>
        </van-field>
        <div v-if="tagOptions.length" class="tag-select">
          <van-tag
            v-for="t in tagOptions"
            :key="t"
            :type="form.tags.includes(t) ? 'primary' : 'default'"
            size="large"
            round
            @click="toggleTag(t)"
          >
            {{ t }}
          </van-tag>
        </div>
        <van-field
          v-model="form.note"
          label="备注"
          type="textarea"
          rows="2"
          autosize
          placeholder="如：常去机场、习惯走高速"
          clearable
        />
        <van-field
          :model-value="apptText"
          label="预约"
          placeholder="可选，如：明早6点接机"
          readonly
          clickable
          is-link
          @click="openApptPicker"
        />
        <van-field
          v-if="form.appointment"
          :model-value="form.appointment.note"
          label="预约备注"
          placeholder="如：去机场、带大件行李"
          clearable
          @update:model-value="(v) => (form.appointment.note = v)"
        >
          <template #button>
            <van-button size="small" plain type="danger" @click="clearAppt">清除预约</van-button>
          </template>
        </van-field>
      </van-cell-group>
      <div class="form-footer">
        <van-button round block type="primary" native-type="submit">保存</van-button>
        <van-button
          v-if="customer && customer.phone"
          round
          block
          plain
          type="primary"
          icon="contact-o"
          class="save-contact-btn"
          @click.prevent="onSaveToContacts"
        >
          存入手机通讯录
        </van-button>
      </div>
    </van-form>

    <van-popup v-model:show="showPasteBox" position="bottom" round teleport="body" class="paste-popup">
      <div class="form-title">粘贴客户信息</div>
      <van-field
        v-model="pasteText"
        type="textarea"
        rows="4"
        autosize
        placeholder="长按此处粘贴，如：张先生 13812345678 明早6点到首都机场T3"
      />
      <div class="form-footer">
        <van-button round block type="primary" @click="onManualParse">识别并填入</van-button>
      </div>
    </van-popup>

    <van-popup v-model:show="showApptPicker" position="bottom" round teleport="body">
      <van-picker-group
        title="预约时间"
        :tabs="['选日期', '选时间']"
        @confirm="confirmAppt"
        @cancel="showApptPicker = false"
      >
        <van-date-picker v-model="apptDate" />
        <van-time-picker v-model="apptTime" />
      </van-picker-group>
    </van-popup>
  </van-popup>
</template>

<style scoped>
.form-popup {
  padding-bottom: env(safe-area-inset-bottom);
}

.form-title {
  padding: 16px;
  font-size: 17px;
  font-weight: 600;
  text-align: center;
}

.paste-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px 12px;
}

.paste-tip {
  font-size: 12px;
  color: var(--van-text-color-3, #969799);
}

.paste-popup {
  padding-bottom: env(safe-area-inset-bottom);
}

.tag-select {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 16px;
  background: #fff;
}

.tag-select .van-tag {
  padding: 4px 14px;
  font-size: 14px;
}

.form-footer {
  padding: 16px;
}

.save-contact-btn {
  margin-top: 10px;
}
</style>
