import { describe, test, expect, beforeAll, afterAll } from '@jest/globals'
import request from 'supertest'
import app from '../../src/server/index.js'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

describe('API Integration Tests', () => {
  const testDataDir = path.join(__dirname, '../fixtures')
  let server

  beforeAll(async () => {
    // 创建测试数据目录
    await fs.mkdir(testDataDir, { recursive: true })
    
    // 创建测试文件
    await createTestFiles()
  })

  afterAll(async () => {
    // 清理测试文件
    try {
      await fs.rm(testDataDir, { recursive: true, force: true })
    } catch (error) {
      console.warn('清理测试文件失败:', error.message)
    }
    
    if (server) {
      server.close()
    }
  })

  async function createTestFiles() {
    // 创建测试Markdown文件
    const testMd = `# 测试文档

这是一个测试文档，包含各种元素：

## 数学公式

内联公式: $E = mc^2$

显示公式:
$$\\frac{a}{b} = \\sqrt{c^2 + d^2}$$

## 表格

| 列1 | 列2 | 列3 |
|-----|-----|-----|
| 数据1 | 数据2 | 数据3 |
| 数据4 | 数据5 | 数据6 |

## 代码

\`\`\`javascript
function hello() {
  console.log("Hello World!");
}
\`\`\`

## 列表

- 项目1
- 项目2
  - 子项目1
  - 子项目2

1. 有序项目1
2. 有序项目2

## SVG 图形

\`\`\`svg
<svg width="100" height="100">
  <circle cx="50" cy="50" r="40" fill="blue"/>
</svg>
\`\`\`
`
    
    await fs.writeFile(path.join(testDataDir, 'test.md'), testMd)
    
    // 创建一个简单的"docx"文件用于测试 (实际不是真正的docx格式)
    await fs.writeFile(path.join(testDataDir, 'test.docx'), 'Fake docx content for testing')
  }

  describe('健康检查', () => {
    test('GET /api/health 应该返回健康状态', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200)

      expect(response.body).toHaveProperty('status', 'OK')
      expect(response.body).toHaveProperty('timestamp')
      expect(response.body).toHaveProperty('version')
    })
  })

  describe('统计信息', () => {
    test('GET /api/stats 应该返回统计数据', async () => {
      const response = await request(app)
        .get('/api/stats')
        .expect(200)

      expect(response.body).toHaveProperty('totalConversions')
      expect(response.body).toHaveProperty('successRate')
      expect(response.body).toHaveProperty('supportedFormats')
      expect(response.body).toHaveProperty('features')
      expect(Array.isArray(response.body.supportedFormats)).toBe(true)
      expect(Array.isArray(response.body.features)).toBe(true)
    })
  })

  describe('文件转换', () => {
    test('POST /api/convert 应该要求上传文件', async () => {
      const response = await request(app)
        .post('/api/convert')
        .field('conversionType', 'word2md')
        .expect(400)

      expect(response.body).toHaveProperty('success', false)
      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toContain('请上传至少一个文件')
    })

    test('POST /api/convert 应该处理Markdown转Word', async () => {
      const testFile = path.join(testDataDir, 'test.md')
      
      const response = await request(app)
        .post('/api/convert')
        .field('conversionType', 'md2word')
        .field('settings', JSON.stringify({ renderMath: true }))
        .attach('files', testFile)
        .expect(200)

      expect(response.body).toHaveProperty('success', true)
      expect(response.body).toHaveProperty('results')
      expect(response.body).toHaveProperty('summary')
      expect(response.body.summary).toHaveProperty('total', 1)
    })

    test('POST /api/convert 应该处理无效的转换类型', async () => {
      const testFile = path.join(testDataDir, 'test.md')
      
      const response = await request(app)
        .post('/api/convert')
        .field('conversionType', 'invalid_type')
        .attach('files', testFile)
        .expect(200)

      // 应该有错误信息
      expect(response.body).toHaveProperty('errors')
      expect(response.body.errors.length).toBeGreaterThan(0)
    })

    test('POST /api/convert 应该处理多个文件', async () => {
      const testFile1 = path.join(testDataDir, 'test.md')
      const testFile2 = path.join(testDataDir, 'test2.md')
      
      // 创建第二个测试文件
      await fs.writeFile(testFile2, '# 第二个测试文档\n\n这是第二个测试文档。')
      
      const response = await request(app)
        .post('/api/convert')
        .field('conversionType', 'md2word')
        .attach('files', testFile1)
        .attach('files', testFile2)
        .expect(200)

      expect(response.body).toHaveProperty('success', true)
      expect(response.body.summary).toHaveProperty('total', 2)
      
      // 清理
      await fs.unlink(testFile2)
    })

    test('POST /api/convert 应该处理设置参数', async () => {
      const testFile = path.join(testDataDir, 'test.md')
      const settings = {
        renderMath: false,
        mathToImage: true,
        renderSvg: false
      }
      
      const response = await request(app)
        .post('/api/convert')
        .field('conversionType', 'md2word')
        .field('settings', JSON.stringify(settings))
        .attach('files', testFile)
        .expect(200)

      expect(response.body).toHaveProperty('success', true)
    })
  })

  describe('文件下载', () => {
    test('GET /api/download/:filename 应该处理不存在的文件', async () => {
      const response = await request(app)
        .get('/api/download/nonexistent.md')
        .expect(404)

      expect(response.body).toHaveProperty('success', false)
      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toContain('文件不存在')
    })

    test('GET /api/download/:filename 应该防止路径遍历攻击', async () => {
      const response = await request(app)
        .get('/api/download/../../../etc/passwd')
        .expect(404)

      expect(response.body).toHaveProperty('success', false)
    })
  })

  describe('错误处理', () => {
    test('应该处理文件大小限制', async () => {
      // 创建一个大文件 (超过10MB)
      const largeContent = 'x'.repeat(11 * 1024 * 1024) // 11MB
      const largeFile = path.join(testDataDir, 'large.md')
      await fs.writeFile(largeFile, largeContent)
      
      const response = await request(app)
        .post('/api/convert')
        .field('conversionType', 'md2word')
        .attach('files', largeFile)
        .expect(400)

      expect(response.body).toHaveProperty('success', false)
      expect(response.body.error).toContain('文件大小超过限制')
      
      // 清理
      await fs.unlink(largeFile)
    })

    test('应该处理无效的JSON设置', async () => {
      const testFile = path.join(testDataDir, 'test.md')
      
      const response = await request(app)
        .post('/api/convert')
        .field('conversionType', 'md2word')
        .field('settings', 'invalid json')
        .attach('files', testFile)
        .expect(200)

      // 应该使用默认设置并成功
      expect(response.body).toHaveProperty('success', true)
    })

    test('应该处理不支持的文件类型', async () => {
      const txtFile = path.join(testDataDir, 'test.txt')
      await fs.writeFile(txtFile, 'Plain text content')
      
      const response = await request(app)
        .post('/api/convert')
        .field('conversionType', 'word2md')
        .attach('files', txtFile)
        .expect(400)

      // 清理
      await fs.unlink(txtFile)
    })
  })

  describe('API路由', () => {
    test('应该返回404对于不存在的API端点', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404)

      expect(response.body).toHaveProperty('success', false)
      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toContain('API接口不存在')
    })

    test('应该为非API请求返回前端应用', async () => {
      const response = await request(app)
        .get('/some-frontend-route')
        .expect(200)

      // 应该返回HTML内容 (前端应用)
      expect(response.headers['content-type']).toContain('text/html')
    })
  })

  describe('CORS和安全', () => {
    test('应该设置正确的CORS头', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200)

      expect(response.headers).toHaveProperty('access-control-allow-origin')
    })

    test('应该处理OPTIONS请求', async () => {
      const response = await request(app)
        .options('/api/convert')
        .expect(204)
    })
  })
})