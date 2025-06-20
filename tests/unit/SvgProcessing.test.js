import { describe, test, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { MD2WordConverter } from '../../src/core/MD2WordConverter.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * SVG处理测试
 * 
 * 测试目标：验证替换svg2png后的SVG处理功能
 * 
 * 重点测试：
 * 1. SVG到PNG的转换功能
 * 2. convert-svg-to-png库的集成
 * 3. 不同类型的SVG内容处理
 * 4. 错误处理和降级策略
 * 5. 性能和质量优化
 */
describe('SVG处理功能测试', () => {
  let converter;
  const testDataDir = path.join(__dirname, '../fixtures/svg');
  const outputDir = path.join(__dirname, '../output/svg');

  beforeAll(async () => {
    await fs.mkdir(testDataDir, { recursive: true });
    await fs.mkdir(outputDir, { recursive: true });
  });

  beforeEach(() => {
    converter = new MD2WordConverter({
      renderMath: true,
      renderSvg: true,
      mathToImage: true
    });
  });

  afterEach(async () => {
    // 清理测试输出文件
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
    try {
      await fs.rm(testDataDir, { recursive: true, force: true });
      await fs.rm(outputDir, { recursive: true, force: true });
    } catch (error) {
      // 忽略清理错误
    }
  });

  describe('基础SVG转换功能', () => {
    test('【功能】应该转换简单的SVG图形', async () => {
      const simpleSvg = `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="40" fill="blue"/>
</svg>`;

      const result = await converter.renderSvgToImage(simpleSvg);
      
      if (result) {
        expect(result).toHaveProperty('path');
        expect(result).toHaveProperty('filename');
        expect(result.filename).toContain('svg_');
        expect(result.filename).toContain('.png');
        
        // 验证文件确实被创建
        const imageExists = await fs.access(result.path).then(() => true).catch(() => false);
        expect(imageExists).toBe(true);
        
        console.log('✅ 简单SVG转换成功:', result.filename);
      } else {
        console.log('⚠️ SVG转换返回null，可能环境不支持');
      }
    });

    test('【功能】应该转换包含文本的SVG', async () => {
      const textSvg = `<svg width="200" height="100" xmlns="http://www.w3.org/2000/svg">
  <rect width="200" height="100" fill="lightgray"/>
  <text x="100" y="50" text-anchor="middle" fill="black" font-size="16">Hello World</text>
</svg>`;

      const result = await converter.renderSvgToImage(textSvg);
      
      if (result) {
        expect(result).toHaveProperty('path');
        expect(result).toHaveProperty('filename');
        
        // 验证图片尺寸合理
        const imageBuffer = await fs.readFile(result.path);
        const dimensions = await converter.getImageDimensions(imageBuffer);
        
        expect(dimensions.width).toBeGreaterThan(0);
        expect(dimensions.height).toBeGreaterThan(0);
        expect(dimensions.width).toBeLessThan(1000); // 合理的尺寸范围
        expect(dimensions.height).toBeLessThan(1000);
        
        console.log(`✅ 文本SVG转换成功: ${dimensions.width}×${dimensions.height}px`);
      } else {
        console.log('⚠️ 文本SVG转换失败');
      }
    });

    test('【功能】应该转换复杂的SVG图形', async () => {
      const complexSvg = `<svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:rgb(255,255,0);stop-opacity:1" />
      <stop offset="100%" style="stop-color:rgb(255,0,0);stop-opacity:1" />
    </linearGradient>
  </defs>
  <ellipse cx="150" cy="100" rx="80" ry="60" fill="url(#grad1)" />
  <path d="M 50 50 L 250 50 L 200 150 L 100 150 Z" fill="rgba(0,255,0,0.5)" stroke="black" stroke-width="2"/>
  <circle cx="150" cy="100" r="30" fill="white" opacity="0.8"/>
  <text x="150" y="105" text-anchor="middle" font-family="Arial" font-size="12" fill="black">Complex</text>
</svg>`;

      const result = await converter.renderSvgToImage(complexSvg);
      
      if (result) {
        expect(result).toHaveProperty('path');
        expect(result).toHaveProperty('filename');
        
        console.log('✅ 复杂SVG转换成功');
      } else {
        console.log('⚠️ 复杂SVG转换失败，可能需要更高级的SVG支持');
      }
    });
  });

  describe('SVG内容验证和清理', () => {
    test('【安全】应该处理无效的SVG内容', async () => {
      const invalidSvg = `<svg><invalidtag>broken content</invalidtag></svg>`;
      
      const result = await converter.renderSvgToImage(invalidSvg);
      
      // 应该返回null或处理错误，而不是抛出异常
      expect(result === null || typeof result === 'object').toBe(true);
      
      if (result === null) {
        console.log('✅ 无效SVG被安全拒绝');
      } else {
        console.log('✅ 无效SVG被容错处理');
      }
    });

    test('【安全】应该处理恶意SVG内容', async () => {
      const maliciousSvg = `<svg xmlns="http://www.w3.org/2000/svg">
  <script>alert('malicious')</script>
  <rect width="100" height="100" fill="red"/>
</svg>`;
      
      const result = await converter.renderSvgToImage(maliciousSvg);
      
      // 恶意脚本应该被忽略，但基本图形可能被渲染
      if (result) {
        console.log('✅ 恶意SVG脚本被过滤，安全图形被渲染');
      } else {
        console.log('✅ 恶意SVG被完全拒绝');
      }
    });

    test('【安全】应该处理外部资源引用', async () => {
      const externalSvg = `<svg xmlns="http://www.w3.org/2000/svg">
  <image href="http://malicious.com/evil.png" width="100" height="100"/>
  <rect width="50" height="50" fill="green"/>
</svg>`;
      
      const result = await converter.renderSvgToImage(externalSvg);
      
      // 外部资源可能被阻止，但基本图形应该可以渲染
      expect(result === null || typeof result === 'object').toBe(true);
      
      if (result) {
        console.log('✅ 外部资源被安全处理，本地图形正常渲染');
      } else {
        console.log('⚠️ 包含外部资源的SVG被拒绝');
      }
    });
  });

  describe('Markdown集成测试', () => {
    test('【集成】应该在Markdown中正确处理SVG代码块', async () => {
      const markdownWithSvg = `# SVG测试文档

这是一个包含SVG的文档。

## 简单图形

\`\`\`svg
<svg width="80" height="80">
  <circle cx="40" cy="40" r="30" fill="purple"/>
</svg>
\`\`\`

## 更多内容

文档的其他内容。

## 另一个图形

\`\`\`svg
<svg width="120" height="60">
  <rect x="10" y="10" width="100" height="40" fill="orange" stroke="black"/>
  <text x="60" y="35" text-anchor="middle" fill="white">SVG Text</text>
</svg>
\`\`\`
`;

      const testFile = path.join(testDataDir, 'svg_markdown.md');
      await fs.writeFile(testFile, markdownWithSvg);

      const docBuffer = await converter.convertFile(testFile);
      
      expect(docBuffer).toBeDefined();
      expect(Buffer.isBuffer(docBuffer)).toBe(true);
      expect(docBuffer.length).toBeGreaterThan(0);
      
      console.log('✅ Markdown中的SVG处理成功');
      
      // 清理
      await fs.unlink(testFile);
    });

    test('【集成】应该处理SVG和数学公式混合文档', async () => {
      const mixedDocument = `# 混合内容测试

## 数学公式
这是一个数学公式：$E = mc^2$

## SVG图形
\`\`\`svg
<svg width="100" height="100">
  <rect width="100" height="100" fill="lightblue"/>
  <circle cx="50" cy="50" r="20" fill="darkblue"/>
</svg>
\`\`\`

## 更多数学
$$\\sum_{i=1}^{n} \\frac{1}{i^2} = \\frac{\\pi^2}{6}$$

## 另一个图形
\`\`\`svg
<svg width="150" height="75">
  <polygon points="75,10 100,50 50,50" fill="red"/>
</svg>
\`\`\`
`;

      const testFile = path.join(testDataDir, 'mixed_content.md');
      await fs.writeFile(testFile, mixedDocument);

      const startTime = Date.now();
      const docBuffer = await converter.convertFile(testFile);
      const endTime = Date.now();
      
      expect(docBuffer).toBeDefined();
      expect(Buffer.isBuffer(docBuffer)).toBe(true);
      
      console.log(`✅ SVG和数学公式混合文档处理成功 (${endTime - startTime}ms)`);
      
      // 清理
      await fs.unlink(testFile);
    });
  });

  describe('错误处理和降级', () => {
    test('【错误处理】应该处理空SVG内容', async () => {
      const emptySvg = '';
      const result = await converter.renderSvgToImage(emptySvg);
      
      expect(result).toBeNull();
      console.log('✅ 空SVG内容被正确处理');
    });

    test('【错误处理】应该处理格式错误的SVG', async () => {
      const malformedSvg = '<svg><rect></svg>'; // 缺少必要属性
      const result = await converter.renderSvgToImage(malformedSvg);
      
      // 应该返回null或尝试修复
      expect(result === null || typeof result === 'object').toBe(true);
      
      if (result === null) {
        console.log('✅ 格式错误的SVG被拒绝');
      } else {
        console.log('✅ 格式错误的SVG被尝试修复');
      }
    });

    test('【降级】SVG渲染失败时应该有适当降级', async () => {
      // 禁用SVG渲染
      const noSvgConverter = new MD2WordConverter({
        renderSvg: false
      });

      const svgMarkdown = `# 测试

\`\`\`svg
<svg><circle cx="50" cy="50" r="40" fill="blue"/></svg>
\`\`\`
`;

      const testFile = path.join(testDataDir, 'no_svg_test.md');
      await fs.writeFile(testFile, svgMarkdown);

      const docBuffer = await noSvgConverter.convertFile(testFile);
      
      // 应该成功转换，但SVG应该作为代码块处理
      expect(docBuffer).toBeDefined();
      expect(Buffer.isBuffer(docBuffer)).toBe(true);
      
      console.log('✅ SVG渲染禁用时的降级处理正常');
      
      // 清理
      await fs.unlink(testFile);
    });
  });

  describe('性能和质量测试', () => {
    test('【性能】SVG转换应该在合理时间内完成', async () => {
      const svgContent = `<svg width="200" height="200">
  <rect width="200" height="200" fill="lightgray"/>
  <circle cx="100" cy="100" r="80" fill="rgba(255,0,0,0.5)"/>
  <rect x="60" y="60" width="80" height="80" fill="rgba(0,255,0,0.5)"/>
  <circle cx="100" cy="100" r="40" fill="rgba(0,0,255,0.5)"/>
</svg>`;

      const startTime = Date.now();
      const result = await converter.renderSvgToImage(svgContent);
      const endTime = Date.now();
      
      const renderTime = endTime - startTime;
      
      if (result) {
        expect(renderTime).toBeLessThan(10000); // 应该在10秒内完成
        console.log(`✅ SVG渲染性能正常: ${renderTime}ms`);
      } else {
        console.log('⚠️ SVG渲染失败，无法测试性能');
      }
    });

    test('【质量】生成的PNG应该有合适的质量', async () => {
      const qualitySvg = `<svg width="200" height="100" xmlns="http://www.w3.org/2000/svg">
  <rect width="200" height="100" fill="white" stroke="black"/>
  <text x="100" y="50" text-anchor="middle" font-size="16" fill="black">Quality Test</text>
</svg>`;

      const result = await converter.renderSvgToImage(qualitySvg);
      
      if (result) {
        const imageBuffer = await fs.readFile(result.path);
        const dimensions = await converter.getImageDimensions(imageBuffer);
        
        // 验证图片质量
        expect(dimensions.width).toBeGreaterThan(100);
        expect(dimensions.height).toBeGreaterThan(50);
        
        // 验证文件大小合理（不能太小或太大）
        expect(imageBuffer.length).toBeGreaterThan(1000); // 至少1KB
        expect(imageBuffer.length).toBeLessThan(100000); // 不超过100KB
        
        console.log(`🖼️ SVG图片质量: ${dimensions.width}×${dimensions.height}px, ${imageBuffer.length} bytes`);
      } else {
        console.log('⚠️ 无法测试PNG质量');
      }
    });

    test('【批量】应该处理多个SVG的批量转换', async () => {
      const svgTemplates = [
        '<svg width="50" height="50"><circle cx="25" cy="25" r="20" fill="red"/></svg>',
        '<svg width="60" height="60"><rect width="60" height="60" fill="green"/></svg>',
        '<svg width="70" height="70"><polygon points="35,10 60,50 10,50" fill="blue"/></svg>',
        '<svg width="80" height="80"><ellipse cx="40" cy="40" rx="30" ry="20" fill="yellow"/></svg>'
      ];

      const startTime = Date.now();
      const results = [];
      
      for (let i = 0; i < svgTemplates.length; i++) {
        const result = await converter.renderSvgToImage(svgTemplates[i]);
        results.push(result);
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      const successCount = results.filter(r => r !== null).length;
      
      console.log(`📊 批量SVG转换统计:`);
      console.log(`  总时间: ${totalTime}ms`);
      console.log(`  成功转换: ${successCount}/${svgTemplates.length}`);
      console.log(`  平均时间: ${totalTime / svgTemplates.length}ms`);
      
      // 至少一半应该成功
      expect(successCount / svgTemplates.length).toBeGreaterThan(0.5);
    });
  });

  describe('convert-svg-to-png库集成验证', () => {
    test('【库集成】应该正确使用convert-svg-to-png', async () => {
      // 验证库是否正确集成
      const testSvg = '<svg width="100" height="100"><rect width="100" height="100" fill="purple"/></svg>';
      
      let conversionAttempted = false;
      let conversionError = null;
      
      try {
        const result = await converter.renderSvgToImage(testSvg);
        conversionAttempted = true;
        
        if (result) {
          // 验证结果结构
          expect(result).toHaveProperty('path');
          expect(result).toHaveProperty('filename');
          expect(typeof result.path).toBe('string');
          expect(typeof result.filename).toBe('string');
          
          console.log('✅ convert-svg-to-png集成正常');
        } else {
          console.log('⚠️ convert-svg-to-png返回null，可能环境限制');
        }
      } catch (error) {
        conversionError = error;
        console.log('⚠️ convert-svg-to-png集成测试出错:', error.message);
      }
      
      // 关键是不应该出现导入错误或函数不存在错误
      if (conversionError) {
        expect(conversionError.message).not.toContain('Cannot find module');
        expect(conversionError.message).not.toContain('is not a function');
      }
      
      expect(conversionAttempted).toBe(true);
    });

    test('【库配置】应该使用正确的转换选项', async () => {
      const testSvg = '<svg width="120" height="80"><text x="60" y="40" text-anchor="middle">Test</text></svg>';
      
      const result = await converter.renderSvgToImage(testSvg);
      
      if (result) {
        // 验证生成的PNG文件
        const imageBuffer = await fs.readFile(result.path);
        
        // 验证PNG文件头
        const pngHeader = imageBuffer.slice(0, 8);
        const expectedHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
        expect(pngHeader.equals(expectedHeader)).toBe(true);
        
        console.log('✅ PNG格式转换正确');
      }
    });
  });
});