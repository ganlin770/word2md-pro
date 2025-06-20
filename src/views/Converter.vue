<template>
  <div class="max-w-6xl mx-auto">
    <!-- 页面标题 -->
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-4">在线文档转换</h1>
      <p class="text-gray-600">支持 Word ↔ Markdown 双向转换，拖拽文件即可开始</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- 转换区域 -->
      <div class="lg:col-span-2 space-y-6">
        <!-- 转换类型选择 -->
        <div class="conversion-card">
          <h2 class="text-xl font-semibold mb-4 flex items-center">
            <el-icon class="mr-2 text-blue-600"><Setting /></el-icon>
            转换类型
          </h2>
          <el-radio-group v-model="conversionType" size="large" class="w-full">
            <el-radio-button label="word2md" class="flex-1">
              <div class="flex items-center justify-center space-x-2">
                <el-icon><Document /></el-icon>
                <span>Word → Markdown</span>
              </div>
            </el-radio-button>
            <el-radio-button label="md2word" class="flex-1">
              <div class="flex items-center justify-center space-x-2">
                <el-icon><DocumentCopy /></el-icon>
                <span>Markdown → Word</span>
              </div>
            </el-radio-button>
          </el-radio-group>
        </div>

        <!-- 文件上传区域 -->
        <div class="conversion-card">
          <h2 class="text-xl font-semibold mb-4 flex items-center">
            <el-icon class="mr-2 text-blue-600"><Upload /></el-icon>
            文件上传
          </h2>
          
          <el-upload
            ref="uploadRef"
            class="w-full"
            drag
            :multiple="true"
            :auto-upload="false"
            :on-change="handleFileChange"
            :accept="fileAccept"
            :show-file-list="false"
          >
            <div class="py-12">
              <el-icon size="48" class="text-gray-400 mb-4"><UploadFilled /></el-icon>
              <div class="text-lg font-medium text-gray-700 mb-2">
                拖拽文件到此处或点击上传
              </div>
              <div class="text-gray-500">
                支持 {{ conversionType === 'word2md' ? '.docx' : '.md' }} 格式，最大 10MB
              </div>
            </div>
          </el-upload>

          <!-- 已选文件列表 -->
          <div v-if="selectedFiles.length > 0" class="mt-6">
            <h3 class="font-medium text-gray-900 mb-3">已选择文件 ({{ selectedFiles.length }})</h3>
            <div class="space-y-2">
              <div 
                v-for="(file, index) in selectedFiles" 
                :key="index"
                class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div class="flex items-center space-x-3">
                  <el-icon class="text-blue-600">
                    <component :is="conversionType === 'word2md' ? 'Document' : 'DocumentCopy'" />
                  </el-icon>
                  <div>
                    <div class="font-medium text-gray-900">{{ file.name }}</div>
                    <div class="text-sm text-gray-500">{{ formatFileSize(file.size) }}</div>
                  </div>
                </div>
                <el-button 
                  type="danger" 
                  link 
                  @click="removeFile(index)"
                  :icon="'Delete'"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- 转换设置 -->
        <div class="conversion-card">
          <h2 class="text-xl font-semibold mb-4 flex items-center">
            <el-icon class="mr-2 text-blue-600"><Tools /></el-icon>
            转换设置
          </h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div v-if="conversionType === 'word2md'">
              <h3 class="font-medium mb-3">Word → Markdown 设置</h3>
              <div class="space-y-3">
                <el-checkbox v-model="settings.extractImages">提取图片</el-checkbox>
                <el-checkbox v-model="settings.preserveLatex">保留 LaTeX 公式</el-checkbox>
                <el-checkbox v-model="settings.convertSvg">转换 SVG 图形</el-checkbox>
              </div>
            </div>
            
            <div v-if="conversionType === 'md2word'">
              <h3 class="font-medium mb-3">Markdown → Word 设置</h3>
              <div class="space-y-3">
                <el-checkbox v-model="settings.renderMath">渲染数学公式</el-checkbox>
                <el-checkbox v-model="settings.mathToImage">公式转图片</el-checkbox>
                <el-checkbox v-model="settings.renderSvg">渲染 SVG</el-checkbox>
              </div>
            </div>
            
            <div>
              <h3 class="font-medium mb-3">输出设置</h3>
              <el-form-item label="图片目录:">
                <el-input v-model="settings.imageDir" placeholder="./images" />
              </el-form-item>
            </div>
          </div>
        </div>

        <!-- 转换按钮 -->
        <div class="conversion-card">
          <div class="flex items-center justify-between">
            <div class="text-gray-600">
              {{ selectedFiles.length > 0 ? `准备转换 ${selectedFiles.length} 个文件` : '请选择要转换的文件' }}
            </div>
            <div class="flex space-x-3">
              <el-button @click="clearFiles">清空</el-button>
              <el-button 
                type="primary" 
                :loading="isConverting"
                :disabled="selectedFiles.length === 0"
                @click="startConversion"
                size="large"
              >
                <el-icon class="mr-2"><RightArrow /></el-icon>
                {{ isConverting ? '转换中...' : '开始转换' }}
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 侧边栏 -->
      <div class="space-y-6">
        <!-- 转换统计 -->
        <div class="conversion-card">
          <h3 class="font-semibold mb-4 flex items-center">
            <el-icon class="mr-2 text-green-600"><DataAnalysis /></el-icon>
            转换统计
          </h3>
          <div class="space-y-3">
            <div class="flex justify-between">
              <span class="text-gray-600">总转换数:</span>
              <span class="font-semibold">{{ converterStore.totalConversions }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">成功:</span>
              <span class="font-semibold text-green-600">{{ converterStore.successfulConversions }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">失败:</span>
              <span class="font-semibold text-red-600">{{ converterStore.failedConversions }}</span>
            </div>
          </div>
        </div>

        <!-- 转换历史 -->
        <div class="conversion-card">
          <div class="flex justify-between items-center mb-4">
            <h3 class="font-semibold flex items-center">
              <el-icon class="mr-2 text-blue-600"><Clock /></el-icon>
              转换历史
            </h3>
            <el-button 
              v-if="converterStore.conversions.length > 0"
              link 
              type="danger"
              @click="converterStore.clearHistory()"
              size="small"
            >
              清空
            </el-button>
          </div>
          
          <div v-if="converterStore.conversions.length === 0" class="text-center py-8 text-gray-500">
            <el-icon size="32" class="mb-2"><DocumentCopy /></el-icon>
            <div>暂无转换记录</div>
          </div>
          
          <div v-else class="space-y-2 max-h-96 overflow-y-auto">
            <div 
              v-for="conversion in converterStore.conversions.slice(0, 10)" 
              :key="conversion.id"
              class="p-3 bg-gray-50 rounded-lg"
            >
              <div class="flex items-center justify-between mb-2">
                <span class="font-medium text-sm truncate flex-1">{{ conversion.fileName }}</span>
                <el-tag 
                  :type="conversion.status === 'success' ? 'success' : conversion.status === 'error' ? 'danger' : 'info'"
                  size="small"
                >
                  {{ getStatusText(conversion.status) }}
                </el-tag>
              </div>
              <div class="text-xs text-gray-500">
                {{ formatTime(conversion.timestamp) }}
              </div>
            </div>
          </div>
        </div>

        <!-- 帮助信息 -->
        <div class="conversion-card">
          <h3 class="font-semibold mb-4 flex items-center">
            <el-icon class="mr-2 text-yellow-600"><QuestionFilled /></el-icon>
            使用提示
          </h3>
          <div class="space-y-3 text-sm text-gray-600">
            <div class="flex items-start space-x-2">
              <el-icon class="text-blue-500 mt-0.5"><InfoFilled /></el-icon>
              <span>支持批量上传，可同时处理多个文件</span>
            </div>
            <div class="flex items-start space-x-2">
              <el-icon class="text-green-500 mt-0.5"><SuccessFilled /></el-icon>
              <span>自动识别数学公式和特殊格式</span>
            </div>
            <div class="flex items-start space-x-2">
              <el-icon class="text-purple-500 mt-0.5"><Star /></el-icon>
              <span>转换结果支持预览和下载</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 转换结果对话框 -->
    <ConversionResultDialog 
      v-model="showResultDialog"
      :results="conversionResults"
      @download="handleDownload"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage, ElNotification } from 'element-plus'
import { useConverterStore } from '@/stores/converter'
import ConversionResultDialog from '@/components/converter/ConversionResultDialog.vue'

const converterStore = useConverterStore()

// 响应式数据
const conversionType = ref('word2md')
const selectedFiles = ref([])
const isConverting = ref(false)
const showResultDialog = ref(false)
const conversionResults = ref([])
const uploadRef = ref()

// 设置
const settings = computed({
  get: () => converterStore.settings,
  set: (value) => converterStore.updateSettings(value)
})

// 文件接受类型
const fileAccept = computed(() => {
  return conversionType.value === 'word2md' ? '.docx' : '.md'
})

// 监听转换类型变化，清空已选文件
watch(conversionType, () => {
  selectedFiles.value = []
})

// 文件处理
function handleFileChange(file) {
  const maxSize = 10 * 1024 * 1024 // 10MB
  
  if (file.size > maxSize) {
    ElMessage.error('文件大小不能超过 10MB')
    return
  }
  
  const expectedExt = conversionType.value === 'word2md' ? '.docx' : '.md'
  if (!file.name.toLowerCase().endsWith(expectedExt)) {
    ElMessage.error(`请选择 ${expectedExt} 格式的文件`)
    return
  }
  
  // 检查是否已存在
  const exists = selectedFiles.value.some(f => f.name === file.name && f.size === file.size)
  if (exists) {
    ElMessage.warning('文件已存在')
    return
  }
  
  selectedFiles.value.push(file)
  ElMessage.success(`已添加文件: ${file.name}`)
}

function removeFile(index) {
  const fileName = selectedFiles.value[index].name
  selectedFiles.value.splice(index, 1)
  ElMessage.info(`已移除文件: ${fileName}`)
}

function clearFiles() {
  selectedFiles.value = []
  uploadRef.value?.clearFiles()
  ElMessage.info('已清空所有文件')
}

// 转换处理
async function startConversion() {
  if (selectedFiles.value.length === 0) {
    ElMessage.warning('请先选择要转换的文件')
    return
  }
  
  isConverting.value = true
  conversionResults.value = []
  
  try {
    for (const file of selectedFiles.value) {
      const conversionId = Date.now() + Math.random()
      
      // 添加到转换历史
      converterStore.addConversion({
        id: conversionId,
        fileName: file.name,
        type: conversionType.value,
        status: 'processing'
      })
      
      try {
        const result = await convertFile(file)
        
        // 更新转换状态
        converterStore.updateConversion(conversionId, {
          status: 'success',
          result: result
        })
        
        conversionResults.value.push({
          fileName: file.name,
          status: 'success',
          result: result
        })
        
      } catch (error) {
        console.error('转换失败:', error)
        
        // 更新转换状态
        converterStore.updateConversion(conversionId, {
          status: 'error',
          error: error.message
        })
        
        conversionResults.value.push({
          fileName: file.name,
          status: 'error',
          error: error.message
        })
      }
    }
    
    // 显示结果
    showResultDialog.value = true
    
    // 清空文件列表
    selectedFiles.value = []
    uploadRef.value?.clearFiles()
    
  } finally {
    isConverting.value = false
  }
}

async function convertFile(file) {
  const formData = new FormData()
  formData.append('files', file.raw || file)
  formData.append('conversionType', conversionType.value)
  formData.append('settings', JSON.stringify(settings.value))

  try {
    console.log('发送转换请求:', {
      fileName: file.name,
      conversionType: conversionType.value,
      url: '/api/convert'
    })

    const response = await fetch('/api/convert', {
      method: 'POST',
      body: formData
    })

    console.log('收到响应:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      url: response.url
    })

    // 检查响应是否为JSON
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      // 如果不是JSON，尝试读取文本内容以了解错误
      const text = await response.text()
      console.error('非JSON响应:', {
        contentType,
        status: response.status,
        statusText: response.statusText,
        responseText: text.substring(0, 500), // 只显示前500字符
        url: response.url
      })
      throw new Error(`服务器未返回有效的JSON响应。状态: ${response.status} ${response.statusText}。请检查浏览器控制台了解详细信息。`)
    }

    if (!response.ok) {
      throw new Error(`HTTP错误! 状态: ${response.status}`)
    }

    const result = await response.json()
    
    console.log('转换API返回的完整结果:', {
      success: result.success,
      results: result.results,
      errors: result.errors,
      summary: result.summary,
      searchingFor: file.name // 要查找的文件名
    })
    
    if (!result.success) {
      throw new Error(result.error || '转换失败')
    }

    if (result.errors && result.errors.length > 0) {
      console.log('发现转换错误:', result.errors)
      const fileError = result.errors.find(e => e.originalName === file.name)
      if (fileError) {
        throw new Error(fileError.error)
      }
    }

    const fileResult = result.results.find(r => r.originalName === file.name)
    console.log('查找转换结果:', {
      searchingFor: file.name,
      foundResult: fileResult,
      allResults: result.results.map(r => ({ originalName: r.originalName, fileName: r.fileName }))
    })
    
    if (!fileResult) {
      // 尝试通过文件名的基础部分进行匹配，忽略编码差异
      const baseName = file.name.replace(/\.[^/.]+$/, ""); // 移除扩展名
      const alternativeResult = result.results.find(r => {
        const resultBaseName = r.originalName.replace(/\.[^/.]+$/, "");
        return resultBaseName.includes(baseName) || baseName.includes(resultBaseName);
      });
      
      if (alternativeResult) {
        console.log('通过基础文件名匹配找到结果:', alternativeResult);
        return {
          content: alternativeResult.content || await downloadFile(alternativeResult.downloadUrl),
          fileName: alternativeResult.fileName,
          downloadUrl: alternativeResult.downloadUrl
        };
      }
      
      throw new Error(`未找到转换结果。上传文件名: "${file.name}"，返回的结果: ${JSON.stringify(result.results.map(r => r.originalName))}`)
    }

    return {
      content: fileResult.content || await downloadFile(fileResult.downloadUrl),
      fileName: fileResult.fileName,
      downloadUrl: fileResult.downloadUrl
    }
  } catch (error) {
    console.error('转换API调用失败:', {
      fileName: file.name,
      error: error.message,
      stack: error.stack
    })
    throw error
  }
}

async function downloadFile(url) {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      // 检查是否返回了HTML错误页面
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('text/html')) {
        throw new Error('服务器返回了HTML页面而不是文件。请确保后端服务正在运行。')
      }
      throw new Error(`下载失败: ${response.status} ${response.statusText}`)
    }
    return await response.blob()
  } catch (error) {
    console.error('文件下载失败:', error)
    throw error
  }
}

// 下载处理
function handleDownload(result) {
  try {
    if (result.downloadUrl) {
      // 使用API下载链接
      const a = document.createElement('a')
      a.href = result.downloadUrl
      a.download = result.fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } else {
      // 直接下载内容
      const blob = typeof result.content === 'string' 
        ? new Blob([result.content], { type: 'text/markdown' })
        : result.content
      
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = result.fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
    
    ElMessage.success(`${result.fileName} 下载成功`)
  } catch (error) {
    ElMessage.error('下载失败')
    console.error('下载错误:', error)
  }
}

// 工具函数
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function formatTime(date) {
  return new Date(date).toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getStatusText(status) {
  const statusMap = {
    pending: '等待中',
    processing: '转换中',
    success: '成功',
    error: '失败'
  }
  return statusMap[status] || status
}
</script>