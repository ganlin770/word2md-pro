<template>
  <div class="dev-monitor" v-if="isVisible">
    <div class="monitor-header">
      <h3>开发监控面板</h3>
      <div class="monitor-controls">
        <el-button size="small" @click="refreshData">刷新</el-button>
        <el-button size="small" @click="clearData">清空</el-button>
        <el-button size="small" @click="exportData">导出</el-button>
        <el-button size="small" @click="toggleMonitor">
          {{ isMinimized ? '展开' : '收起' }}
        </el-button>
        <el-button size="small" @click="closeMonitor">关闭</el-button>
      </div>
    </div>
    
    <div class="monitor-content" v-if="!isMinimized">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="Console日志" name="logs">
          <div class="log-container">
            <div class="log-stats">
              总计: {{ logs.length }} 条日志
            </div>
            <div 
              v-for="(log, index) in logs.slice().reverse()" 
              :key="index"
              :class="['log-item', `log-${log.type}`]"
            >
              <span class="log-time">{{ formatTime(log.timestamp) }}</span>
              <span class="log-type">{{ log.type.toUpperCase() }}</span>
              <span class="log-message">{{ formatLogArgs(log.args) }}</span>
              <span v-if="log.source" class="log-source">[{{ log.source }}]</span>
            </div>
          </div>
        </el-tab-pane>
        
        <el-tab-pane label="网络请求" name="requests">
          <div class="request-container">
            <div class="request-stats">
              总计: {{ requests.length }} 个请求
            </div>
            <div 
              v-for="(request, index) in requests.slice().reverse()" 
              :key="index"
              :class="['request-item', getRequestStatusClass(request.status)]"
            >
              <div class="request-header">
                <span class="request-time">{{ formatTime(request.timestamp) }}</span>
                <span class="request-method">{{ request.method }}</span>
                <span class="request-url">{{ request.url }}</span>
                <span class="request-status">{{ request.status || 'PENDING' }}</span>
                <span class="request-duration">{{ request.duration ? Math.round(request.duration) + 'ms' : '' }}</span>
              </div>
              <div v-if="request.error" class="request-error">
                错误: {{ request.error }}
              </div>
            </div>
          </div>
        </el-tab-pane>
        
        <el-tab-pane label="页面性能" name="performance">
          <div class="performance-container">
            <div class="performance-metrics">
              <div class="metric">
                <label>页面加载时间:</label>
                <span>{{ pageLoadTime }}ms</span>
              </div>
              <div class="metric">
                <label>DOM内容加载:</label>
                <span>{{ domContentLoadedTime }}ms</span>
              </div>
              <div class="metric">
                <label>首次内容绘制:</label>
                <span>{{ firstContentfulPaint }}ms</span>
              </div>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const isVisible = ref(false)
const isMinimized = ref(false)
const activeTab = ref('logs')
const logs = ref([])
const requests = ref([])
const pageLoadTime = ref(0)
const domContentLoadedTime = ref(0)
const firstContentfulPaint = ref(0)

let refreshInterval = null

const refreshData = () => {
  if (window.getCapturedLogs) {
    logs.value = [...window.getCapturedLogs()]
  }
  if (window.getCapturedRequests) {
    requests.value = [...window.getCapturedRequests()]
  }
  updatePerformanceMetrics()
}

const clearData = () => {
  if (window.clearCapturedData) {
    window.clearCapturedData()
  }
  logs.value = []
  requests.value = []
}

