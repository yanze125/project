// 智能粘贴识别：从一段自由文本（如微信消息）里提取 电话/姓名/地址
// 纯函数，便于 node 直测

const ADDR_KEYWORDS = /[路街道巷号院区栋楼层室桥站港湾]|小区|大厦|广场|机场|车站|酒店|医院|学校|公寓|中心|花园|航站楼/

export function parseCustomerText(raw) {
  let text = String(raw || '').trim()
  if (!text) return { name: '', phone: '', address: '', note: '' }

  // 电话：先归并数字间的空格/横线，再匹配手机号或固话
  let phone = ''
  const compact = text.replace(/(\d)[\s-]+(?=\d)/g, '$1')
  const m = compact.match(/1[3-9]\d{9}|0\d{2,3}-?\d{7,8}/)
  if (m) {
    phone = m[0]
    // 从原文里剔除该号码（原文可能带空格/横线分隔）
    const pattern = phone
      .split('')
      .map((ch) => ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('[\\s-]*')
    text = text.replace(new RegExp(pattern), ' ')
  }

  // 姓名：称呼模式（张先生/李女士/王师傅/刘哥/小马/老陈……）
  let name = ''
  const nm = text.match(/[一-龥]{1,3}(?:先生|女士|师傅|老师|老板|经理|总|哥|姐)|[小老][一-龥]/)
  if (nm) {
    name = nm[0]
    text = text.replace(name, ' ')
  }

  // 地址：剩余片段里含地点关键词的最长一段；其余进备注
  const parts = text
    .split(/[，,。;；\n]+/)
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
  let address = ''
  const rest = []
  for (const p of parts) {
    if (!address && ADDR_KEYWORDS.test(p)) {
      address = p
    } else if (ADDR_KEYWORDS.test(p) && p.length > address.length) {
      rest.push(address)
      address = p
    } else {
      rest.push(p)
    }
  }
  return { name, phone, address, note: rest.join('，') }
}
