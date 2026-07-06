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
    ['导出 JSON 备份', '导出 CSV', '导入 JSON 备份', '高德地图', '百度地图', '坦克大战'].every((t) => panelText.includes(t))
  )

  // 8. 外观：深色/字号切换（设置面板此时仍开着）
  const clickBtnByText = async (text) =>
    page.evaluate((t) => {
      const b = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === t)
      if (b) b.click()
      return !!b
    }, text)

  await clickBtnByText('深色')
  await new Promise((r) => setTimeout(r, 300))
  let htmlCls = await page.evaluate(() => document.documentElement.className)
  check('切深色后 html 含 van-theme-dark', htmlCls.includes('van-theme-dark'), htmlCls)
  await clickBtnByText('特大')
  await new Promise((r) => setTimeout(r, 300))
  htmlCls = await page.evaluate(() => document.documentElement.className)
  check('切特大字号后 html 含 font-xlarge', htmlCls.includes('font-xlarge'), htmlCls)
  await clickBtnByText('浅色')
  await clickBtnByText('标准')
  await new Promise((r) => setTimeout(r, 300))

  // 关闭设置面板
  await page.evaluate(() => document.querySelector('.van-popup--bottom .van-popup__close-icon')?.click())
  await new Promise((r) => setTimeout(r, 500))

  // 9. 星标置顶：默认"最近联系"排序下，星标第二张卡片应跳到第一位
  const secondName = await page.$$eval('.card .name', (els) => els[1]?.textContent.trim())
  await page.$$eval('.van-swipe-cell', (cells, target) => {
    for (const cell of cells) {
      if (cell.textContent.includes(target)) {
        const btn = [...cell.querySelectorAll('button')].find((b) => b.textContent.includes('星标'))
        btn?.click()
        return
      }
    }
  }, secondName)
  await new Promise((r) => setTimeout(r, 400))
  let firstName = await page.$eval('.card .name', (el) => el.textContent.trim())
  const hasPinIcon = await page.$('.card .pin-icon')
  check('星标后客户跳到第一且带星标图标', firstName === secondName && !!hasPinIcon, `first=${firstName}`)

  // 10. 姓名排序：星标客户仍在最前（张先生被星标时，按姓名 李<张 也不能超过星标）
  await page.click('.sort-btn')
  await new Promise((r) => setTimeout(r, 400))
  await page.evaluate(() => {
    const item = [...document.querySelectorAll('.van-action-sheet__item')].find((e) =>
      e.textContent.includes('按姓名排序')
    )
    item?.click()
  })
  await new Promise((r) => setTimeout(r, 400))
  firstName = await page.$eval('.card .name', (el) => el.textContent.trim())
  check('姓名排序下星标客户仍置顶', firstName === secondName, `first=${firstName}`)

  // 取消星标后，姓名排序生效（李女士 拼音应在 张先生 前）
  await page.$$eval('.van-swipe-cell button', (btns) => {
    btns.find((b) => b.textContent.includes('取消星标'))?.click()
  })
  await new Promise((r) => setTimeout(r, 400))
  firstName = await page.$eval('.card .name', (el) => el.textContent.trim())
  check('取消星标后按拼音排序（李在张前）', firstName === '李女士', `first=${firstName}`)

  // 11. 预约备忘：给第一位客户设预约（默认当前时间，属于24h内）
  await page.click('.card')
  await page.waitForSelector('.form-popup input', { visible: true })
  await page.evaluate(() => {
    const f = [...document.querySelectorAll('.form-popup .van-field__control')].find(
      (el) => el.placeholder === '可选，如：明早6点接机'
    )
    f?.click()
  })
  await new Promise((r) => setTimeout(r, 600))
  await clickBtnByText('下一步')
  await new Promise((r) => setTimeout(r, 400))
  await clickBtnByText('确认')
  await new Promise((r) => setTimeout(r, 400))
  const hasApptNote = await page.evaluate(() => document.body.textContent.includes('预约备注'))
  check('确认时间后出现预约备注字段', hasApptNote)
  await page.$$eval('.form-popup button', (btns) => btns.find((b) => b.textContent.includes('保存')).click())
  await new Promise((r) => setTimeout(r, 500))
  const apptBarText = await page.$eval('.appt-bar', (el) => el.textContent).catch(() => '')
  check('首页出现近期预约条目', apptBarText.includes('李女士'), apptBarText.trim().slice(0, 50))

  // 12. 姓名非必填：只填电话可保存，卡片用电话兜底显示
  await page.click('.add-fab')
  await page.waitForSelector('.form-popup input', { visible: true })
  await page.type('input[placeholder="手机号或固话"]', '13755556666')
  await page.$$eval('.form-popup button', (btns) => btns.find((b) => b.textContent.includes('保存')).click())
  await new Promise((r) => setTimeout(r, 500))
  count = (await page.$$('.card')).length
  const nameTexts = await page.$$eval('.card .name', (els) => els.map((e) => e.textContent.trim()))
  check(
    '无姓名仅电话可保存且以电话为标题',
    count === 3 && nameTexts.includes('13755556666'),
    `count=${count} names=${nameTexts.join('/')}`
  )

  // 13. 拨号记录最近联系时间——必须放浏览器断言最后：headless 中 tel: 协议
  // 触发后页面手势会被吞掉（真机无此问题），其后不能再有任何交互
  await page.evaluate(() => document.querySelector('.card .van-icon-phone')?.closest('button')?.click())
  await new Promise((r) => setTimeout(r, 400))
  const touched = await page.evaluate(() => {
    const list = JSON.parse(localStorage.getItem('taxi-contacts:customers') || '[]')
    return list.some((c) => typeof c.lastContactAt === 'number')
  })
  check('拨号后写入 lastContactAt', touched)

  // 13. 最终截图
  await page.screenshot({ path: 'C:\\Users\\10982\\AppData\\Local\\Temp\\taxi-final.png' })
  console.log('screenshot: taxi-final.png')
} finally {
  await browser.close()
}

// 14. vCard 纯函数（node 端直测）
const { buildVCF } = await import('../src/utils/backup.js')
const vcf = buildVCF([
  { name: '张三', phone: '13800000001', address: '机场', note: '常客', tags: ['机场单'] },
  { name: '无电话', phone: '', address: 'x', note: '', tags: [] },
  { name: '', phone: '13900000002', address: '', note: '', tags: [] }
])
check(
  'vCard 含 FN/TEL 且跳过无电话客户',
  vcf.count === 2 &&
    vcf.skipped === 1 &&
    vcf.content.includes('FN:张三') &&
    vcf.content.includes('TEL;TYPE=CELL:13800000001') &&
    vcf.content.includes('NOTE:') &&
    !vcf.content.includes('无电话')
)
check('vCard 空姓名用电话作 FN', vcf.content.includes('FN:13900000002'))

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
process.exit(failed.length ? 1 : 0)
