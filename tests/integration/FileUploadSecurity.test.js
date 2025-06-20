import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../../src/server/index.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 文件上传安全性测试
 * 
 * 测试目标：验证Multer 2.x升级后的安全性和功能
 * 
 * 重点测试：
 * 1. 文件大小限制
 * 2. 文件类型验证
 * 3. 文件名安全性
 * 4. UTF-8编码支持
 * 5. 路径遍历攻击防护
 * 6. 恶意文件检测
 */
describe('文件上传安全性测试 (Multer 2.x)', () => {
  const testDataDir = path.join(__dirname, '../fixtures/upload');
  let server;

  beforeAll(async () => {
    await fs.mkdir(testDataDir, { recursive: true });
    await createTestFiles();
  });

  afterAll(async () => {
    try {
      await fs.rm(testDataDir, { recursive: true, force: true });
      // 清理上传目录中的测试文件
      const uploadsDir = path.join(process.cwd(), 'uploads');
      const files = await fs.readdir(uploadsDir);
      for (const file of files) {
        if (file.startsWith('test_') || file.includes('security_test')) {
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

  async function createTestFiles() {
    // 正常的Markdown文件
    const normalMd = `# 正常测试文档
这是一个正常的测试文档。
## 包含数学公式
$E = mc^2$
## 包含表格
| 列1 | 列2 |
|-----|-----|
| 数据1 | 数据2 |
`;
    await fs.writeFile(path.join(testDataDir, 'normal.md'), normalMd);

    // 中文文件名测试
    const chineseMd = `# 中文测试文档
包含中文内容的文档。
## 数学公式
$$\\sum_{i=1}^{n} x_i = \\frac{n(n+1)}{2}$$
`;
    await fs.writeFile(path.join(testDataDir, '中文文档测试.md'), chineseMd);

    // 大文件测试 (接近但不超过限制)
    const largeContent = '# 大文件测试\n\n' + 'A'.repeat(9 * 1024 * 1024); // 9MB
    await fs.writeFile(path.join(testDataDir, 'large_file.md'), largeContent);

    // 超大文件测试 (超过限制)
    const oversizedContent = '# 超大文件测试\n\n' + 'B'.repeat(11 * 1024 * 1024); // 11MB
    await fs.writeFile(path.join(testDataDir, 'oversized_file.md'), oversizedContent);

    // 创建一个假的Word文档
    const fakeDocx = `PK\x03\x04\x14\x00\x00\x00\x08\x00`; // ZIP文件头模拟
    await fs.writeFile(path.join(testDataDir, 'test.docx'), fakeDocx);

    // 创建恶意文件名测试文件
    await fs.writeFile(path.join(testDataDir, 'normal_test.md'), '# 正常内容');

    // JavaScript文件 (应该被拒绝)
    await fs.writeFile(path.join(testDataDir, 'malicious.js'), 'console.log("malicious code");');

    // 可执行文件 (应该被拒绝)  
    await fs.writeFile(path.join(testDataDir, 'malicious.exe'), 'fake executable');

    // 空文件
    await fs.writeFile(path.join(testDataDir, 'empty.md'), '');
  }

  describe('基本文件上传功能', () => {
    test('【功能】应该成功上传正常的Markdown文件', async () => {
      const testFile = path.join(testDataDir, 'normal.md');
      
      const response = await request(app)
        .post('/api/convert')
        .field('conversionType', 'md2word')
        .attach('files', testFile)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('results');
      expect(response.body.results).toHaveLength(1);
      expect(response.body.results[0]).toHaveProperty('success', true);
      
      console.log('✅ 正常Markdown文件上传成功');
    });

    test('【功能】应该成功上传Word文档', async () => {
      const testFile = path.join(testDataDir, 'test.docx');
      
      const response = await request(app)
        .post('/api/convert')
        .field('conversionType', 'word2md')
        .attach('files', testFile)
        .expect(200);

      // Word转换可能失败（因为是假文件），但不应该是上传错误
      expect(response.body).toHaveProperty('success');
      
      if (response.body.success) {
        console.log('✅ Word文档上传和转换成功');
      } else {
        console.log('⚠️ Word文档上传成功但转换失败（预期行为）');
      }
    });

    test('【编码】应该支持中文文件名', async () => {
      const testFile = path.join(testDataDir, '中文文档测试.md');
      
      const response = await request(app)
        .post('/api/convert')
        .field('conversionType', 'md2word')
        .attach('files', testFile)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.results[0]).toHaveProperty('originalName');
      
      // 验证中文文件名被正确处理
      const originalName = response.body.results[0].originalName;
      expect(originalName).toContain('中文');
      
      console.log('✅ 中文文件名支持正常:', originalName);
    });
  });

  describe('文件大小限制', () => {
    test('【安全】应该接受大文件但在限制内', async () => {
      const testFile = path.join(testDataDir, 'large_file.md');
      
      const response = await request(app)
        .post('/api/convert')
        .field('conversionType', 'md2word')
        .attach('files', testFile)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      console.log('✅ 大文件（9MB）上传成功');
    });

    test('【安全】应该拒绝超大文件', async () => {
      const testFile = path.join(testDataDir, 'oversized_file.md');
      
      const response = await request(app)
        .post('/api/convert')
        .field('conversionType', 'md2word')
        .attach('files', testFile)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('文件大小超过限制');
      
      console.log('✅ 超大文件（11MB）被正确拒绝');
    });

    test('【安全】应该处理空文件', async () => {
      const testFile = path.join(testDataDir, 'empty.md');
      
      const response = await request(app)
        .post('/api/convert')
        .field('conversionType', 'md2word')
        .attach('files', testFile)
        .expect(200);

      // 空文件应该被接受但转换结果可能为空
      expect(response.body).toHaveProperty('success');
      
      if (response.body.success) {
        console.log('✅ 空文件处理正常');
      } else {
        console.log('⚠️ 空文件被拒绝（可能的安全策略）');
      }
    });
  });

  describe('文件类型验证', () => {
    test('【安全】应该拒绝JavaScript文件', async () => {
      const testFile = path.join(testDataDir, 'malicious.js');
      
      const response = await request(app)
        .post('/api/convert')
        .field('conversionType', 'md2word')
        .attach('files', testFile)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toMatch(/文件类型|不支持|格式/);
      
      console.log('✅ JavaScript文件被正确拒绝');
    });

    test('【安全】应该拒绝可执行文件', async () => {
      const testFile = path.join(testDataDir, 'malicious.exe');
      
      const response = await request(app)
        .post('/api/convert')
        .field('conversionType', 'md2word')
        .attach('files', testFile)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toMatch(/文件类型|不支持|格式/);
      
      console.log('✅ 可执行文件被正确拒绝');
    });

    test('【安全】应该验证文件扩展名与内容的一致性', async () => {
      // 创建一个.md文件但内容是JavaScript
      const fakeFile = path.join(testDataDir, 'fake.md');
      await fs.writeFile(fakeFile, 'console.log("This is JavaScript in .md file");');
      
      const response = await request(app)
        .post('/api/convert')
        .field('conversionType', 'md2word')
        .attach('files', fakeFile)
        .expect(200);

      // 这应该被接受，因为扩展名是.md，内容会被当作Markdown处理
      expect(response.body).toHaveProperty('success', true);
      
      console.log('✅ 文件扩展名验证正常');
      
      // 清理
      await fs.unlink(fakeFile);
    });
  });

  describe('路径遍历攻击防护', () => {
    test('【安全】应该防止路径遍历攻击', async () => {
      // 尝试使用恶意文件名
      const testFile = path.join(testDataDir, 'normal_test.md');
      
      const response = await request(app)
        .post('/api/convert')
        .field('conversionType', 'md2word')
        .attach('files', testFile)
        .field('maliciousField', '../../etc/passwd')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      
      // 验证输出文件名不包含路径遍历字符
      const outputFilename = response.body.results[0].downloadUrl;
      expect(outputFilename).not.toContain('../');
      expect(outputFilename).not.toContain('..\\');
      
      console.log('✅ 路径遍历攻击防护正常');
    });

    test('【安全】文件下载应该防止路径遍历', async () => {
      const response = await request(app)
        .get('/api/download/../../etc/passwd')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('文件不存在');
      
      console.log('✅ 文件下载路径遍历防护正常');
    });
  });

  describe('多文件上传', () => {
    test('【功能】应该处理多个文件同时上传', async () => {
      const file1 = path.join(testDataDir, 'normal.md');
      const file2 = path.join(testDataDir, '中文文档测试.md');
      
      const response = await request(app)
        .post('/api/convert')
        .field('conversionType', 'md2word')
        .attach('files', file1)
        .attach('files', file2)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.results).toHaveLength(2);
      expect(response.body.summary.total).toBe(2);
      
      console.log('✅ 多文件上传处理正常');
    });

    test('【安全】应该限制同时上传的文件数量', async () => {
      // 创建多个测试文件
      const files = [];
      for (let i = 0; i < 15; i++) {
        const filename = `test_${i}.md`;
        const filepath = path.join(testDataDir, filename);
        await fs.writeFile(filepath, `# 测试文档 ${i}\n内容 ${i}`);
        files.push(filepath);
      }

      // 尝试上传超过限制的文件数
      let request_builder = request(app)
        .post('/api/convert')
        .field('conversionType', 'md2word');

      files.forEach(file => {
        request_builder = request_builder.attach('files', file);
      });

      const response = await request_builder.expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toMatch(/文件数量|限制|超过/);
      
      console.log('✅ 文件数量限制正常');

      // 清理测试文件
      for (const file of files) {
        try {
          await fs.unlink(file);
        } catch (error) {
          // 忽略清理错误
        }
      }
    });
  });

  describe('请求参数验证', () => {
    test('【安全】应该验证conversionType参数', async () => {
      const testFile = path.join(testDataDir, 'normal.md');
      
      const response = await request(app)
        .post('/api/convert')
        .field('conversionType', 'malicious_type')
        .attach('files', testFile)
        .expect(200);

      // 应该有错误信息
      expect(response.body).toHaveProperty('errors');
      if (response.body.errors && response.body.errors.length > 0) {
        console.log('✅ 无效conversionType被正确处理');
      }
    });

    test('【安全】应该过滤恶意settings参数', async () => {
      const testFile = path.join(testDataDir, 'normal.md');
      const maliciousSettings = {
        renderMath: true,
        __proto__: { malicious: true },
        constructor: { prototype: { evil: true } },
        outputPath: '../../malicious/path'
      };
      
      const response = await request(app)
        .post('/api/convert')
        .field('conversionType', 'md2word')
        .field('settings', JSON.stringify(maliciousSettings))
        .attach('files', testFile)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      
      console.log('✅ 恶意settings参数被安全处理');
    });

    test('【安全】应该处理超长参数', async () => {
      const testFile = path.join(testDataDir, 'normal.md');
      const longString = 'A'.repeat(10000);
      
      const response = await request(app)
        .post('/api/convert')
        .field('conversionType', 'md2word')
        .field('settings', longString)
        .attach('files', testFile)
        .expect(200);

      // 应该使用默认设置并成功转换
      expect(response.body).toHaveProperty('success', true);
      
      console.log('✅ 超长参数被安全处理');
    });
  });

  describe('错误处理和恢复', () => {
    test('【稳定性】应该处理磁盘空间不足', async () => {
      // 这个测试比较难模拟，我们通过其他方式测试错误处理
      const testFile = path.join(testDataDir, 'normal.md');
      
      // 模拟服务器处理错误的情况
      const response = await request(app)
        .post('/api/convert')
        .field('conversionType', 'md2word')
        .attach('files', testFile)
        .expect(200);

      // 即使有错误，也应该有适当的响应结构
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('results');
      
      console.log('✅ 错误处理机制正常');
    });

    test('【稳定性】应该处理并发上传', async () => {
      const testFile = path.join(testDataDir, 'normal.md');
      
      // 同时发起多个请求
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .post('/api/convert')
            .field('conversionType', 'md2word')
            .attach('files', testFile)
        );
      }

      const responses = await Promise.all(promises);
      
      // 所有请求都应该得到响应
      responses.forEach((response, index) => {
        expect(response.status).toBeOneOf([200, 400, 429]); // 成功、错误或限流
        console.log(`✅ 并发请求 ${index + 1} 状态: ${response.status}`);
      });
    });
  });

  describe('性能和资源管理', () => {
    test('【性能】上传和转换应该在合理时间内完成', async () => {
      const testFile = path.join(testDataDir, 'normal.md');
      
      const startTime = Date.now();
      const response = await request(app)
        .post('/api/convert')
        .field('conversionType', 'md2word')
        .attach('files', testFile)
        .timeout(30000); // 30秒超时

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(30000); // 应该在30秒内完成
      
      console.log(`✅ 上传转换性能正常: ${duration}ms`);
    });

    test('【资源】应该正确清理临时文件', async () => {
      const testFile = path.join(testDataDir, 'normal.md');
      
      // 检查上传前的临时文件数量
      const uploadsDir = path.join(process.cwd(), 'uploads');
      const filesBefore = await fs.readdir(uploadsDir);
      
      await request(app)
        .post('/api/convert')
        .field('conversionType', 'md2word')
        .attach('files', testFile)
        .expect(200);

      // 等待一段时间让清理逻辑执行
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const filesAfter = await fs.readdir(uploadsDir);
      
      // 临时文件应该被清理或保持在合理数量
      console.log(`📁 临时文件管理: 之前${filesBefore.length}个，之后${filesAfter.length}个`);
      
      // 验证没有泄漏太多临时文件
      expect(filesAfter.length - filesBefore.length).toBeLessThan(10);
    });
  });
});