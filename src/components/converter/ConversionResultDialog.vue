<template>
  <el-dialog
    v-model="visible"
    title="转换结果"
    width="80%"
    :close-on-click-modal="false"
  >
    <div class="space-y-6">
      <!-- 转换摘要 -->
      <div class="bg-gray-50 rounded-lg p-4">
        <h3 class="font-semibold mb-3 flex items-center">
          <el-icon class="mr-2 text-blue-600"><DataAnalysis /></el-icon>
          转换摘要
        </h3>
        <div class="grid grid-cols-3 gap-4 text-center">
          <div>
            <div class="text-2xl font-bold text-gray-900">{{ results.length }}</div>
            <div class="text-gray-600">总文件数</div>
          </div>
          <div>
            <div class="text-2xl font-bold text-green-600">{{ successCount }}</div>
            <div class="text-gray-600">成功转换</div>
          </div>
          <div>
            <div class="text-2xl font-bold text-red-600">{{ errorCount }}</div>
            <div class="text-gray-600">转换失败</div>
          </div>
        </div>
      </div>

      <!-- 转换结果列表 -->
      <div class="space-y-4">
        <div v-for="(result, index) in results" :key="index" class="border border-gray-200 rounded-lg overflow-hidden">
          <!-- 文件头部 -->
          <div class="bg-gray-50 px-4 py-3 flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <el-icon :class="result.status === 'success' ? 'text-green-600' : 'text-red-600'">
                <component :is="result.status === 'success' ? 'SuccessFilled' : 'CircleCloseFilled'" />
              </el-icon>
              <div>
                <div class="font-medium text-gray-900">{{ result.fileName }}</div>
                <div class="text-sm text-gray-500">
                  {{ result.status === 'success' ? '转换成功' : '转换失败' }}
                </div>
              </div>
            </div>
            <div class="flex space-x-2">
              <el-button 
                v-if="result.status === 'success'"
                type="primary"
                size="small"
                @click="handlePreview(result)"
              >
                <el-icon class="mr-1"><View /></el-icon>
                预览
              </el-button>
              <el-button 
                v-if="result.status === 'success'"
                type="success"
                size="small"
                @click="$emit('download', result.result)"
              >
                <el-icon class="mr-1"><Download /></el-icon>
                下载
              </el-button>
            </div>
          </div>

          <!-- 转换结果内容 -->
          <div v-if="result.status === 'success'" class="p-4">
            <div v-if="expandedResults[index]">
              <!-- 预览内容 -->
              <div class="max-h-96 overflow-y-auto bg-gray-900 rounded-lg p-4">
                <pre class="text-green-400 text-sm font-mono whitespace-pre-wrap">{{ getPreviewContent(result.result) }}</pre>
              </div>
              <div class="mt-3 flex justify-end">
                <el-button size="small" @click="toggleExpand(index)">收起</el-button>
              </div>
            </div>
            <div v-else class="text-center py-4">
              <el-button type="primary" link @click="toggleExpand(index)">
                <el-icon class="mr-1"><View /></el-icon>
                点击预览内容
              </el-button>
            </div>
          </div>

          <!-- 错误信息 -->
          <div v-else class="p-4">
            <el-alert
              :title="result.error || '转换过程中发生未知错误'"
              type="error"
              :closable="false"
            />
          </div>
        </div>
      </div>

      <!-- 批量操作 -->
      <div v-if="successCount > 0" class="bg-blue-50 rounded-lg p-4">
        <h3 class="font-semibold mb-3 text-blue-900">批量操作</h3>
        <div class="flex space-x-3">
          <el-button type="primary" @click="downloadAll">
            <el-icon class="mr-2"><Download /></el-icon>
            下载所有成功文件 ({{ successCount }})
          </el-button>
          <el-button @click="downloadAsZip">
            <el-icon class="mr-2"><Files /></el-icon>
            打包下载
          </el-button>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-between">
        <div class="text-gray-500 text-sm">
          转换完成时间: {{ new Date().toLocaleString('zh-CN') }}
        </div>
        <div class="space-x-3">
          <el-button @click="visible = false">关闭</el-button>
          <el-button v-if="errorCount > 0" type="warning" @click="retryFailed">
            <el-icon class="mr-1"><RefreshRight /></el-icon>
            重试失败项
          </el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'

// Props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  results: {
    type: Array,
    default: () => []
  }
})

// Emits
const emit = defineEmits(['update:modelValue', 'download', 'retry'])

// 响应式数据
const visible = ref(false)
const expandedResults = ref({})

// 计算属性
const successCount = computed(() => props.results.filter(r => r.status === 'success').length)
const errorCount = computed(() => props.results.filter(r => r.status === 'error').length)

// 监听器
watch(() => props.modelValue, (val) => {
  visible.value = val
})

watch(visible, (val) => {
  emit('update:modelValue', val)
  if (!val) {
    // 对话框关闭时重置展开状态
    expandedResults.value = {}
  }
})

// 方法
function toggleExpand(index) {
  expandedResults.value[index] = !expandedResults.value[index]
}

function handlePreview(result) {
  const index = props.results.indexOf(result)
  toggleExpand(index)
}

function getPreviewContent(result) {
  if (typeof result.content === 'string') {
    // Markdown 内容
    return result.content.substring(0, 2000) + (result.content.length > 2000 ? '\n\n... (内容已截断，请下载完整文件)' : '')
  } else {
    // Word 文件
    return '这是一个 Word 文档文件，无法在此预览。请下载文件查看完整内容。'
  }
}

function downloadAll() {
  const successResults = props.results.filter(r => r.status === 'success')
  successResults.forEach(result => {
    emit('download', result.result)
  })
  ElMessage.success(`开始下载 ${successResults.length} 个文件`)
}

function downloadAsZip() {
  ElMessage.info('打包下载功能正在开发中...')
  // TODO: 实现ZIP打包下载
}

function retryFailed() {
  const failedResults = props.results.filter(r => r.status === 'error')
  emit('retry', failedResults)
  ElMessage.info(`准备重试 ${failedResults.length} 个失败项`)
}
</script>

<style scoped>
.el-dialog {
  margin-top: 5vh !important;
}

pre {
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>