# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**taxi-contacts（客户速记）** — 给出租车司机用的客户联系方式/地址速记工具。纯前端 PWA（Vue 3 + Vant 4 + Vite），**无后端、无账号**：数据全部存在浏览器 localStorage，备份靠设置面板的 JSON/CSV 导出导入。UI 面向开车场景：大按钮、列表直接露出拨号/导航操作、删除和清空都有确认防误触。

## Commands

```bash
npm run dev        # 开发服务器（--host 已开，手机连同一 WiFi 可访问）
npm run build      # 构建到 dist/
npm run preview    # 预览构建产物（4173 端口）

# 冒烟测试（puppeteer-core 驱动本机 Edge，需先起 4174 端口的 preview）
npx vite preview --port 4174 --strictPort   # 注意：不能用 npm run preview -- --port 4174，
                                            # preview 脚本自带 --host 会把端口当主机名
node scripts/e2e-smoke.mjs                  # 12 项断言：新增/搜索/标签/持久化等
```

无 lint / 单测框架；验证手段就是 `npm run build` + 冒烟脚本。新增功能时参照 `scripts/e2e-smoke.mjs` 的写法补断言（弹层有动画，点击前需等 ~400ms 或用 DOM 原生 `el.click()`）。

## Architecture

单页应用，**无路由**——所有二级界面（新增/编辑表单、设置）都是 Vant 底部弹层（`van-popup`），由 `App.vue` 统一持有 show 状态。

数据流核心是 `src/store/customers.js`：模块级 `reactive` 单例 state（customers + settings），所有写操作（add/update/remove/merge/clear）在此完成并同步 `persist()` 到 localStorage（key：`taxi-contacts:customers` / `taxi-contacts:settings`）。组件不直接碰 localStorage。导入合并按 id 去重、不覆盖已有数据。

- `src/components/CustomerList.vue` — 列表卡片，左滑删除 + Dialog 二次确认；拨号/导航按钮
- `src/components/CustomerForm.vue` — 新增/编辑共用表单弹层，标签自由输入 + 历史标签点选
- `src/components/SettingsPanel.vue` — 地图选择（高德/百度）、导出/导入、一键清空（双重确认）
- `src/utils/actions.js` — 拨号（`tel:`）与导航（高德/百度 URL，装了 App 会被唤起）
- `src/utils/backup.js` — JSON/CSV 导出（CSV 带 BOM 供 Excel）、JSON 导入解析

Vant 是全量引入（`app.use(Vant)` + 全量 CSS），无需按需配置。

## 移动端约束（改动时勿破坏）

- `vite.config.js` 的 `base: './'`：相对路径构建，适配 GitHub Pages 子路径等任意部署位置，**不要改回绝对路径**
- `index.html` viewport 锁缩放（`user-scalable=no` 等）+ `App.vue` 全局 `touch-action: manipulation` + `main.js` 拦截 `gesturestart`：三层配合修复微信里捏合/双击把页面缩成小卡片的问题
- PWA 为 `autoUpdate` 模式（vite-plugin-pwa）；安装后完全离线可用，验证线上改动时注意微信页面缓存和旧 service worker 要重进两次才生效

## Deployment

线上地址：**https://yanze125.github.io/project/**（GitHub Pages，gh-pages 分支）。

```bash
npm run build
npx gh-pages -d dist -r https://<token>@github.com/yanze125/project.git   # 发布页面
git push origin main                                                      # 源码（GitHub）
git push gitee main                                                       # 源码镜像（gitee.com/yanzer/taxi）
```

token 为 GitHub fine-grained PAT（仅需 yanze125/project 仓库的 Contents 读写），用完即删、发版时再生成。

国内托管曾踩过的坑（勿重试）：腾讯云 COS 与 EdgeOne Pages 2024 年后对默认域名一律强制下载/仅 token 预览，**没有已备案自定义域名就只能用 GitHub Pages**；Gitee Pages 已停服。
