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
  await page.type('input[placeholder="可选，如：张先生"]', '张先生')
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
  const nameVal = await page.$eval('input[placeholder="可选，如：张先生"]', (el) => el.value)
  check('再次打开表单已清空', nameVal === '', `value="${nameVal}"`)
  await page.type('input[placeholder="可选，如：张先生"]', '李女士')
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
    ['导出 JSON 备份', '导出 CSV', '导入 JSON 备份', '高德地图', '百度地图', '坦克大战', '雷霆战机', '短信话术'].every((t) => panelText.includes(t))
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

  // 12. 仅电话必填：只填姓名被拦截；只填电话可保存，卡片用电话兜底显示
  await page.click('.add-fab')
  await page.waitForSelector('.form-popup input', { visible: true })
  await page.type('input[placeholder="可选，如：张先生"]', '王师傅')
  await page.$$eval('.form-popup button', (btns) => btns.find((b) => b.textContent.includes('保存')).click())
  await new Promise((r) => setTimeout(r, 500))
  const blockToast = await page.evaluate(() => document.body.textContent.includes('请填写电话'))
  count = (await page.$$('.card')).length
  check('不填电话被拦截并提示', blockToast && count === 2, `toast=${blockToast} count=${count}`)
  // 清掉姓名，补电话再存
  await page.$eval('input[placeholder="可选，如：张先生"]', (el) => {
    el.value = ''
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
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

  // 13. 短信按钮与话术面板（取消关闭，不触发 sms: 协议）
  const smsBtn = await page.$('.card .sms-btn')
  check('卡片渲染短信按钮', !!smsBtn)
  await smsBtn.click()
  await new Promise((r) => setTimeout(r, 500))
  const sheetText = await page.evaluate(() => document.body.textContent)
  check('短信话术面板含默认话术', sheetText.includes('师傅已到上车点') && sheetText.includes('空白短信'))
  await page.evaluate(() => document.querySelector('.van-action-sheet__cancel')?.click())
  await new Promise((r) => setTimeout(r, 400))

  // 14. 智能粘贴识别：授权剪贴板 → 写入样例 → 点识别 → 表单被填充
  const cdp2 = await page.createCDPSession()
  await cdp2.send('Browser.grantPermissions', {
    permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'],
    origin: 'http://localhost:4174'
  })
  await page.evaluate(() => navigator.clipboard.writeText('王师傅 138 5555 0000 明早去虹桥机场T2'))
  await page.click('.add-fab')
  await page.waitForSelector('.form-popup input', { visible: true })
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.form-popup button')].find((b) => b.textContent.includes('粘贴识别'))
    b?.click()
  })
  await new Promise((r) => setTimeout(r, 500))
  const parsed = await page.evaluate(() => ({
    name: document.querySelector('input[placeholder="可选，如：张先生"]')?.value,
    phone: document.querySelector('input[placeholder="手机号或固话"]')?.value,
    address: document.querySelector('textarea[placeholder="常用上车点或目的地"]')?.value
  }))
  check(
    '粘贴识别自动填表',
    parsed.name === '王师傅' && parsed.phone === '13855550000' && (parsed.address || '').includes('虹桥机场'),
    JSON.stringify(parsed)
  )
  await page.evaluate(() => document.querySelector('.form-popup .van-popup__close-icon')?.click())
  await new Promise((r) => setTimeout(r, 400))

  // 15. 复制客户信息
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('.van-swipe-cell button')].find((b) => b.textContent.includes('复制'))
    btn?.click()
  })
  await new Promise((r) => setTimeout(r, 400))
  const copyToast = await page.evaluate(() => document.body.textContent.includes('已复制'))
  const clipVal = await page.evaluate(() => navigator.clipboard.readText().catch(() => ''))
  check('复制客户信息成功', copyToast && clipVal.includes('13755556666'), `clip="${clipVal}"`)

  // 15a. 删除可撤销：删第一张 → 撤销条出现 → 点撤销恢复原位
  const firstCardName = await page.$eval('.card .name', (el) => el.textContent.trim())
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('.van-swipe-cell button')].find((b) => b.textContent.trim() === '删除')
    btn?.click()
  })
  await new Promise((r) => setTimeout(r, 400))
  count = (await page.$$('.card')).length
  const undoBar = await page.evaluate(() => document.querySelector('.undo-bar')?.textContent || '')
  check('删除后卡片消失且撤销条出现', count === 2 && undoBar.includes('已删除'), `count=${count} bar="${undoBar.trim()}"`)
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('.undo-bar button')].find((b) => b.textContent.includes('撤销'))
    btn?.click()
  })
  await new Promise((r) => setTimeout(r, 400))
  count = (await page.$$('.card')).length
  const restoredFirst = await page.$eval('.card .name', (el) => el.textContent.trim())
  check('撤销后恢复原位', count === 3 && restoredFirst === firstCardName, `count=${count} first=${restoredFirst}`)

  // 15b. 最近联系快捷条：seed 一条 lastContactAt → 刷新出现 chip
  await page.evaluate(() => {
    const list = JSON.parse(localStorage.getItem('taxi-contacts:customers'))
    const li = list.find((c) => c.name === '李女士')
    li.lastContactAt = Date.now() - 3600 * 1000
    localStorage.setItem('taxi-contacts:customers', JSON.stringify(list))
  })
  await page.reload({ waitUntil: 'networkidle0' })
  await new Promise((r) => setTimeout(r, 500))
  const chipText = await page.evaluate(() => document.querySelector('.recent-bar')?.textContent || '')
  check('最近联系条出现且含客户名', chipText.includes('最近') && chipText.includes('李女士'), chipText.trim())

  // 15c. 姓名排序 → 拼音首字母索引条
  await page.click('.sort-btn')
  await new Promise((r) => setTimeout(r, 400))
  await page.evaluate(() => {
    const item = [...document.querySelectorAll('.van-action-sheet__item')].find((e) => e.textContent.includes('按姓名排序'))
    item?.click()
  })
  await new Promise((r) => setTimeout(r, 500))
  const sidebar = await page.evaluate(() => document.querySelector('.van-index-bar__sidebar')?.textContent || '')
  const anchors = await page.$$eval('.van-index-anchor', (els) => els.map((e) => e.textContent.trim()))
  check(
    '姓名排序出现字母索引条(#/L/Z)',
    sidebar.includes('L') && sidebar.includes('Z') && anchors.includes('#'),
    `sidebar=${sidebar} anchors=${anchors.join(',')}`
  )
  // 切回最近联系排序，后续断言不受分组影响
  await page.click('.sort-btn')
  await new Promise((r) => setTimeout(r, 400))
  await page.evaluate(() => {
    const item = [...document.querySelectorAll('.van-action-sheet__item')].find((e) => e.textContent.includes('最近联系优先'))
    item?.click()
  })
  await new Promise((r) => setTimeout(r, 400))

  // 15d. 快捷方式入口：?action=add 自动打开新增表单
  await page.goto('http://localhost:4174/?action=add', { waitUntil: 'networkidle0' })
  await new Promise((r) => setTimeout(r, 600))
  const autoForm = await page.evaluate(() => ({
    formOpen: !!document.querySelector('.form-popup input'),
    title: [...document.querySelectorAll('.form-title')].map((e) => e.textContent)[0] || '',
    urlClean: !location.search
  }))
  check('action=add 自动弹新增表单且清参数', autoForm.formOpen && autoForm.title.includes('新增') && autoForm.urlClean, JSON.stringify(autoForm))
  await page.evaluate(() => document.querySelector('.form-popup .van-popup__close-icon')?.click())
  await new Promise((r) => setTimeout(r, 400))

  // 15e. 企微推送：拦截 qyapi mock 成功响应，断言请求体
  let wecomBody = ''
  await page.setRequestInterception(true)
  page.on('request', (req) => {
    if (req.url().includes('qyapi.weixin.qq.com')) {
      if (req.method() === 'OPTIONS') {
        req.respond({
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'content-type',
            'Access-Control-Allow-Methods': 'POST'
          }
        })
        return
      }
      wecomBody = req.postData() || ''
      req.respond({
        status: 200,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: '{"errcode":0,"errmsg":"ok"}'
      })
      return
    }
    req.continue()
  })
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('taxi-contacts:settings') || '{}')
    s.wecomWebhook = 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test-key'
    s.driverName = '王师傅'
    s.driverPhone = '13900001111'
    localStorage.setItem('taxi-contacts:settings', JSON.stringify(s))
  })
  await page.reload({ waitUntil: 'networkidle0' })
  await new Promise((r) => setTimeout(r, 500))

  await page.evaluate(() => document.querySelector('.card .wx-btn')?.click())
  await new Promise((r) => setTimeout(r, 400))
  await page.evaluate(() => {
    const item = [...document.querySelectorAll('.van-action-sheet__item')].find((e) =>
      e.textContent.includes('推送到企微群')
    )
    item?.click()
  })
  await new Promise((r) => setTimeout(r, 800))
  const pushToast = await page.evaluate(() => document.body.textContent)
  check(
    '客户推送到企微群且请求体含电话',
    wecomBody.includes('13755556666') && /已推送|已发送/.test(pushToast),
    `body=${wecomBody.slice(0, 80)}`
  )

  // 15f. 预约早报推送
  wecomBody = ''
  await page.evaluate(() => document.querySelector('.daily-push-btn')?.click())
  await new Promise((r) => setTimeout(r, 800))
  check('早报推送请求体含预约与客户', wecomBody.includes('预约') && wecomBody.includes('李女士'), wecomBody.slice(0, 80))

  // 15g. 名片二维码 + 通讯录入口
  await page.click('.van-nav-bar__right .van-icon-setting-o')
  await new Promise((r) => setTimeout(r, 500))
  const settingsText = await page.evaluate(() => document.body.textContent)
  check(
    '设置含企微/名片分组，headless 隐藏通讯录导入',
    settingsText.includes('企微群机器人') && settingsText.includes('我的名片') && !settingsText.includes('从手机通讯录导入')
  )
  await page.evaluate(() => {
    const cell = [...document.querySelectorAll('.van-cell')].find((e) => e.textContent.includes('展示二维码名片'))
    cell?.click()
  })
  await new Promise((r) => setTimeout(r, 500))
  const cardInfo = await page.evaluate(() => ({
    svg: !!document.querySelector('.card-popup svg, .qr-box svg'),
    name: document.body.textContent.includes('王师傅'),
    phone: document.body.textContent.includes('13900001111')
  }))
  check('名片弹层渲染二维码与姓名电话', cardInfo.svg && cardInfo.name && cardInfo.phone, JSON.stringify(cardInfo))
  // 关名片、关设置
  await page.evaluate(() => {
    document.querySelectorAll('.van-popup__close-icon').forEach((i) => i.click())
  })
  await new Promise((r) => setTimeout(r, 500))

  // 15h. 编辑表单"存入手机通讯录"按钮
  await page.evaluate(() => document.querySelector('.card')?.click())
  await new Promise((r) => setTimeout(r, 500))
  const saveContactBtn = await page.evaluate(() =>
    [...document.querySelectorAll('.form-popup button')].some((b) => b.textContent.includes('存入手机通讯录'))
  )
  check('编辑表单含存入通讯录按钮', saveContactBtn)
  await page.evaluate(() => document.querySelector('.form-popup .van-popup__close-icon')?.click())
  await new Promise((r) => setTimeout(r, 400))

  // 16. 微信联动：按钮、面板条目、发送我的位置（headless 无 share → 降级复制）
  const wxBtn = await page.$('.card .wx-btn')
  check('卡片渲染微信按钮', !!wxBtn)
  await cdp2.send('Emulation.setGeolocationOverride', { latitude: 39.9042, longitude: 116.4074, accuracy: 10 })
  await cdp2.send('Browser.grantPermissions', {
    permissions: ['geolocation', 'clipboardReadWrite', 'clipboardSanitizedWrite'],
    origin: 'http://localhost:4174'
  })
  // headless Edge 的 navigator.share 会挂起等系统分享面板，置空强制走降级复制
  await page.evaluate(() => Object.defineProperty(navigator, 'share', { value: undefined }))
  await wxBtn.click()
  await new Promise((r) => setTimeout(r, 500))
  const wxSheet = await page.evaluate(() => document.body.textContent)
  check(
    '微信面板含话术/发位置/加好友',
    wxSheet.includes('师傅已到上车点') && wxSheet.includes('发送我的位置') && wxSheet.includes('去微信加好友'),
  )
  const geoProbe = await page.evaluate(
    () =>
      new Promise((res) => {
        navigator.geolocation.getCurrentPosition(
          (p) => res(`ok ${p.coords.longitude},${p.coords.latitude}`),
          (e) => res(`err ${e.code} ${e.message}`),
          { enableHighAccuracy: true, timeout: 8000 }
        )
      })
  )
  await page.evaluate(() => {
    const item = [...document.querySelectorAll('.van-action-sheet__item')].find((e) =>
      e.textContent.includes('发送我的位置')
    )
    item?.click()
  })
  // 定位+复制是异步链路，轮询剪贴板最多 10s
  let locClip = ''
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 500))
    locClip = await page.evaluate(() => navigator.clipboard.readText().catch(() => ''))
    if (locClip.includes('uri.amap.com/marker')) break
  }
  check(
    '发送我的位置降级复制高德链接',
    locClip.includes('uri.amap.com/marker') && locClip.includes('116.40') && locClip.includes('39.90'),
    `clip="${locClip}" geo="${geoProbe}"`
  )

  // 17. 加好友：复制号码 + 唤起 weixin://（协议触发同 tel: 吞手势，此后全用 evaluate）
  // 先写哨兵，确保断言读到的是本次复制而非上一步残留
  await page.evaluate(() => navigator.clipboard.writeText('SENTINEL'))
  await page.evaluate(() => document.querySelector('.card .wx-btn')?.click())
  await new Promise((r) => setTimeout(r, 500))
  await page.evaluate(() => {
    const item = [...document.querySelectorAll('.van-action-sheet__item')].find((e) =>
      e.textContent.includes('去微信加好友')
    )
    item?.click()
  })
  // weixin:// 会在 800ms 后触发导航并让页面失焦（此后 clipboard 读取被拒），必须赶在这之前读到
  let friendClip = ''
  for (let i = 0; i < 6; i++) {
    await new Promise((r) => setTimeout(r, 100))
    friendClip = await page.evaluate(() => navigator.clipboard.readText().catch(() => ''))
    if (friendClip === '13755556666') break
  }
  check('加好友已复制号码', friendClip === '13755556666', `clip="${friendClip}"`)
  await new Promise((r) => setTimeout(r, 600)) // 让 weixin:// 触发完再进入下一段

  // 18. 拨号记录最近联系时间——必须放浏览器断言最后：headless 中 tel: 协议
  // 触发后页面手势会被吞掉（真机无此问题），其后不能再有任何交互
  await page.evaluate(() => document.querySelector('.card .van-icon-phone')?.closest('button')?.click())
  await new Promise((r) => setTimeout(r, 400))
  const touched = await page.evaluate(() => {
    const list = JSON.parse(localStorage.getItem('taxi-contacts:customers') || '[]')
    return list.some((c) => typeof c.lastContactAt === 'number')
  })
  const lastBadge = await page.evaluate(() => document.querySelector('.last-contact')?.textContent || '')
  check('拨号后写入 lastContactAt 且卡片显示联系徽标', touched && lastBadge.includes('联系过'), lastBadge)

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

