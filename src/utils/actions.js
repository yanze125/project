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

// 一键导航：装了对应地图 App 会唤起 App，没装则打开网页版
export function navigate(address, mapApp) {
  const kw = encodeURIComponent(address)
  const url =
    mapApp === 'baidu'
      ? `https://map.baidu.com/search/${kw}`
      : `https://uri.amap.com/search?keyword=${kw}`
  window.open(url, '_blank')
}
