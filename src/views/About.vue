<template>
  <div class="max-w-4xl mx-auto space-y-12">
    <!-- 页面标题 -->
    <div class="text-center">
      <h1 class="text-4xl font-bold text-gray-900 mb-4">关于 Word2MD Pro</h1>
      <p class="text-xl text-gray-600">专业的文档转换解决方案</p>
    </div>

    <!-- 项目简介 -->
    <section class="conversion-card">
      <h2 class="text-2xl font-semibold mb-6 flex items-center">
        <el-icon class="mr-3 text-blue-600"><InfoFilled /></el-icon>
        项目简介
      </h2>
      <div class="prose prose-gray max-w-none">
        <p class="text-lg leading-relaxed mb-4">
          Word2MD Pro 是一个强大的文档转换工具，专门设计用于将 Microsoft Word 文档(.docx)精确转换为 Markdown 格式，同时支持反向转换。
          该工具采用先进的文档解析技术，确保转换过程中保持原文档的结构、格式和内容完整性。
        </p>
        <p class="text-lg leading-relaxed">
          我们的目标是为用户提供高质量、高效率的文档转换体验，让不同格式之间的文档迁移变得简单而可靠。
        </p>
      </div>
    </section>

    <!-- 核心特性 -->
    <section class="conversion-card">
      <h2 class="text-2xl font-semibold mb-6 flex items-center">
        <el-icon class="mr-3 text-green-600"><Star /></el-icon>
        核心特性
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div v-for="feature in coreFeatures" :key="feature.id" class="flex items-start space-x-4">
          <div class="flex-shrink-0">
            <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <el-icon class="text-white" size="20">
                <component :is="feature.icon" />
              </el-icon>
            </div>
          </div>
          <div>
            <h3 class="font-semibold text-gray-900 mb-2">{{ feature.title }}</h3>
            <p class="text-gray-600">{{ feature.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 技术架构 -->
    <section class="conversion-card">
      <h2 class="text-2xl font-semibold mb-6 flex items-center">
        <el-icon class="mr-3 text-purple-600"><CPU /></el-icon>
        技术架构
      </h2>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h3 class="text-lg font-semibold mb-4">前端技术栈</h3>
          <ul class="space-y-2">
            <li v-for="tech in frontendTech" :key="tech.name" class="flex items-center space-x-3">
              <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span class="font-medium">{{ tech.name }}</span>
              <span class="text-gray-500">- {{ tech.description }}</span>
            </li>
          </ul>
        </div>
        <div>
          <h3 class="text-lg font-semibold mb-4">后端技术栈</h3>
          <ul class="space-y-2">
            <li v-for="tech in backendTech" :key="tech.name" class="flex items-center space-x-3">
              <div class="w-2 h-2 bg-green-500 rounded-full"></div>
              <span class="font-medium">{{ tech.name }}</span>
              <span class="text-gray-500">- {{ tech.description }}</span>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- 转换流程 -->
    <section class="conversion-card">
      <h2 class="text-2xl font-semibold mb-6 flex items-center">
        <el-icon class="mr-3 text-orange-600"><Operation /></el-icon>
        转换流程
      </h2>
      <div class="space-y-6">
        <div v-for="(step, index) in conversionSteps" :key="step.id" class="flex items-start space-x-4">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
              {{ index + 1 }}
            </div>
          </div>
          <div class="flex-1">
            <h3 class="font-semibold text-gray-900 mb-2">{{ step.title }}</h3>
            <p class="text-gray-600">{{ step.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 使用指南 -->
    <section class="conversion-card">
      <h2 class="text-2xl font-semibold mb-6 flex items-center">
        <el-icon class="mr-3 text-indigo-600"><Guide /></el-icon>
        使用指南
      </h2>
      <div class="space-y-6">
        <div>
          <h3 class="text-lg font-semibold mb-3">Word 转 Markdown</h3>
          <ol class="list-decimal list-inside space-y-2 text-gray-600">
            <li>选择 "Word → Markdown" 转换模式</li>
            <li>拖拽或点击上传 .docx 格式的文件</li>
            <li>配置转换参数（图片提取、LaTeX保留等）</li>
            <li>点击"开始转换"按钮</li>
            <li>下载转换后的 .md 文件</li>
          </ol>
        </div>
        <div>
          <h3 class="text-lg font-semibold mb-3">Markdown 转 Word</h3>
          <ol class="list-decimal list-inside space-y-2 text-gray-600">
            <li>选择 "Markdown → Word" 转换模式</li>
            <li>上传 .md 格式的文件</li>
            <li>设置渲染选项（数学公式、SVG等）</li>
            <li>执行转换操作</li>
            <li>下载生成的 .docx 文件</li>
          </ol>
        </div>
      </div>
    </section>

    <!-- 版本信息 -->
    <section class="conversion-card">
      <h2 class="text-2xl font-semibold mb-6 flex items-center">
        <el-icon class="mr-3 text-red-600"><Flag /></el-icon>
        版本信息
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 class="font-semibold mb-3">当前版本</h3>
          <div class="bg-gray-50 rounded-lg p-4">
            <div class="text-2xl font-bold text-blue-600 mb-2">v1.0.0</div>
            <div class="text-gray-600">发布日期: 2024年1月</div>
          </div>
        </div>
        <div>
          <h3 class="font-semibold mb-3">更新日志</h3>
          <div class="space-y-2">
            <div v-for="update in updates" :key="update.version" class="text-sm">
              <span class="font-medium text-blue-600">{{ update.version }}</span>
              <span class="text-gray-600 ml-2">{{ update.description }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 开源信息 -->
    <section class="conversion-card">
      <h2 class="text-2xl font-semibold mb-6 flex items-center">
        <el-icon class="mr-3 text-gray-600"><Share /></el-icon>
        开源贡献
      </h2>
      <div class="prose prose-gray max-w-none">
        <p class="text-lg leading-relaxed mb-4">
          Word2MD Pro 是一个开源项目，我们欢迎社区的贡献和反馈。如果你发现了bug、有功能建议或想要贡献代码，
          请访问我们的 GitHub 仓库。
        </p>
        <div class="flex flex-wrap gap-4 mt-6">
          <el-button type="primary" @click="openGitHub">
            <el-icon class="mr-2"><Link /></el-icon>
            GitHub 仓库
          </el-button>
          <el-button @click="openIssues">
            <el-icon class="mr-2"><Warning /></el-icon>
            报告问题
          </el-button>
          <el-button @click="openDocs">
            <el-icon class="mr-2"><Document /></el-icon>
            开发文档
          </el-button>
        </div>
      </div>
    </section>

    <!-- 联系信息 -->
    <section class="conversion-card">
      <h2 class="text-2xl font-semibold mb-6 flex items-center">
        <el-icon class="mr-3 text-teal-600"><Message /></el-icon>
        联系我们
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="text-center p-4 bg-gray-50 rounded-lg">
          <el-icon size="32" class="text-blue-600 mb-3"><Message /></el-icon>
          <h3 class="font-semibold mb-2">邮件支持</h3>
          <p class="text-gray-600">support@word2md.com</p>
        </div>
        <div class="text-center p-4 bg-gray-50 rounded-lg">
          <el-icon size="32" class="text-green-600 mb-3"><ChatDotRound /></el-icon>
          <h3 class="font-semibold mb-2">在线讨论</h3>
          <p class="text-gray-600">GitHub Discussions</p>
        </div>
        <div class="text-center p-4 bg-gray-50 rounded-lg">
          <el-icon size="32" class="text-purple-600 mb-3"><Document /></el-icon>
          <h3 class="font-semibold mb-2">使用文档</h3>
          <p class="text-gray-600">完整使用指南</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ElMessage } from 'element-plus'

const coreFeatures = [
  {
    id: 1,
    icon: 'DocumentCopy',
    title: '高质量转换',
    description: '保持原文档的结构和格式，确保转换后的内容质量'
  },
  {
    id: 2,
    icon: 'Calculator',
    title: 'LaTeX 公式支持',
    description: '完美支持数学公式，自动识别并转换为LaTeX格式'
  },
  {
    id: 3,
    icon: 'Picture',
    title: '图片智能处理',
    description: '自动提取并转换嵌入图片，支持多种图片格式'
  },
  {
    id: 4,
    icon: 'Grid',
    title: '复杂表格转换',
    description: '智能处理表格结构，包括合并单元格和复杂格式'
  },
  {
    id: 5,
    icon: 'Refresh',
    title: '双向转换',
    description: '支持Word转Markdown和Markdown转Word的双向转换'
  },
  {
    id: 6,
    icon: 'Files',
    title: '批量处理',
    description: '支持多文件批量转换，大幅提高工作效率'
  }
]

const frontendTech = [
  { name: 'Vue.js 3', description: '现代化前端框架' },
  { name: 'Element Plus', description: 'Vue 3 组件库' },
  { name: 'Tailwind CSS', description: '实用优先的CSS框架' },
  { name: 'Vite', description: '快速构建工具' },
  { name: 'Pinia', description: '状态管理' }
]

const backendTech = [
  { name: 'Node.js', description: 'JavaScript运行时' },
  { name: 'Express', description: 'Web应用框架' },
  { name: 'Mammoth.js', description: 'Word文档解析' },
  { name: 'Turndown', description: 'HTML到Markdown转换' },
  { name: 'KaTeX', description: '数学公式渲染' }
]

const conversionSteps = [
  {
    id: 1,
    title: '文档上传',
    description: '用户通过拖拽或点击的方式上传需要转换的文档文件'
  },
  {
    id: 2,
    title: '格式解析',
    description: '系统解析文档结构，提取文本、图片、表格等内容元素'
  },
  {
    id: 3,
    title: '内容转换',
    description: '根据目标格式要求，转换文档内容和格式标记'
  },
  {
    id: 4,
    title: '质量优化',
    description: '优化转换结果，确保格式正确和内容完整性'
  },
  {
    id: 5,
    title: '结果输出',
    description: '生成转换后的文件，提供下载或预览功能'
  }
]

const updates = [
  { version: 'v1.0.0', description: '初始版本发布，支持基础转换功能' },
  { version: 'v0.9.0', description: '添加LaTeX公式和SVG支持' },
  { version: 'v0.8.0', description: '实现双向转换功能' },
  { version: 'v0.7.0', description: '优化用户界面和交互体验' }
]

function openGitHub() {
  ElMessage.info('即将跳转到 GitHub 仓库')
  // window.open('https://github.com/your-repo/word2md-pro', '_blank')
}

function openIssues() {
  ElMessage.info('即将跳转到问题反馈页面')
  // window.open('https://github.com/your-repo/word2md-pro/issues', '_blank')
}

function openDocs() {
  ElMessage.info('即将跳转到开发文档')
  // window.open('https://docs.word2md.com', '_blank')
}
</script>

<style scoped>
.prose {
  max-width: none;
}
</style>