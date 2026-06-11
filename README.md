# 客户速记（taxi-contacts）

给出租车司机用的客户联系方式 / 地址速记工具。纯前端 PWA，数据保存在手机浏览器本地（localStorage），无需服务器和账号。

## 功能

- 记录客户：姓名、电话、地址、标签、备注
- 一键拨号（`tel:` 唤起拨号盘）、一键导航（高德 / 百度，可在设置中切换）
- 按姓名 / 电话 / 地址 / 备注模糊搜索，按标签筛选
- 导出 JSON（可再导入恢复）/ CSV（Excel 可直接打开）备份；导入按 id 去重合并
- PWA：手机浏览器"添加到主屏幕"后可全屏、离线使用
- 左滑删除 + 二次确认，防误触

## 开发

```bash
npm install
npm run dev        # 开发，--host 已开启，手机连同一 WiFi 可直接访问
npm run build      # 构建到 dist/
npm run preview    # 预览构建产物
node scripts/e2e-smoke.mjs   # 冒烟测试（需本机 Edge，先起 preview 于 4174 端口）
```

## 部署给手机用

`dist/` 是纯静态文件，任选其一：

1. 扔到任意静态托管（nginx、对象存储、Gitee/GitHub Pages 等），手机访问后"添加到主屏幕"
2. 局域网临时用：`npm run preview`，手机连同一 WiFi 访问 `http://<电脑IP>:4173`

> 注意：数据存在浏览器本地，**换手机或清浏览器数据前，先在设置里导出 JSON 备份**。
