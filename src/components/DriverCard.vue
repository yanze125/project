<script setup>
import { computed } from 'vue'
import qrcode from 'qrcode-generator'
import { buildNameCardText } from '../utils/backup'

const props = defineProps({
  show: Boolean,
  name: { type: String, default: '' },
  phone: { type: String, default: '' }
})
const emit = defineEmits(['update:show'])

const qrSvg = computed(() => {
  if (!props.phone) return ''
  const qr = qrcode(0, 'M')
  qr.addData(buildNameCardText(props.name || props.phone, props.phone))
  qr.make()
  return qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true })
})
</script>

<template>
  <van-popup
    :show="show"
    position="center"
    round
    closeable
    teleport="body"
    class="card-popup"
    @update:show="emit('update:show', $event)"
  >
    <div class="card-body">
      <div class="card-title">扫码存我的电话</div>
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div class="qr-box" v-html="qrSvg" />
      <div class="card-name">{{ name }}</div>
      <div class="card-phone">{{ phone }}</div>
      <div class="card-tip">乘客用微信/相机扫一扫，直接保存联系人</div>
    </div>
  </van-popup>
</template>

<style scoped>
/* 强制白底：深色模式下二维码也要可扫 */
.card-popup {
  background: #fff;
}

.card-body {
  padding: 28px 32px calc(24px + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #323233;
  margin-bottom: 10px;
}

.qr-box {
  width: min(64vw, 300px);
}

.qr-box :deep(svg) {
  display: block;
  width: 100%;
  height: auto;
}

.card-name {
  margin-top: 10px;
  font-size: 22px;
  font-weight: 700;
  color: #323233;
}

.card-phone {
  font-size: 20px;
  color: #1989fa;
  letter-spacing: 1px;
}

.card-tip {
  margin-top: 8px;
  font-size: 12px;
  color: #969799;
}
</style>