const exportData = () => {
  const data = {
    logs: logs.value,
    requests: requests.value,
    performance: {
      pageLoadTime: pageLoadTime.value,
      domContentLoadedTime: domContentLoadedTime.value,
      firstContentfulPaint: firstContentfulPaint.value
    },
    timestamp: new Date().toISOString()
  }
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `monitoring-data-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

const toggleMonitor = () => {
  isMinimized.value = !isMinimized.value
}

const closeMonitor = () => {
  isVisible.value = false
}

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString()
}

const formatLogArgs = (args) => {
  return args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
  ).join(' ')
}

const getRequestStatusClass = (status) => {
  if (!status) return 'request-pending'
  if (status >= 200 && status < 300) return 'request-success'
  if (status >= 400) return 'request-error'
  return 'request-warning'
}

const updatePerformanceMetrics = () => {
  if (performance.timing) {
    const timing = performance.timing
    pageLoadTime.value = timing.loadEventEnd - timing.navigationStart
    domContentLoadedTime.value = timing.domContentLoadedEventEnd - timing.navigationStart
  }
  
  // 获取 First Contentful Paint
  if (performance.getEntriesByType) {
    const paintEntries = performance.getEntriesByType('paint')
    const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint')
    if (fcp) {
      firstContentfulPaint.value = Math.round(fcp.startTime)
    }
  }
}

// 键盘快捷键
const handleKeyPress = (event) => {
  // Ctrl+Shift+M 显示/隐藏监控面板
  if (event.ctrlKey && event.shiftKey && event.key === 'M') {
    isVisible.value = !isVisible.value
    if (isVisible.value) {
      refreshData()
    }
  }
}

onMounted(() => {
  // 启动自动刷新
  refreshInterval = setInterval(refreshData, 1000)
  
  // 添加键盘监听
  window.addEventListener('keydown', handleKeyPress)
  
  // 初始数据加载
  refreshData()
  
  // 暴露全局方法
  window.showDevMonitor = () => {
    isVisible.value = true
    refreshData()
  }
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
  window.removeEventListener('keydown', handleKeyPress)
})
</script>

<style scoped>
.dev-monitor {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 600px;
  max-height: 80vh;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  z-index: 9999;
  font-family: 'Courier New', monospace;
}

.monitor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  background: #f5f5f5;
  border-bottom: 1px solid #ddd;
  border-radius: 8px 8px 0 0;
}

.monitor-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: bold;
}

.monitor-controls {
  display: flex;
  gap: 5px;
}

.monitor-content {
  max-height: 60vh;
  overflow-y: auto;
  padding: 10px;
}

.log-container, .request-container, .performance-container {
  max-height: 50vh;
  overflow-y: auto;
}

.log-stats, .request-stats {
  padding: 5px 0;
  font-size: 12px;
  color: #666;
  border-bottom: 1px solid #eee;
  margin-bottom: 10px;
}

.log-item {
  display: flex;
  gap: 10px;
  padding: 3px 0;
  font-size: 11px;
  border-bottom: 1px solid #f0f0f0;
  align-items: center;
}

.log-time {
  color: #666;
  min-width: 80px;
}

.log-type {
  min-width: 50px;
  font-weight: bold;
}

.log-message {
  flex: 1;
  word-break: break-all;
}

.log-source {
  color: #999;
  font-size: 10px;
}

.log-error .log-type {
  color: #f56565;
}

.log-warn .log-type {
  color: #ed8936;
}

.log-info .log-type {
  color: #4299e1;
}

.log-log .log-type {
  color: #48bb78;
}

.request-item {
  padding: 5px 0;
  border-bottom: 1px solid #f0f0f0;
}

.request-header {
  display: flex;
  gap: 10px;
  font-size: 11px;
  align-items: center;
}

.request-time {
  color: #666;
  min-width: 80px;
}

.request-method {
  min-width: 50px;
  font-weight: bold;
}

.request-url {
  flex: 1;
  word-break: break-all;
}

.request-status {
  min-width: 60px;
  text-align: center;
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 10px;
}

.request-duration {
  min-width: 50px;
  color: #666;
}

.request-error {
  color: #f56565;
  font-size: 10px;
  margin-top: 2px;
}

.request-success .request-status {
  background: #c6f6d5;
  color: #2f855a;
}

.request-error .request-status {
  background: #fed7d7;
  color: #c53030;
}

.request-warning .request-status {
  background: #feebc8;
  color: #c05621;
}

.request-pending .request-status {
  background: #e2e8f0;
  color: #4a5568;
}

.performance-container {
  padding: 10px 0;
}

.performance-metrics {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.metric {
  display: flex;
  justify-content: space-between;
  padding: 5px 0;
  border-bottom: 1px solid #f0f0f0;
}

.metric label {
  font-weight: bold;
}

.metric span {
  color: #666;
}
</style>