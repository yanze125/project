// 一键拨号：手机浏览器直接唤起拨号盘
export function dial(phone) {
  window.location.href = `tel:${phone}`
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
