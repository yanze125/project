function dateStr() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`
}

function download(filename, content, type) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function exportJSON(customers) {
  download(
    `客户备份-${dateStr()}.json`,
    JSON.stringify(customers, null, 2),
    'application/json'
  )
}

export function exportCSV(customers) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const header = ['姓名', '电话', '地址', '标签', '备注', '创建时间']
  const rows = customers.map((c) => [
    c.name,
    c.phone,
    c.address,
    (c.tags || []).join(' '),
    c.note,
    new Date(c.createdAt).toLocaleString('zh-CN')
  ])
  // UTF-8 BOM (U+FEFF)，保证 Excel 直接打开不乱码
  const bom = String.fromCharCode(0xfeff)
  const csv =
    bom + [header, ...rows].map((r) => r.map(esc).join(',')).join('\r\n')
  download(`客户备份-${dateStr()}.csv`, csv, 'text/csv;charset=utf-8')
}

// vCard 文本转义：逗号/分号/换行
function vesc(v) {
  return String(v ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

// 纯函数便于测试：生成 vCard 3.0 文本；无电话的客户跳过，返回 { content, count, skipped }
export function buildVCF(customers) {
  const cards = []
  let skipped = 0
  for (const c of customers) {
    if (!c.phone) {
      skipped++
      continue
    }
    const noteParts = []
    if (c.address) noteParts.push(`地址：${c.address}`)
    if (c.note) noteParts.push(`备注：${c.note}`)
    if (c.tags?.length) noteParts.push(`标签：${c.tags.join(' ')}`)
    const fn = c.name || c.phone // vCard 规范 FN 必填，空姓名用电话兜底
    const lines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${vesc(fn)}`,
      `N:${vesc(fn)};;;;`,
      `TEL;TYPE=CELL:${vesc(c.phone)}`
    ]
    if (noteParts.length) lines.push(`NOTE:${vesc(noteParts.join('；'))}`)
    lines.push('END:VCARD')
    cards.push(lines.join('\r\n'))
  }
  return { content: cards.join('\r\n'), count: cards.length, skipped }
}

export function exportVCF(customers) {
  const { content, count, skipped } = buildVCF(customers)
  if (count) download(`客户通讯录-${dateStr()}.vcf`, content, 'text/vcard;charset=utf-8')
  return { count, skipped }
}

export function readJSONFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result))
      } catch {
        reject(new Error('文件不是有效的 JSON 备份'))
      }
    }
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsText(file, 'utf-8')
  })
}
