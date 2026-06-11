<script setup>
import { ref, computed, watch } from 'vue'
import { showToast } from 'vant'
import { addCustomer, updateCustomer, allTags } from '../store/customers'

const props = defineProps({
  show: Boolean,
  customer: { type: Object, default: null }
})
const emit = defineEmits(['update:show'])

const blank = () => ({ name: '', phone: '', address: '', note: '', tags: [] })
const form = ref(blank())
const newTag = ref('')

watch(
  () => props.show,
  (visible) => {
    if (visible) {
      form.value = props.customer
        ? { ...props.customer, tags: [...(props.customer.tags || [])] }
        : blank()
      newTag.value = ''
    }
  }
)

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
  if (!name) {
    showToast('请填写姓名或称呼')
    return
  }
  const data = {
    name,
    phone: form.value.phone.trim(),
    address: form.value.address.trim(),
    note: form.value.note.trim(),
    tags: form.value.tags
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
    <van-form @submit="save">
      <van-cell-group inset>
        <van-field
          v-model="form.name"
          label="姓名"
          placeholder="姓名或称呼，如：张先生"
          clearable
        />
        <van-field
          v-model="form.phone"
          label="电话"
          type="tel"
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
      </van-cell-group>
      <div class="form-footer">
        <van-button round block type="primary" native-type="submit">保存</van-button>
      </div>
    </van-form>
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
</style>
