import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // 相对路径资源引用，适配 GitHub Pages 等子路径部署
  base: './',
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: '客户速记',
        short_name: '客户速记',
        description: '出租车司机客户联系方式与地址速记工具',
        lang: 'zh-CN',
        display: 'standalone',
        theme_color: '#1989fa',
        background_color: '#ffffff',
        icons: [
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any'
          }
        ],
        // 安卓长按桌面图标的快捷动作
        shortcuts: [
          {
            name: '新增客户',
            short_name: '新增',
            url: './?action=add',
            icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml' }]
          }
        ]
      }
    })
  ]
})
