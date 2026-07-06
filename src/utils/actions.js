// 一键拨号：手机浏览器直接唤起拨号盘
export function dial(phone) {
  window.location.href = `tel:${phone}`
}

// 一键短信：iOS 与安卓的 body 分隔符不同
export function sms(phone, text) {
  const sep = /iPhone|iPad|iPod/i.test(navigator.userAgent) ? '&' : '?'
  window.location.href = `sms:${phone}${text ? `${sep}body=${encodeURIComponent(text)}` : ''}`
}

// 复制文本：优先 Clipboard API，失败降级 execCommand
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  }
}

// 系统分享（可直接选微信好友）；不支持/被拒时降级复制
export async function shareText(text) {
  if (navigator.share) {
    try {
      await navigator.share({ text })
      return 'shared'
    } catch (e) {
      if (e.name === 'AbortError') return false // 用户取消，不再降级
    }
  }
  return (await copyText(text)) ? 'copied' : false
}

// 唤起微信 App
export function openWeixin() {
  window.location.href = 'weixin://'
}

// 当前定位（高精度，8s 超时）
export function getMyLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('不支持定位'))
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lng: pos.coords.longitude, lat: pos.coords.latitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 8000 }
    )
  })
}

// 高德地图位置标记链接（微信里可直接点开看位置）
export function buildMarkerLink(lng, lat, name = '我的位置') {
  return `https://uri.amap.com/marker?position=${lng.toFixed(6)},${lat.toFixed(6)}&name=${encodeURIComponent(name)}`
}

// 一键导航：装了对应地图 App 会唤起 App，没装则打开网页版
export function navigate(address, mapApp) {
  const kw = encodeURIComponent(address)
  const url =
    mapApp === 'baidu'
      ? `https://map.baidu.com/search/${kw}`
      : `https://uri.amap.com/search?keyword=${kw}`
  window.open(url, '_blank')
}