// 17. 粘贴识别纯函数直测
const { parseCustomerText } = await import('../src/utils/parse.js')
const p1 = parseCustomerText('张先生 13812345678 明天早上到首都机场T3')
check(
  '解析：称呼+手机号+地址',
  p1.name === '张先生' && p1.phone === '13812345678' && p1.address.includes('机场'),
  JSON.stringify(p1)
)
const p2 = parseCustomerText('139 1111 2222')
check('解析：纯手机号(带空格)', p2.phone === '13911112222' && !p2.name, JSON.stringify(p2))
const p3 = parseCustomerText('小李 010-64321234，朝阳区望京SOHO T1栋')
check(
  '解析：小X称呼+固话+地址',
  p3.name === '小李' && p3.phone.replace('-', '') === '01064321234' && p3.address.includes('望京'),
  JSON.stringify(p3)
)

// 18b. 拼音首字母纯函数
const { firstLetter } = await import('../src/utils/pinyin.js')
const pinyinCases = [['张三', 'Z'], ['李女士', 'L'], ['阿宝', 'A'], ['Amy', 'A'], ['138001', '#']]
check(
  '拼音首字母边界表',
  pinyinCases.every(([s, l]) => firstLetter(s) === l),
  pinyinCases.map(([s, l]) => `${s}:${firstLetter(s)}/${l}`).join(' ')
)

