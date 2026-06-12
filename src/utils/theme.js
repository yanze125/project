// 主题与字号：通过 html 上的 class 全局生效（含 teleport 到 body 的弹层）
const media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null
let currentTheme = 'light'

function setDark(dark) {
  document.documentElement.classList.toggle('van-theme-dark', dark)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', dark ? '#1c1c1e' : '#1989fa')
}

function onSystemChange(e) {
  if (currentTheme === 'auto') setDark(e.matches)
}

export function applyTheme(theme) {
  currentTheme = theme
  if (theme === 'auto') {
    setDark(media ? media.matches : false)
  } else {
    setDark(theme === 'dark')
  }
}

if (media) media.addEventListener('change', onSystemChange)

export function applyFontSize(size) {
  const cls = document.documentElement.classList
  cls.toggle('font-large', size === 'large')
  cls.toggle('font-xlarge', size === 'xlarge')
}
