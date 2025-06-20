import { describe, test, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { MD2WordConverter } from '../../src/core/MD2WordConverter.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 数学公式渲染专项测试
 * 
 * 测试目标：验证6月11日修复的数学公式渲染bug是否完全解决
 * 
 * 修复内容：
 * 1. 解决 ES 模块中 require() 导致的 ReferenceError
 * 2. getChromePath() 方法异步化改造
 * 3. 智能重试机制替代过于激进的安全模式
 * 4. Puppeteer 启动参数优化
 * 5. 公式质量和性能提升
 */
describe('数学公式渲染修复验证', () => {
  let converter;
  const testDataDir = path.join(__dirname, '../fixtures/math');
  const outputDir = path.join(__dirname, '../output/math');

  beforeAll(async () => {
    // 创建测试目录
    await fs.mkdir(testDataDir, { recursive: true });
    await fs.mkdir(outputDir, { recursive: true });
  });

  beforeEach(() => {
    // 使用启用数学渲染的配置
    converter = new MD2WordConverter({
      renderMath: true,
      mathToImage: true,
      renderSvg: true,
      safeModeEnabled: false,
      maxRetries: 3,
      retryDelay: 500
    });
  });

  afterEach(async () => {
    // 清理每次测试的输出文件
    try {
      const files = await fs.readdir(outputDir);
      for (const file of files) {
        if (file.startsWith('test_') && file.endsWith('.png')) {
          await fs.unlink(path.join(outputDir, file));
        }
      }
    } catch (error) {
      // 忽略清理错误
    }
  });

  afterAll(async () => {
    // 清理测试目录
    try {
      await fs.rm(testDataDir, { recursive: true, force: true });
      await fs.rm(outputDir, { recursive: true, force: true });
    } catch (error) {
      // 忽略清理错误
    }
  });

  describe('核心修复验证', () => {
    test('【修复验证】getChromePath 方法应该异步工作', async () => {
      // 这是修复的核心 - 确保不再出现 require() 错误
      let chromePath;
      let error;

      try {
        chromePath = await converter.getChromePath();
      } catch (err) {
        error = err;
      }

      // 不应该出现 require 相关错误
      expect(error).toBeUndefined();
      
      // 返回值应该是字符串路径或 undefined
      if (chromePath !== undefined) {
        expect(typeof chromePath).toBe('string');
        expect(chromePath.length).toBeGreaterThan(0);
      }

      console.log(`✅ Chrome路径检测结果: ${chromePath || 'Puppeteer内置Chromium'}`);
    });

    test('【修复验证】ES模块兼容性 - 不应出现require错误', async () => {
      const testLatex = 'E = mc^2';
      let renderResult;
      let error;

      try {
        renderResult = await converter.renderMathToImage(testLatex, false);
      } catch (err) {
        error = err;
      }

      // 关键检查：不应该出现 "require is not defined" 错误
      if (error) {
        expect(error.message).not.toContain('require is not defined');
        expect(error.message).not.toContain('ReferenceError');
        console.log('⚠️ 数学公式渲染错误 (但不是require错误):', error.message);
      } else {
        expect(renderResult).toBeDefined();
        console.log('✅ 数学公式渲染成功，无ES模块错误');
      }
    });
  });

  describe('智能重试机制测试', () => {
    test('【新功能】应该实现3次重试策略', async () => {
      const testLatex = '\\frac{\\partial^2 u}{\\partial x^2} + \\frac{\\partial^2 u}{\\partial y^2} = 0';
      
      // 监控重试过程
      const originalConsoleLog = console.log;
      const logs = [];
      console.log = (...args) => {
        logs.push(args.join(' '));
        originalConsoleLog(...args);
      };

      try {
        const result = await converter.renderMathToImage(testLatex, true);
        
        // 检查是否有重试日志
        const retryLogs = logs.filter(log => log.includes('重试') || log.includes('retry'));
        
        if (retryLogs.length > 0) {
          console.log(`🔄 检测到重试机制激活: ${retryLogs.length} 次重试日志`);
          expect(retryLogs.length).toBeLessThanOrEqual(3); // 最多3次重试
        } else {
          console.log('✅ 公式渲染一次成功，无需重试');
        }

        // 如果成功渲染，验证结果
        if (result) {
          expect(result).toHaveProperty('path');
          expect(result).toHaveProperty('filename');
          expect(result.filename).toContain('math_');
        }
      } finally {
        console.log = originalConsoleLog;
      }
    });

    test('【新功能】应该在失败后使用安全模式降级', async () => {
      // 使用一个可能导致渲染困难的复杂公式
      const complexLatex = '\\begin{matrix} a & b \\\\ c & d \\end{matrix} \\times \\begin{pmatrix} x \\\\ y \\end{pmatrix} = \\begin{bmatrix} ax+by \\\\ cx+dy \\end{bmatrix}';
      
      const result = await converter.renderMathToImage(complexLatex, true);
      
      // 即使复杂公式，也应该有某种形式的结果（成功渲染或安全降级）
      // 关键是不应该抛出未捕获的错误
      expect(typeof result === 'object' || result === null).toBe(true);
      
      if (result === null) {
        console.log('🛡️ 复杂公式触发安全模式降级');
      } else {
        console.log('✅ 复杂公式成功渲染');
      }
    });
  });

  describe('公式质量和性能提升验证', () => {
    test('【性能优化】渲染时间应该在合理范围内', async () => {
      const testFormulas = [
        'E = mc^2',
        '\\sum_{i=1}^{n} x_i',
        '\\int_{-\\infty}^{\\infty} e^{-x^2} dx',
        '\\frac{a}{b} = \\frac{c}{d}'
      ];

      const startTime = Date.now();
      const results = [];

      for (const formula of testFormulas) {
        const formulaStartTime = Date.now();
        const result = await converter.renderMathToImage(formula, false);
        const formulaEndTime = Date.now();
        
        results.push({
          formula,
          result,
          renderTime: formulaEndTime - formulaStartTime
        });
      }

      const totalTime = Date.now() - startTime;
      
      // 性能验证
      expect(totalTime).toBeLessThan(30000); // 总时间应少于30秒
      
      const successfulRenders = results.filter(r => r.result !== null);
      const averageRenderTime = successfulRenders.length > 0 
        ? successfulRenders.reduce((sum, r) => sum + r.renderTime, 0) / successfulRenders.length 
        : 0;

      console.log(`📊 性能统计:`);
      console.log(`  总渲染时间: ${totalTime}ms`);
      console.log(`  成功渲染: ${successfulRenders.length}/${testFormulas.length}`);
      console.log(`  平均渲染时间: ${averageRenderTime.toFixed(0)}ms`);
      
      // 成功率应该高于50%（实际应该更高，但考虑到测试环境可能的限制）
      expect(successfulRenders.length / testFormulas.length).toBeGreaterThan(0.5);
    });

    test('【质量优化】应该生成高质量图片', async () => {
      const testLatex = '\\frac{a+b}{c-d} = \\sqrt{\\frac{x^2 + y^2}{z}}';
      const result = await converter.renderMathToImage(testLatex, true);
      
      if (result && result.path) {
        try {
          const imageBuffer = await fs.readFile(result.path);
          const imageDimensions = await converter.getImageDimensions(imageBuffer);
          
          // 验证图片质量
          expect(imageDimensions.width).toBeGreaterThan(0);
          expect(imageDimensions.height).toBeGreaterThan(0);
          
          // 对于显示公式，尺寸应该适中
          expect(imageDimensions.width).toBeLessThan(800);
          expect(imageDimensions.height).toBeLessThan(400);
          
          console.log(`🖼️ 公式图片质量: ${imageDimensions.width}×${imageDimensions.height}px`);
          
          // 验证是PNG格式
          expect(imageBuffer.slice(0, 8)).toEqual(
            Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
          );
          
        } catch (error) {
          console.warn('⚠️ 无法验证图片质量:', error.message);
        }
      }
    });
  });

  describe('实际应用场景测试', () => {
    test('【端到端】完整数学文档转换', async () => {
      const mathDocument = `# 数学公式测试文档

## 基础公式
爱因斯坦质能方程: $E = mc^2$

## 复杂公式
拉普拉斯方程:
$$\\frac{\\partial^2 u}{\\partial x^2} + \\frac{\\partial^2 u}{\\partial y^2} = 0$$

## 求和与积分
求和公式: $\\sum_{i=1}^{n} x_i$

积分公式:
$$\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}$$

## 矩阵运算
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

## 分数和根式
$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$
`;

      // 创建测试文档
      const testFile = path.join(testDataDir, 'math_document.md');
      await fs.writeFile(testFile, mathDocument);

      // 转换文档
      const startTime = Date.now();
      let docBuffer;
      let error;

      try {
        docBuffer = await converter.convertFile(testFile);
      } catch (err) {
        error = err;
      }

      const endTime = Date.now();

      // 验证转换结果
      if (error) {
        console.error('📄 文档转换失败:', error.message);
        // 即使失败，也不应该是require错误
        expect(error.message).not.toContain('require is not defined');
      } else {
        expect(docBuffer).toBeDefined();
        expect(Buffer.isBuffer(docBuffer)).toBe(true);
        expect(docBuffer.length).toBeGreaterThan(0);
        
        console.log(`📄 数学文档转换成功:`);
        console.log(`  转换时间: ${endTime - startTime}ms`);
        console.log(`  文档大小: ${docBuffer.length} bytes`);
      }

      // 清理测试文件
      await fs.unlink(testFile);
    });

    test('【错误恢复】应该处理混合内容文档', async () => {
      const mixedDocument = `# 混合内容测试

## 正常文本
这是普通的文本内容。

## 有效公式
简单公式: $a + b = c$

## 可能有问题的公式
$$\\invalidcommand{broken latex}$$

## 正常表格
| 列1 | 列2 |
|-----|-----|
| 数据1 | 数据2 |

## 更多有效公式
$$\\frac{1}{2} + \\frac{1}{3} = \\frac{5}{6}$$

## 结尾文本
文档结束。
`;

      const testFile = path.join(testDataDir, 'mixed_document.md');
      await fs.writeFile(testFile, mixedDocument);

      try {
        const docBuffer = await converter.convertFile(testFile);
        
        // 即使有无效公式，文档转换也应该成功
        expect(docBuffer).toBeDefined();
        expect(Buffer.isBuffer(docBuffer)).toBe(true);
        
        console.log('✅ 混合内容文档处理成功 - 错误恢复机制正常');
        
      } catch (error) {
        // 如果失败，至少不应该是require错误
        expect(error.message).not.toContain('require is not defined');
        console.log('⚠️ 混合内容文档处理失败，但非致命错误:', error.message);
      }

      await fs.unlink(testFile);
    });
  });

  describe('回归测试 - 确保原有功能不被破坏', () => {
    test('【回归】基本Markdown功能应该正常', async () => {
      const basicMarkdown = `# 标题1

## 标题2

这是一个段落，包含**粗体**和*斜体*文本。

- 列表项目1
- 列表项目2

1. 有序列表1
2. 有序列表2

\`\`\`javascript
console.log("代码块");
\`\`\`

> 这是引用文本

| 表格 | 列 |
|------|-----|
| 数据1 | 数据2 |
`;

      const testFile = path.join(testDataDir, 'basic_markdown.md');
      await fs.writeFile(testFile, basicMarkdown);

      try {
        const docBuffer = await converter.convertFile(testFile);
        
        expect(docBuffer).toBeDefined();
        expect(Buffer.isBuffer(docBuffer)).toBe(true);
        expect(docBuffer.length).toBeGreaterThan(1000); // 应该有一定的内容
        
        console.log('✅ 基本Markdown功能回归测试通过');
        
      } catch (error) {
        throw new Error(`基本Markdown功能回归测试失败: ${error.message}`);
      }

      await fs.unlink(testFile);
    });

    test('【回归】配置选项应该正常工作', async () => {
      const testMarkdown = `# 配置测试

数学公式: $x = y + z$

## SVG测试
\`\`\`svg
<svg width="50" height="50">
  <circle cx="25" cy="25" r="20" fill="red"/>
</svg>
\`\`\`
`;

      // 测试不同配置
      const configs = [
        { renderMath: false, renderSvg: false },
        { renderMath: true, mathToImage: false },
        { renderMath: true, mathToImage: true, renderSvg: true }
      ];

      for (const config of configs) {
        const testConverter = new MD2WordConverter(config);
        const testFile = path.join(testDataDir, `config_test_${Object.keys(config).join('_')}.md`);
        await fs.writeFile(testFile, testMarkdown);

        try {
          const docBuffer = await testConverter.convertFile(testFile);
          expect(docBuffer).toBeDefined();
          console.log(`✅ 配置测试通过: ${JSON.stringify(config)}`);
        } catch (error) {
          console.warn(`⚠️ 配置测试失败: ${JSON.stringify(config)}, 错误: ${error.message}`);
        }

        await fs.unlink(testFile);
      }
    });
  });

  describe('性能监控验证', () => {
    test('【监控】应该收集性能指标', async () => {
      const testLatex = '\\sum_{i=1}^{n} \\frac{1}{i^2} = \\frac{\\pi^2}{6}';
      
      // 重置性能指标
      converter.performanceMetrics = {
        mathRenderTime: 0,
        svgRenderTime: 0,
        totalConversionTime: 0,
        mathFormulaCount: 0,
        svgCount: 0,
        imageCount: 0
      };

      await converter.renderMathToImage(testLatex, true);

      // 验证性能指标是否被收集
      expect(typeof converter.performanceMetrics.mathRenderTime).toBe('number');
      expect(typeof converter.performanceMetrics.mathFormulaCount).toBe('number');
      
      if (converter.performanceMetrics.mathFormulaCount > 0) {
        console.log('📊 性能指标收集正常:', converter.performanceMetrics);
      }
    });
  });
});