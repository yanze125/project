// 冒烟测试：用本机 Edge 真实走一遍 新增 → 列表 → 搜索 → 持久化 流程
import puppeteer from 'puppeteer-core'

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const URL = process.env.APP_URL || 'http://localhost:4174/'

const results = []
function check(name, ok, extra = '') {
  results.push({ name, ok, extra })
  console.log(`${ok ? 'PASS' : 'FAIL'} - ${name}${extra ? ' | ' + extra : ''}`)
}

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--no-first-run', '--disable-gpu']
})

try {
  const page = await browser.newPage()
  await page.setViewport({ width: 375, height: 800, isMobile: true, hasTouch: true })
  await page.goto(URL, { waitUntil: 'networkidle0' })

  // 1. 新增按钮可见且在视口内
  const fab = await page.waitForSelector('.add-fab', { visible: true, timeout: 5000 })
  const box = await fab.boundingBox()
  check(
    '新增按钮可见且在视口内',
    box && box.x >= 0 && box.x + box.width <= 375 && box.y + box.height <= 800,
    box ? `x=${Math.round(box.x)} y=${Math.round(box.y)} w=${Math.round(box.width)}` : 'no box'
  )

  // 2. 新增一位客户
  await fab.click()
  await page.waitForSelector('.form-popup input', { visible: true })
  await page.type('input[placeholder="姓名或称呼，如：张先生"]', '张先生')
  await page.type('input[placeholder="手机号或固话"]', '13800001234')
  await page.type('textarea[placeholder="常用上车点或目的地"]', '首都机场T3航站楼')
  await page.type('input[placeholder="输入新标签后点添加"]', '机场单')
  const addTagBtn = await page.$$eval('.form-popup button', (btns) => {
    const b = btns.find((b) => b.textContent.includes('添加'))
    if (b) b.click()
    return !!b
  })
  check('标签添加按钮存在并点击', addTagBtn)
  await page.$$eval('.form-popup button', (btns) => btns.find((b) => b.textContent.includes('保存')).click())
  await page.waitForSelector('.card', { visible: true, timeout: 5000 })
  const cardText = await page.$eval('.card', (el) => el.textContent)
  check('列表出现新客户', cardText.includes('张先生') && cardText.includes('13800001234') && cardText.includes('机场单'), cardText.trim().slice(0, 60))

  // 3. 拨号 / 导航按钮存在
  const phoneBtn = await page.$('.card .van-icon-phone')
  const naviBtn = await page.$('.card .van-icon-guide-o')
  check('拨号按钮渲染', !!phoneBtn)
  check('导航按钮渲染', !!naviBtn)

  // 4. 再加一位不带地址的客户，验证搜索过滤
  await page.waitForSelector('.van-overlay', { hidden: true, timeout: 5000 })
  await page.click('.add-fab')
  await page.waitForSelector('.form-popup input', { visible: true })
  const nameVal = await page.$eval('input[placeholder="姓名或称呼，如：张先生"]', (el) => el.value)
  check('再次打开表单已清空', nameVal === '', `value="${nameVal}"`)
  await page.type('input[placeholder="姓名或称呼，如：张先生"]', '李女士')
  await page.type('input[placeholder="手机号或固话"]', '13911112222')
  await page.$$eval('.form-popup button', (btns) => btns.find((b) => b.textContent.includes('保存')).click())
  await new Promise((r) => setTimeout(r, 500))
  let count = (await page.$$('.card')).length
  check('两位客户都在列表', count === 2, `count=${count}`)

  await page.type('.van-search input', '机场')
  await new Promise((r) => setTimeout(r, 300))
  const searchVal = await page.$eval('.van-search input', (el) => el.value)
  count = (await page.$$('.card')).length
  check('搜索"机场"只剩一位', count === 1, `count=${count} inputValue="${searchVal}"`)
  await page.$eval('.van-search input', (el) => {
    el.value = ''
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await new Promise((r) => setTimeout(r, 300))

  // 5. 标签筛选
  const tagBarExists = await page.$('.tag-bar .van-tag')
  check('标签栏出现历史标签', !!tagBarExists)
  if (tagBarExists) {
    await tagBarExists.click()
    await new Promise((r) => setTimeout(r, 300))
    const tagClass = await page.$eval('.tag-bar .van-tag', (el) => el.className)
    count = (await page.$$('.card')).length
    check('点标签筛选后只剩一位', count === 1, `count=${count} tagClass="${tagClass}"`)
    await tagBarExists.click()
    await new Promise((r) => setTimeout(r, 300))
  }

  // 6. 刷新后数据持久化
  await page.reload({ waitUntil: 'networkidle0' })
  await new Promise((r) => setTimeout(r, 500))
  count = (await page.$$('.card')).length
  check('刷新后数据仍在（localStorage 持久化）', count === 2, `count=${count}`)

  // 7. 设置面板：导出/导入入口与地图选择
  await page.click('.van-nav-bar__right .van-icon-setting-o')
  await new Promise((r) => setTimeout(r, 500))
  const panelText = await page.evaluate(() => document.body.textContent)
  check(
    '设置面板包含导出/导入/地图选项',
    ['导出 JSON 备份', '导出 CSV', '导入 JSON 备份', '高德地图', '百度地图'].every((t) => panelText.includes(t))
  )

  // 8. 最终截图
  await page.screenshot({ path: 'C:\\Users\\10982\\AppData\\Local\\Temp\\taxi-final.png' })
  console.log('screenshot: taxi-final.png')
} finally {
  await browser.close()
}

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
process.exit(failed.length ? 1 : 0)
