// 拼音首字母：无词库方案——用边界汉字表 + 中文排序规则定位区间
// 边界字取各字母拼音区间的起始常用字（GB2312 一级字库排序惯例）
const BOUNDARIES = [
  ['A', '阿'], ['B', '芭'], ['C', '擦'], ['D', '搭'], ['E', '蛾'],
  ['F', '发'], ['G', '噶'], ['H', '哈'], ['J', '击'], ['K', '喀'],
  ['L', '垃'], ['M', '妈'], ['N', '拿'], ['O', '哦'], ['P', '啪'],
  ['Q', '期'], ['R', '然'], ['S', '撒'], ['T', '塌'], ['W', '挖'],
  ['X', '昔'], ['Y', '压'], ['Z', '匝']
]

const collator = new Intl.Collator('zh-Hans-CN')

export function firstLetter(str) {
  const ch = String(str || '').trim().charAt(0)
  if (!ch) return '#'
  if (/[a-zA-Z]/.test(ch)) return ch.toUpperCase()
  if (!/[一-龥]/.test(ch)) return '#'
  let letter = '#'
  for (const [l, boundary] of BOUNDARIES) {
    if (collator.compare(ch, boundary) >= 0) letter = l
    else break
  }
  return letter
}
