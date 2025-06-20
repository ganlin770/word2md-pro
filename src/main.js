import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import App from './App.vue'
import router from './router'
import './style.css'

// Console日志捕获
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info
}

const capturedLogs = []

// 重写console方法
console.log = (...args) => {
  capturedLogs.push({ type: 'log', args, timestamp: new Date().toISOString() })
  originalConsole.log(...args)
}

console.error = (...args) => {
  capturedLogs.push({ type: 'error', args, timestamp: new Date().toISOString() })
  originalConsole.error(...args)
}

console.warn = (...args) => {
  capturedLogs.push({ type: 'warn', args, timestamp: new Date().toISOString() })
  originalConsole.warn(...args)
}

console.info = (...args) => {
  capturedLogs.push({ type: 'info', args, timestamp: new Date().toISOString() })
  originalConsole.info(...args)
}

// 网络请求捕获
const capturedRequests = []

// 重写fetch方法
const originalFetch = window.fetch
window.fetch = async (url, options = {}) => {
  const requestStart = performance.now()
  const requestData = {
    url,
    method: options.method || 'GET',
    headers: options.headers,
    timestamp: new Date().toISOString(),
    startTime: requestStart
  }
  
  try {
    const response = await originalFetch(url, options)
    const responseClone = response.clone()
    requestData.status = response.status
    requestData.statusText = response.statusText
    requestData.responseHeaders = Object.fromEntries(response.headers.entries())
    requestData.duration = performance.now() - requestStart
    capturedRequests.push(requestData)
    return response
  } catch (error) {
    requestData.error = error.message
    requestData.duration = performance.now() - requestStart
    capturedRequests.push(requestData)
    throw error
  }
}

// 重写XMLHttpRequest
const originalXHR = window.XMLHttpRequest
window.XMLHttpRequest = function() {
  const xhr = new originalXHR()
  const requestStart = performance.now()
  
  const originalOpen = xhr.open
  xhr.open = function(method, url, ...args) {
    this._requestData = {
      method,
      url,
      timestamp: new Date().toISOString(),
      startTime: requestStart
    }
    return originalOpen.apply(this, [method, url, ...args])
  }
  
  const originalSend = xhr.send
  xhr.send = function(data) {
    this.addEventListener('loadend', () => {
      if (this._requestData) {
        this._requestData.status = this.status
        this._requestData.statusText = this.statusText
        this._requestData.responseHeaders = this.getAllResponseHeaders()
        this._requestData.duration = performance.now() - requestStart
        capturedRequests.push(this._requestData)
      }
    })
    return originalSend.apply(this, [data])
  }
  
  return xhr
}

// 全局错误捕获
window.addEventListener('error', (event) => {
  capturedLogs.push({
    type: 'error',
    args: [event.error?.message || event.message, event.filename, event.lineno, event.colno],
    timestamp: new Date().toISOString(),
    source: 'window.error'
  })
})

window.addEventListener('unhandledrejection', (event) => {
  capturedLogs.push({
    type: 'error',
    args: ['Unhandled Promise Rejection:', event.reason],
    timestamp: new Date().toISOString(),
    source: 'unhandledrejection'
  })
})

// 将捕获的数据暴露到全局
window.getCapturedLogs = () => capturedLogs
window.getCapturedRequests = () => capturedRequests
window.clearCapturedData = () => {
  capturedLogs.length = 0
  capturedRequests.length = 0
}

const app = createApp(App)

// 注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(createPinia())
app.use(ElementPlus)
app.use(router)

// 记录应用启动
console.log('Word2MD Pro应用已启动', {
  timestamp: new Date().toISOString(),
  userAgent: navigator.userAgent,
  location: window.location.href
})

app.mount('#app')