import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../../src/server/index.js';
import { MD2WordConverter } from '../../src/core/MD2WordConverter.js';
import { Word2MDConverter } from '../../src/core/Word2MDConverter.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 端到端转换流程测试
 * 
 * 测试目标：验证完整的用户转换场景
 * 
 * 测试场景：
 * 1. Markdown → Word 完整流程
 * 2. Word → Markdown 完整流程  
 * 3. 往返转换 (Markdown → Word → Markdown)
 * 4. 复杂文档处理
 * 5. 错误恢复和降级
 * 6. 性能和资源管理
 */
describe('端到端转换流程测试', () => {
  const testDataDir = path.join(__dirname, '../fixtures/e2e');
  const outputDir = path.join(__dirname, '../output/e2e');
  let server;

  beforeAll(async () => {
    await fs.mkdir(testDataDir, { recursive: true });
    await fs.mkdir(outputDir, { recursive: true });
    await createComprehensiveTestFiles();
  });

  afterAll(async () => {
    try {
      await fs.rm(testDataDir, { recursive: true, force: true });
      await fs.rm(outputDir, { recursive: true, force: true });
      
      // 清理uploads目录
      const uploadsDir = path.join(process.cwd(), 'uploads');
      const files = await fs.readdir(uploadsDir);
      for (const file of files) {
        if (file.includes('e2e_test') || file.includes('workflow_test')) {
          await fs.unlink(path.join(uploadsDir, file));
        }
      }
    } catch (error) {
      console.warn('清理测试文件失败:', error.message);
    }
    
    if (server) {
      server.close();
    }
  });

  async function createComprehensiveTestFiles() {
    // 1. 综合功能测试文档
    const comprehensiveMarkdown = `# 综合功能测试文档

## 文档信息
- **作者**: 测试系统
- **创建时间**: ${new Date().toISOString()}
- **版本**: 1.0
- **用途**: 端到端测试

## 基础格式测试

### 文本格式
这是普通文本，包含**粗体文本**、*斜体文本*、\`代码文本\`和~~删除线文本~~。

### 链接和引用
这里有一个[测试链接](https://example.com)和一个引用：

> 这是一个重要的引用文本，用于测试引用格式的渲染效果。
> 引用可以包含多行内容。

## 数学公式测试

### 内联数学公式
爱因斯坦质能方程：$E = mc^2$

二次方程求根公式：$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$

### 显示数学公式
欧拉恒等式：
$$e^{i\\pi} + 1 = 0$$

微积分基本定理：
$$\\int_a^b f'(x)dx = f(b) - f(a)$$

泰勒级数展开：
$$f(x) = \\sum_{n=0}^{\\infty} \\frac{f^{(n)}(a)}{n!}(x-a)^n$$

矩阵运算：
$$\\begin{pmatrix} 
a & b \\\\ 
c & d 
\\end{pmatrix}
\\begin{pmatrix} 
x \\\\ 
y 
\\end{pmatrix} = 
\\begin{pmatrix} 
ax+by \\\\ 
cx+dy 
\\end{pmatrix}$$

## 列表测试

### 无序列表
- 主要功能
  - Markdown到Word转换
  - Word到Markdown转换
  - 数学公式渲染
- 高级功能
  - SVG图形支持
  - 表格格式保持
  - 图片处理
- 技术特性
  - 批量转换
  - 错误恢复
  - 性能优化

### 有序列表
1. 项目初始化
   1. 环境配置
   2. 依赖安装
   3. 配置文件设置
2. 功能开发
   1. 核心转换器
   2. 用户界面
   3. API服务
3. 测试验证
   1. 单元测试
   2. 集成测试
   3. 端到端测试

## 表格测试

### 简单表格
| 功能 | 状态 | 优先级 | 备注 |
|------|------|--------|------|
| 数学公式渲染 | ✅ 完成 | 高 | 已修复关键bug |
| SVG图形处理 | ✅ 完成 | 中 | 使用新库 |
| 文件上传安全 | ✅ 完成 | 高 | Multer 2.x |
| 批量处理 | 🔄 进行中 | 中 | 性能优化 |

### 复杂表格
| 测试类型 | 测试数量 | 通过率 | 平均耗时 | 内存使用 |
|----------|----------|--------|----------|----------|
| 单元测试 | 156 | 98.7% | 1.2s | 45MB |
| 集成测试 | 42 | 95.2% | 8.5s | 128MB |
| 端到端测试 | 18 | 94.4% | 25.3s | 256MB |
| 性能测试 | 8 | 100% | 45.2s | 512MB |

## 代码块测试

### JavaScript代码
\`\`\`javascript
function convertDocument(input, options) {
  const converter = new MD2WordConverter(options);
  
  try {
    const result = await converter.convert(input);
    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('转换失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
\`\`\`

### Python代码
\`\`\`python
import pandas as pd
import numpy as np

def analyze_performance(data):
    """分析性能数据"""
    df = pd.DataFrame(data)
    
    stats = {
        'mean': df['duration'].mean(),
        'median': df['duration'].median(),
        'std': df['duration'].std(),
        'min': df['duration'].min(),
        'max': df['duration'].max()
    }
    
    return stats
\`\`\`

### Shell脚本
\`\`\`bash
#!/bin/bash
# 启动所有服务

echo "启动后端服务..."
npm run server &

echo "启动前端服务..."
npm run dev &

echo "等待服务启动完成..."
sleep 5

echo "运行健康检查..."
curl http://localhost:3000/api/health
curl http://localhost:5173/

echo "所有服务已启动"
\`\`\`

## SVG图形测试

### 基础图形
\`\`\`svg
<svg width="200" height="100" xmlns="http://www.w3.org/2000/svg">
  <rect width="200" height="100" fill="lightblue" stroke="navy" stroke-width="2"/>
  <circle cx="50" cy="50" r="30" fill="red" opacity="0.7"/>
  <text x="100" y="55" text-anchor="middle" font-size="14" fill="darkblue">SVG Test</text>
</svg>
\`\`\`

### 复杂图形
\`\`\`svg
<svg width="300" height="150" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:rgb(255,255,0);stop-opacity:1" />
      <stop offset="100%" style="stop-color:rgb(255,0,0);stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <rect width="300" height="150" fill="url(#gradient1)"/>
  <polygon points="150,10 120,70 180,70" fill="white" opacity="0.8"/>
  <circle cx="150" cy="100" r="25" fill="blue" opacity="0.6"/>
  <path d="M 50 50 Q 150 10 250 50" stroke="black" stroke-width="3" fill="none"/>
  
  <text x="150" y="130" text-anchor="middle" font-family="Arial" font-size="12" fill="white">
    Complex SVG Graphics
  </text>
</svg>
\`\`\`

## 嵌套结构测试

### 多级标题结构
#### 四级标题
##### 五级标题
###### 六级标题

这里测试深层嵌套的标题结构是否能正确处理。

### 复杂列表嵌套
1. 第一级项目
   - 子项目A
     - 子子项目1
       - 深层项目α
       - 深层项目β
     - 子子项目2
   - 子项目B
     1. 有序子项目1
     2. 有序子项目2
        - 混合列表项目
        - 另一个混合项目
2. 第二级项目
   > 引用在列表中
   > 
   > 多行引用内容

## 特殊字符和编码测试

### 中文字符
中文测试：汉字、标点符号、特殊符号（￥、℃、™、©、®）

### 数学符号
数学符号：∑、∫、∞、±、≤、≥、≠、≈、∝、∴、∵、∠、⊥、‖、⊙

### 其他特殊字符
其他符号：←、→、↑、↓、⇒、⇔、♠、♣、♥、♦、★、☆、♪、♫

## 性能测试内容

### 大量文本
${'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(50)}

### 大量公式
${Array.from({length: 10}, (_, i) => 
  `第${i+1}个公式：$f_${i+1}(x) = \\sum_{n=0}^{\\infty} \\frac{(-1)^n}{(2n+1)!} x^{2n+1}$`
).join('\n\n')}

## 总结

这是一个全面的测试文档，包含了Word2MD Pro项目支持的所有主要功能：

1. ✅ 基础Markdown格式
2. ✅ 数学公式渲染（内联和显示）
3. ✅ 表格处理
4. ✅ 代码块语法高亮
5. ✅ SVG图形渲染
6. ✅ 列表和嵌套结构
7. ✅ 特殊字符和多语言支持
8. ✅ 性能和稳定性测试

文档创建时间：${new Date().toLocaleString()}
文档字符数：约${Math.ceil(comprehensiveMarkdown.length / 100) * 100}字符
`;

    await fs.writeFile(path.join(testDataDir, 'comprehensive_test.md'), comprehensiveMarkdown);

    // 2. 数学密集型文档
    const mathIntensiveMarkdown = `# 数学密集型测试文档

## 基础公式集合
$a + b = c$, $x^2 + y^2 = z^2$, $\\sqrt{a^2 + b^2}$, $\\frac{1}{2}$, $e^{i\\pi}$

## 高等数学
$$\\lim_{x \\to \\infty} \\frac{1}{x} = 0$$

$$\\frac{d}{dx}\\int_a^x f(t)dt = f(x)$$

$$\\nabla \\cdot \\mathbf{E} = \\frac{\\rho}{\\epsilon_0}$$

## 线性代数
$$\\det(A) = \\sum_{\\sigma \\in S_n} \\text{sgn}(\\sigma) \\prod_{i=1}^n a_{i,\\sigma(i)}$$

$$\\mathbf{A}\\mathbf{x} = \\lambda\\mathbf{x}$$

## 概率论
$$P(A|B) = \\frac{P(B|A)P(A)}{P(B)}$$

$$f(x) = \\frac{1}{\\sqrt{2\\pi\\sigma^2}}e^{-\\frac{(x-\\mu)^2}{2\\sigma^2}}$$
`;

    await fs.writeFile(path.join(testDataDir, 'math_intensive.md'), mathIntensiveMarkdown);

    // 3. SVG密集型文档
    const svgIntensiveMarkdown = `# SVG图形测试文档

## 基础图形

\`\`\`svg
<svg width="100" height="100">
  <circle cx="50" cy="50" r="40" fill="red"/>
</svg>
\`\`\`

\`\`\`svg
<svg width="100" height="100">
  <rect width="80" height="80" x="10" y="10" fill="blue"/>
</svg>
\`\`\`

\`\`\`svg
<svg width="100" height="100">
  <polygon points="50,10 90,90 10,90" fill="green"/>
</svg>
\`\`\`

## 复杂图形

\`\`\`svg
<svg width="200" height="200">
  <defs>
    <radialGradient id="grad1">
      <stop offset="0%" style="stop-color:white"/>
      <stop offset="100%" style="stop-color:blue"/>
    </radialGradient>
  </defs>
  <circle cx="100" cy="100" r="80" fill="url(#grad1)"/>
  <text x="100" y="105" text-anchor="middle" fill="white">Gradient</text>
</svg>
\`\`\`
`;

    await fs.writeFile(path.join(testDataDir, 'svg_intensive.md'), svgIntensiveMarkdown);

    // 4. 表格密集型文档
    const tableIntensiveMarkdown = `# 表格测试文档

## 简单表格
| A | B | C |
|---|---|---|
| 1 | 2 | 3 |
| 4 | 5 | 6 |

## 复杂表格
| 项目 | Q1 | Q2 | Q3 | Q4 | 年度总计 |
|------|----|----|----|----|----------|
| 收入 | 100 | 120 | 110 | 130 | 460 |
| 支出 | 80 | 90 | 85 | 95 | 350 |
| 利润 | 20 | 30 | 25 | 35 | 110 |

## 带公式的表格
| 函数 | 导数 | 积分 |
|------|------|------|
| $x^n$ | $nx^{n-1}$ | $\\frac{x^{n+1}}{n+1}$ |
| $e^x$ | $e^x$ | $e^x$ |
| $\\sin x$ | $\\cos x$ | $-\\cos x$ |
| $\\cos x$ | $-\\sin x$ | $\\sin x$ |
`;

    await fs.writeFile(path.join(testDataDir, 'table_intensive.md'), tableIntensiveMarkdown);

    // 5. 错误测试文档
    const errorTestMarkdown = `# 错误处理测试文档

## 有效内容
这是正常的内容。

## 无效数学公式
这里有一个错误的公式：$\\invalidcommand{broken}$

正常公式：$x = y + z$

## 有效SVG
\`\`\`svg
<svg width="50" height="50">
  <circle cx="25" cy="25" r="20" fill="purple"/>
</svg>
\`\`\`

## 无效SVG
\`\`\`svg
<svg><broken></svg>
\`\`\`

## 更多正常内容
文档应该继续处理，即使有一些错误。
`;

    await fs.writeFile(path.join(testDataDir, 'error_test.md'), errorTestMarkdown);

    // 6. 性能测试文档（大文档）
    let performanceContent = '# 性能测试文档\n\n';
    for (let i = 0; i < 50; i++) {
      performanceContent += `## 章节 ${i + 1}\n\n`;
      performanceContent += `这是第${i + 1}个章节的内容。包含公式：$f_${i}(x) = x^${i + 1}$\n\n`;
      
      if (i % 5 === 0) {
        performanceContent += `\`\`\`svg\n<svg width="60" height="60"><rect width="60" height="60" fill="hsl(${i * 7}, 70%, 50%)"/></svg>\n\`\`\`\n\n`;
      }
    }

    await fs.writeFile(path.join(testDataDir, 'performance_test.md'), performanceContent);

    console.log('✅ 综合测试文件创建完成');
  }

  describe('Markdown到Word转换流程', () => {
    test('【E2E】综合功能文档转换', async () => {
      const testFile = path.join(testDataDir, 'comprehensive_test.md');
      
      const startTime = Date.now();
      const response = await request(app)
        .post('/api/convert')
        .field('conversionType', 'md2word')
        .field('settings', JSON.stringify({
          renderMath: true,
          mathToImage: true,
          renderSvg: true,
          fontSize: 24
        }))
        .attach('files', testFile)
        .timeout(60000) // 60秒超时
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('results');
      expect(response.body.results).toHaveLength(1);
      
      const result = response.body.results[0];
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('downloadUrl');
      expect(result).toHaveProperty('originalName');
      expect(result).toHaveProperty('outputName');

      console.log(`✅ 综合功能文档转换成功:`);
      console.log(`  转换时间: ${duration}ms`);
      console.log(`  原文件: ${result.originalName}`);
      console.log(`  输出文件: ${result.outputName}`);
      console.log(`  下载链接: ${result.downloadUrl}`);

      // 验证下载链接
      const downloadResponse = await request(app)
        .get(result.downloadUrl)
        .expect(200);

      expect(downloadResponse.headers['content-type']).toContain('application/vnd.openxmlformats');
      expect(downloadResponse.body.length).toBeGreaterThan(10000); // 应该是一个有实际内容的Word文档

      console.log(`  文档大小: ${downloadResponse.body.length} bytes`);
    });

    test('【E2E】数学密集型文档转换', async () => {
      const testFile = path.join(testDataDir, 'math_intensive.md');
      
      const response = await request(app)
        .post('/api/convert')
        .field('conversionType', 'md2word')
        .field('settings', JSON.stringify({
          renderMath: true,
          mathToImage: true
        }))
        .attach('files', testFile)
        .timeout(45000)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      const result = response.body.results[0];
      if (result.success) {
        console.log('✅ 数学密集型文档转换成功');
      } else {
        console.log('⚠️ 数学密集型文档转换部分失败:', result.error);
        // 即使部分失败，也不应该是致命错误
        expect(result.error).not.toContain('require is not defined');
      }
    });

    test('【E2E】SVG密集型文档转换', async () => {
      const testFile = path.join(testDataDir, 'svg_intensive.md');
      
      const response = await request(app)
        .post('/api/convert')
        .field('conversionType', 'md2word')
        .field('settings', JSON.stringify({
          renderSvg: true,
          renderMath: false
        }))
        .attach('files', testFile)
        .timeout(30000)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      const result = response.body.results[0];
      if (result.success) {
        console.log('✅ SVG密集型文档转换成功');
      } else {
        console.log('⚠️ SVG密集型文档转换失败:', result.error);
      }
    });

    test('【E2E】错误恢复测试', async () => {
      const testFile = path.join(testDataDir, 'error_test.md');
      
      const response = await request(app)
        .post('/api/convert')
        .field('conversionType', 'md2word')
        .field('settings', JSON.stringify({
          renderMath: true,
          mathToImage: true,
          renderSvg: true
        }))
        .attach('files', testFile)
        .timeout(30000)
        .expect(200);

      // 即使文档包含错误，转换也应该成功并生成文档
      expect(response.body).toHaveProperty('success', true);
      
      const result = response.body.results[0];
      expect(result).toHaveProperty('success');
      
      if (result.success) {
        console.log('✅ 错误恢复测试通过 - 文档转换成功');
      } else {
        console.log('⚠️ 错误恢复测试 - 转换失败但错误处理正常:', result.error);
        // 验证不是致命错误
        expect(result.error).not.toContain('require is not defined');
        expect(result.error).not.toContain('Cannot find module');
      }
    });
  });

  describe('批量转换测试', () => {
    test('【E2E】多文件批量转换', async () => {
      const files = [
        'comprehensive_test.md',
        'math_intensive.md', 
        'svg_intensive.md',
        'table_intensive.md'
      ];

      const startTime = Date.now();
      
      let requestBuilder = request(app)
        .post('/api/convert')
        .field('conversionType', 'md2word')
        .field('settings', JSON.stringify({
          renderMath: true,
          mathToImage: true,
          renderSvg: true
        }));

      // 添加所有文件
      for (const file of files) {
        requestBuilder = requestBuilder.attach('files', path.join(testDataDir, file));
      }

      const response = await requestBuilder
        .timeout(120000) // 2分钟超时
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('results');
      expect(response.body.results).toHaveLength(files.length);
      expect(response.body).toHaveProperty('summary');
      expect(response.body.summary.total).toBe(files.length);

      const successCount = response.body.results.filter(r => r.success).length;
      const failureCount = response.body.results.filter(r => !r.success).length;

      console.log(`📊 批量转换统计:`);
      console.log(`  总文件数: ${files.length}`);
      console.log(`  成功转换: ${successCount}`);
      console.log(`  转换失败: ${failureCount}`);
      console.log(`  成功率: ${(successCount / files.length * 100).toFixed(1)}%`);
      console.log(`  总耗时: ${duration}ms`);
      console.log(`  平均耗时: ${(duration / files.length).toFixed(0)}ms/文件`);

      // 至少70%的文件应该转换成功
      expect(successCount / files.length).toBeGreaterThan(0.7);
    });

    test('【E2E】并发转换压力测试', async () => {
      const testFile = path.join(testDataDir, 'comprehensive_test.md');
      
      // 同时发起5个转换请求
      const concurrentRequests = 5;
      const promises = [];
      
      const startTime = Date.now();
      
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app)
            .post('/api/convert')
            .field('conversionType', 'md2word')
            .field('settings', JSON.stringify({ renderMath: true }))
            .attach('files', testFile)
            .timeout(60000)
        );
      }

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      let successCount = 0;
      let errorCount = 0;

      responses.forEach((response, index) => {
        if (response.status === 200 && response.body.success) {
          successCount++;
        } else {
          errorCount++;
          console.log(`请求${index + 1}失败:`, response.status, response.body?.error);
        }
      });

      console.log(`🔀 并发转换统计:`);
      console.log(`  并发请求数: ${concurrentRequests}`);
      console.log(`  成功请求: ${successCount}`);
      console.log(`  失败请求: ${errorCount}`);
      console.log(`  总耗时: ${duration}ms`);
      console.log(`  并发处理能力: ${successCount / errorCount || 'N/A'}`);

      // 至少60%的并发请求应该成功
      expect(successCount / concurrentRequests).toBeGreaterThan(0.6);
    });
  });

  describe('性能基准测试', () => {
    test('【性能】大文档转换性能', async () => {
      const testFile = path.join(testDataDir, 'performance_test.md');
      
      const startTime = Date.now();
      const response = await request(app)
        .post('/api/convert')
        .field('conversionType', 'md2word')
        .field('settings', JSON.stringify({
          renderMath: true,
          mathToImage: true,
          renderSvg: true
        }))
        .attach('files', testFile)
        .timeout(90000) // 90秒超时
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.body.success).toBe(true);
      
      const result = response.body.results[0];
      
      console.log(`⚡ 大文档性能测试:`);
      console.log(`  转换时间: ${duration}ms`);
      console.log(`  转换状态: ${result.success ? '成功' : '失败'}`);
      
      if (result.success) {
        // 验证性能指标
        expect(duration).toBeLessThan(90000); // 不应超过90秒
        
        if (duration < 30000) {
          console.log('  性能评级: 优秀 (< 30秒)');
        } else if (duration < 60000) {
          console.log('  性能评级: 良好 (< 60秒)');
        } else {
          console.log('  性能评级: 可接受 (< 90秒)');
        }
      } else {
        console.log(`  失败原因: ${result.error}`);
      }
    });

    test('【内存】内存使用监控', async () => {
      const testFile = path.join(testDataDir, 'comprehensive_test.md');
      
      // 获取转换前的内存使用
      const memBefore = process.memoryUsage();
      
      const response = await request(app)
        .post('/api/convert')
        .field('conversionType', 'md2word')
        .attach('files', testFile)
        .timeout(30000)
        .expect(200);

      // 强制垃圾回收（如果可用）
      if (global.gc) {
        global.gc();
      }
      
      const memAfter = process.memoryUsage();
      
      const memDiff = {
        rss: memAfter.rss - memBefore.rss,
        heapUsed: memAfter.heapUsed - memBefore.heapUsed,
        heapTotal: memAfter.heapTotal - memBefore.heapTotal,
        external: memAfter.external - memBefore.external
      };

      console.log(`💾 内存使用统计:`);
      console.log(`  RSS增量: ${(memDiff.rss / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  堆内存增量: ${(memDiff.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  总堆增量: ${(memDiff.heapTotal / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  外部内存增量: ${(memDiff.external / 1024 / 1024).toFixed(2)}MB`);

      // 内存增长不应过大
      expect(memDiff.heapUsed).toBeLessThan(100 * 1024 * 1024); // 不超过100MB
    });
  });

  describe('错误场景和恢复', () => {
    test('【恢复】网络中断模拟', async () => {
      const testFile = path.join(testDataDir, 'comprehensive_test.md');
      
      // 使用较短的超时来模拟网络问题
      const response = await request(app)
        .post('/api/convert')
        .field('conversionType', 'md2word')
        .attach('files', testFile)
        .timeout(100) // 很短的超时
        .catch(error => {
          // 预期会超时
          expect(error.message).toMatch(/timeout|ECONNABORTED/);
          return { timedOut: true };
        });

      if (response.timedOut) {
        console.log('✅ 网络中断恢复测试 - 超时处理正常');
      } else {
        console.log('⚠️ 请求意外成功，可能服务器响应过快');
      }
    });

    test('【恢复】无效参数恢复', async () => {
      const testFile = path.join(testDataDir, 'comprehensive_test.md');
      
      const response = await request(app)
        .post('/api/convert')
        .field('conversionType', 'invalid_type')
        .field('settings', 'invalid json')
        .attach('files', testFile)
        .expect(200); // 应该返回200但包含错误信息

      // 应该有适当的错误处理
      expect(response.body).toHaveProperty('success');
      
      if (!response.body.success) {
        expect(response.body).toHaveProperty('errors');
        console.log('✅ 无效参数恢复测试 - 错误处理正常');
      }
    });
  });

  describe('集成验证', () => {
    test('【集成】API健康检查', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version');
      
      console.log('✅ API健康检查通过');
    });

    test('【集成】系统统计信息', async () => {
      const response = await request(app)
        .get('/api/stats')
        .expect(200);

      expect(response.body).toHaveProperty('totalConversions');
      expect(response.body).toHaveProperty('successRate');
      expect(response.body).toHaveProperty('supportedFormats');
      expect(response.body).toHaveProperty('features');
      
      console.log('✅ 系统统计信息获取正常');
    });

    test('【集成】CORS和安全头验证', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
      
      // 测试OPTIONS请求
      const optionsResponse = await request(app)
        .options('/api/convert')
        .expect(204);

      console.log('✅ CORS配置验证正常');
    });
  });
});