import { createApp } from 'vue'
import Vant from 'vant'
import 'vant/lib/index.css'
import App from './App.vue'

// iOS Safari/微信忽略 user-scalable=no 时的捏合缩放兜底
document.addEventListener('gesturestart', (e) => e.preventDefault())

createApp(App).use(Vant).mount('#app')
