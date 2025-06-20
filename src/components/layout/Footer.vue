<template>
  <footer class="bg-gray-900 text-white">
    <div class="container mx-auto px-4 py-12">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
        <!-- 品牌信息 -->
        <div class="col-span-1 md:col-span-2">
          <div class="flex items-center space-x-2 mb-4">
            <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span class="text-white font-bold text-sm">W2M</span>
            </div>
            <span class="text-xl font-bold">Word2MD Pro</span>
          </div>
          <p class="text-gray-400 mb-4 max-w-md">
            专业的Word文档转Markdown工具，支持LaTeX公式、SVG图形、表格等复杂内容的高质量转换。
          </p>
          <div class="flex space-x-4">
            <el-button link class="text-gray-400 hover:text-white p-0">
              <el-icon size="20"><Message /></el-icon>
            </el-button>
            <el-button link class="text-gray-400 hover:text-white p-0">
              <el-icon size="20"><Share /></el-icon>
            </el-button>
            <el-button link class="text-gray-400 hover:text-white p-0">
              <el-icon size="20"><Star /></el-icon>
            </el-button>
          </div>
        </div>

        <!-- 快速链接 -->
        <div>
          <h3 class="text-lg font-semibold mb-4">快速链接</h3>
          <ul class="space-y-2">
            <li>
              <router-link to="/" class="text-gray-400 hover:text-white transition-colors">
                首页
              </router-link>
            </li>
            <li>
              <router-link to="/converter" class="text-gray-400 hover:text-white transition-colors">
                在线转换
              </router-link>
            </li>
            <li>
              <router-link to="/about" class="text-gray-400 hover:text-white transition-colors">
                关于我们
              </router-link>
            </li>
            <li>
              <a href="#" class="text-gray-400 hover:text-white transition-colors">
                使用文档
              </a>
            </li>
          </ul>
        </div>

        <!-- 技术支持 -->
        <div>
          <h3 class="text-lg font-semibold mb-4">技术支持</h3>
          <ul class="space-y-2">
            <li>
              <a href="#" class="text-gray-400 hover:text-white transition-colors">
                API文档
              </a>
            </li>
            <li>
              <a href="#" class="text-gray-400 hover:text-white transition-colors">
                常见问题
              </a>
            </li>
            <li>
              <a href="#" class="text-gray-400 hover:text-white transition-colors">
                GitHub
              </a>
            </li>
            <li>
              <a href="#" class="text-gray-400 hover:text-white transition-colors">
                反馈建议
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div class="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
        <p class="text-gray-400 text-sm">
          © 2024 Word2MD Pro. All rights reserved.
        </p>
        <div class="flex space-x-6 mt-4 md:mt-0">
          <a href="#" class="text-gray-400 hover:text-white text-sm transition-colors">
            隐私政策
          </a>
          <a href="#" class="text-gray-400 hover:text-white text-sm transition-colors">
            服务条款
          </a>
          <a href="#" class="text-gray-400 hover:text-white text-sm transition-colors">
            联系我们
          </a>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup>
// 组件逻辑
</script>