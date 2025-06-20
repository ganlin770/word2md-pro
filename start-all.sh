#!/bin/bash

# Word2MD Pro 启动脚本
echo "🚀 启动 Word2MD Pro..."

# 检查依赖
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安装"
    exit 1
fi

# 安装依赖（如果需要）
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
fi

# 检查 concurrently 是否已安装
if ! npm list concurrently > /dev/null 2>&1; then
    echo "📦 安装 concurrently..."
    npm install --save-dev concurrently
fi

echo "🔧 启动前后端服务..."
echo "📡 后端服务: http://localhost:3001"
echo "🌐 前端服务: http://localhost:5173"
echo "💡 按 Ctrl+C 停止所有服务"
echo ""

# 同时启动前后端
npm run full-dev