// 18c. manifest 含快捷方式
const { readFileSync } = await import('node:fs')
const { fileURLToPath } = await import('node:url')
const manifestPath = fileURLToPath(new globalThis.URL('../dist/manifest.webmanifest', import.meta.url))
const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
check('manifest 含新增客户快捷方式', manifest.shortcuts?.[0]?.url === './?action=add', JSON.stringify(manifest.shortcuts))

// 18b. 企微 webhook 校验 + 名片 vCard 纯函数
const { isValidWebhook } = await import('../src/utils/wecom.js')
check(
  'webhook 校验：企微地址通过、其它拒绝',
  isValidWebhook('https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=x') &&
    !isValidWebhook('https://evil.com/webhook') &&
    !isValidWebhook('')
)
const { buildNameCardText } = await import('../src/utils/backup.js')
const card = buildNameCardText('王师傅', '13900001111')
check(
  '名片 vCard 文本含 FN/TEL',
  card.includes('FN:王师傅') && card.includes('TEL;TYPE=CELL:13900001111') && card.startsWith('BEGIN:VCARD'),
)

// 19. 高德位置链接纯函数
const { buildMarkerLink } = await import('../src/utils/actions.js')
const link = buildMarkerLink(116.4074, 39.9042, '司机位置')
check(
  '高德 marker 链接格式',
  link === 'https://uri.amap.com/marker?position=116.407400,39.904200&name=' + encodeURIComponent('司机位置'),
  link
)

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
process.exit(failed.length ? 1 : 0)
