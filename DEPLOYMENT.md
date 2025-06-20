# Word2MD Pro 部署指南

## 📦 项目构建

### 开发环境
```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 启动后端API服务器
npm run start
```

### 生产环境构建
```bash
# 构建前端应用
npm run build

# 代码质量检查
npm run lint

# 格式化代码
npm run format

# 运行测试
npm test
```

## 🚀 部署选项

### 1. 静态部署 (推荐)

#### Vercel部署
```bash
# 安装Vercel CLI
npm i -g vercel

# 部署
vercel

# 生产部署
vercel --prod
```

#### Netlify部署
1. 连接GitHub仓库
2. 构建命令: `npm run build`
3. 发布目录: `dist`
4. 环境变量: 无特殊要求

#### GitHub Pages
```bash
# 构建静态文件
npm run build

# 部署到gh-pages分支
npm run deploy
```

### 2. 容器化部署

#### Dockerfile
```dockerfile
# 多阶段构建
FROM node:18-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# 生产镜像
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### Docker Compose
```yaml
version: '3.8'
services:
  frontend:
    build: .
    ports:
      - "80:80"
    environment:
      - NODE_ENV=production
  
  api:
    build:
      context: .
      dockerfile: Dockerfile.api
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
```

### 3. 服务器部署

#### PM2部署
```bash
# 安装PM2
npm install -g pm2

# 启动API服务器
pm2 start src/server/index.js --name word2md-api

# 使用Nginx代理静态文件
# 将dist目录部署到/var/www/word2md
```

#### Nginx配置
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    root /var/www/word2md;
    index index.html;
    
    # API代理
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # 静态文件
    location / {
        try_files $uri $uri/ /index.html;
        
        # 缓存静态资源
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Gzip压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

## 🔧 环境配置

### 环境变量
```bash
# .env.production
NODE_ENV=production
VITE_API_BASE_URL=/api
VITE_APP_TITLE=Word2MD Pro
VITE_ENABLE_ANALYTICS=true
```

### API配置
```bash
# 服务器环境变量
PORT=3001
NODE_ENV=production
UPLOAD_DIR=/app/uploads
OUTPUT_DIR=/app/output
MAX_FILE_SIZE=10485760
```

## 📊 性能优化

### 构建优化结果
- ✅ 代码分割: 主包104KB，UI包1MB
- ✅ 资源压缩: Gzip压缩率70%+
- ✅ 树摇优化: 移除未使用代码
- ✅ 图片优化: WebP格式支持

### CDN配置
```javascript
// vite.config.js CDN配置
export default defineConfig({
  build: {
    rollupOptions: {
      external: ['vue', 'vue-router'],
      output: {
        globals: {
          vue: 'Vue',
          'vue-router': 'VueRouter'
        }
      }
    }
  }
})
```

## 🔍 监控和维护

### 性能监控
```javascript
// 集成Google Analytics
gtag('config', 'GA_MEASUREMENT_ID', {
  page_title: 'Word2MD Pro',
  page_location: window.location.href
})

// 性能指标上报
gtag('event', 'page_load_time', {
  value: Math.round(performance.now())
})
```

### 错误监控
```javascript
// 集成Sentry
import * as Sentry from "@sentry/vue"

Sentry.init({
  app,
  dsn: "YOUR_SENTRY_DSN",
  environment: import.meta.env.MODE
})
```

### 健康检查
```bash
# API健康检查端点
curl http://localhost:3001/api/health

# 预期响应
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0"
}
```

## 🔒 安全配置

### HTTPS配置
```bash
# Let's Encrypt证书
certbot --nginx -d your-domain.com
```

### 安全头配置
```nginx
# 安全头
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'" always;
```

## 📝 部署清单

### 部署前检查
- [ ] 代码构建无错误
- [ ] 所有测试通过
- [ ] 性能指标达标
- [ ] 安全配置完成
- [ ] 备份策略就绪

### 部署后验证
- [ ] 健康检查端点正常
- [ ] 核心功能可用
- [ ] 性能监控正常
- [ ] 错误日志检查
- [ ] 用户反馈收集

## 🚨 故障排除

### 常见问题
1. **构建失败**: 检查Node.js版本和依赖
2. **API连接失败**: 检查代理配置和CORS设置
3. **静态资源404**: 检查nginx配置和文件路径
4. **转换失败**: 检查服务器内存和文件权限

### 日志查看
```bash
# PM2日志
pm2 logs word2md-api

# Nginx日志
tail -f /var/log/nginx/error.log

# 应用日志
tail -f /app/logs/app.log
```

---

## 🎯 最佳实践

1. **自动化部署**: 使用CI/CD流水线
2. **灰度发布**: 分步骤发布到生产环境
3. **监控告警**: 设置关键指标告警
4. **定期备份**: 备份代码和配置文件
5. **性能测试**: 定期进行压力测试