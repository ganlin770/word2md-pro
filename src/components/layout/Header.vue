<template>
  <header class="bg-white shadow-sm border-b border-gray-200">
    <div class="container mx-auto px-4">
      <div class="flex items-center justify-between h-16">
        <!-- Logo和标题 -->
        <div class="flex items-center space-x-4">
          <div class="flex items-center space-x-2">
            <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span class="text-white font-bold text-sm">W2M</span>
            </div>
            <router-link 
              to="/" 
              class="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors"
            >
              Word2MD Pro
            </router-link>
          </div>
        </div>

        <!-- 导航菜单 -->
        <nav class="hidden md:flex items-center space-x-8">
          <router-link 
            to="/" 
            class="nav-link"
            :class="{ 'nav-link-active': $route.name === 'Home' }"
          >
            首页
          </router-link>
          <router-link 
            to="/converter" 
            class="nav-link"
            :class="{ 'nav-link-active': $route.name === 'Converter' }"
          >
            在线转换
          </router-link>
          <router-link 
            to="/about" 
            class="nav-link"
            :class="{ 'nav-link-active': $route.name === 'About' }"
          >
            关于
          </router-link>
        </nav>

        <!-- 移动端菜单按钮 -->
        <div class="md:hidden">
          <el-button 
            @click="showMobileMenu = !showMobileMenu"
            :icon="showMobileMenu ? 'Close' : 'Menu'"
            circle
            size="large"
          />
        </div>
      </div>

      <!-- 移动端菜单 -->
      <div v-show="showMobileMenu" class="md:hidden py-4 border-t border-gray-200">
        <nav class="flex flex-col space-y-4">
          <router-link 
            to="/" 
            class="nav-link-mobile"
            @click="showMobileMenu = false"
          >
            首页
          </router-link>
          <router-link 
            to="/converter" 
            class="nav-link-mobile"
            @click="showMobileMenu = false"
          >
            在线转换
          </router-link>
          <router-link 
            to="/about" 
            class="nav-link-mobile"
            @click="showMobileMenu = false"
          >
            关于
          </router-link>
        </nav>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref } from 'vue'

const showMobileMenu = ref(false)
</script>

<style scoped>
.nav-link {
  @apply text-gray-600 hover:text-blue-600 font-medium transition-colors duration-200;
}

.nav-link-active {
  @apply text-blue-600;
}

.nav-link-mobile {
  @apply text-gray-600 hover:text-blue-600 font-medium py-2 transition-colors duration-200;
}
</style>