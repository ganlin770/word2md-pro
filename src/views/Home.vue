<template>
  <div class="space-y-16">
    <!-- 英雄区域 -->
    <section class="text-center py-20">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-5xl font-bold text-gray-900 mb-6">
          专业的 <span class="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Word to Markdown</span> 转换工具
        </h1>
        <p class="text-xl text-gray-600 mb-8 leading-relaxed">
          支持LaTeX数学公式、SVG图形、复杂表格的高质量双向转换，让文档处理变得简单而优雅
        </p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <el-button 
            type="primary" 
            size="large"
            @click="$router.push('/converter')"
            class="px-8 py-3"
          >
            <el-icon class="mr-2"><Upload /></el-icon>
            开始转换
          </el-button>
          <el-button 
            size="large"
            @click="scrollToFeatures"
            class="px-8 py-3"
          >
            <el-icon class="mr-2"><InfoFilled /></el-icon>
            了解更多
          </el-button>
        </div>
      </div>
    </section>

    <!-- 功能特性 -->
    <section ref="featuresSection" class="py-16">
      <div class="text-center mb-12">
        <h2 class="text-3xl font-bold text-gray-900 mb-4">强大功能</h2>
        <p class="text-gray-600 max-w-2xl mx-auto">
          Word2MD Pro 提供业界领先的文档转换技术，确保转换质量和效率
        </p>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div v-for="feature in features" :key="feature.id" class="feature-card">
          <div class="text-center">
            <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <el-icon size="24" class="text-white">
                <component :is="feature.icon" />
              </el-icon>
            </div>
            <h3 class="text-xl font-semibold text-gray-900 mb-3">{{ feature.title }}</h3>
            <p class="text-gray-600 leading-relaxed">{{ feature.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 使用统计 -->
    <section class="py-16 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl">
      <div class="text-center">
        <h2 class="text-3xl font-bold text-gray-900 mb-12">用户信赖</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div v-for="stat in stats" :key="stat.label" class="text-center">
            <div class="text-3xl font-bold text-blue-600 mb-2">{{ stat.value }}</div>
            <div class="text-gray-600">{{ stat.label }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- 转换演示 -->
    <section class="py-16">
      <div class="text-center mb-12">
        <h2 class="text-3xl font-bold text-gray-900 mb-4">转换效果演示</h2>
        <p class="text-gray-600 max-w-2xl mx-auto">
          查看 Word 文档转换为 Markdown 的实际效果
        </p>
      </div>
      
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- Word 示例 -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div class="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <h3 class="font-semibold text-gray-900 flex items-center">
              <el-icon class="mr-2 text-blue-600"><Document /></el-icon>
              Word 文档
            </h3>
          </div>
          <div class="p-6">
            <div class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 text-sm">
              <h4 class="font-bold text-lg mb-3">数学公式示例</h4>
              <p class="mb-4">Einstein's mass-energy equivalence:</p>
              <div class="bg-white rounded p-4 font-mono text-center">
                E = mc²
              </div>
              <p class="mt-4">这是一个**重要**的物理定律。</p>
            </div>
          </div>
        </div>

        <!-- Markdown 示例 -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div class="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <h3 class="font-semibold text-gray-900 flex items-center">
              <el-icon class="mr-2 text-green-600"><DocumentCopy /></el-icon>
              Markdown 输出
            </h3>
          </div>
          <div class="p-6">
            <div class="bg-gray-900 rounded-lg p-6 text-sm text-green-400 font-mono">
              <div class="text-yellow-400"># 数学公式示例</div>
              <div class="mt-2">Einstein's mass-energy equivalence:</div>
              <div class="mt-2 text-blue-400">$$E = mc^2$$</div>
              <div class="mt-2">这是一个<span class="text-orange-400">**重要**</span>的物理定律。</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 行动号召 -->
    <section class="py-16 text-center bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl text-white">
      <div class="max-w-3xl mx-auto">
        <h2 class="text-3xl font-bold mb-4">准备好开始转换了吗？</h2>
        <p class="text-xl mb-8 opacity-90">
          立即体验 Word2MD Pro 的强大功能，让文档转换变得简单高效
        </p>
        <el-button 
          type="default"
          size="large"
          @click="$router.push('/converter')"
          class="px-8 py-3 bg-white text-blue-600 hover:bg-gray-100"
        >
          <el-icon class="mr-2"><RightArrow /></el-icon>
          开始转换
        </el-button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useConverterStore } from '@/stores/converter'

const converterStore = useConverterStore()
const featuresSection = ref(null)

const features = [
  {
    id: 1,
    icon: 'DocumentCopy',
    title: '高质量转换',
    description: '保持原文档的结构和格式，确保转换后的Markdown质量'
  },
  {
    id: 2,
    icon: 'Calculator',
    title: 'LaTeX公式支持',
    description: '完美支持数学公式，自动识别并转换为LaTeX格式'
  },
  {
    id: 3,
    icon: 'Picture',
    title: '图片智能处理',
    description: '自动提取并转换嵌入图片，支持SVG等多种格式'
  },
  {
    id: 4,
    icon: 'Grid',
    title: '表格完美转换',
    description: '智能处理复杂表格结构，包括合并单元格'
  },
  {
    id: 5,
    icon: 'Refresh',
    title: '双向转换',
    description: '支持Word转Markdown和Markdown转Word双向转换'
  },
  {
    id: 6,
    icon: 'Files',
    title: '批量处理',
    description: '支持多文件批量转换，提高工作效率'
  }
]

const stats = [
  { value: '10K+', label: '转换文档' },
  { value: '500+', label: '活跃用户' },
  { value: '99.9%', label: '转换成功率' },
  { value: '24/7', label: '在线服务' }
]

function scrollToFeatures() {
  featuresSection.value?.scrollIntoView({ behavior: 'smooth' })
}
</script>