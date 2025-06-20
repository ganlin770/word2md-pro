import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { Word2MDConverter } from '../core/Word2MDConverter.js';
import { MD2WordConverter } from '../core/MD2WordConverter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件配置
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../../dist')));

// 文件上传配置
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 确保文件名使用正确的UTF-8编码
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(originalName);
    const baseName = path.basename(originalName, ext);
    const safeFileName = `files-${uniqueSuffix}${ext}`;
    
    console.log(`[Server] 文件名编码处理: 原始="${file.originalname}", UTF-8="${originalName}", 保存为="${safeFileName}"`);
    
    // 将正确的原始文件名保存到file对象中
    file.originalname = originalName;
    
    cb(null, safeFileName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    // 在multipart请求中，req.body可能还没被完全解析
    // 所以我们需要从字段名或其他方式获取转换类型
    const fileExt = path.extname(file.originalname).toLowerCase();
    
    // 支持的文件类型
    const supportedExtensions = ['.docx', '.md'];
    
    if (supportedExtensions.includes(fileExt)) {
      console.log(`[Server] 文件类型检查通过: ${file.originalname} (${fileExt})`);
      cb(null, true);
    } else {
      console.log(`[Server] 不支持的文件类型: ${file.originalname} (${fileExt})`);
      cb(new Error(`不支持的文件类型: ${fileExt}。支持的格式: ${supportedExtensions.join(', ')}`), false);
    }
  }
});

// 转换器实例
const word2mdConverter = new Word2MDConverter();
const md2wordConverter = new MD2WordConverter();

// API 路由

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// 测试转换端点
app.post('/api/test-convert', async (req, res) => {
  try {
    console.log('[Server] 收到测试转换请求');
    
    // 测试MD2WordConverter导入
    console.log('[Server] 正在导入MD2WordConverter...');
    const { MD2WordConverter } = await import('../core/MD2WordConverter.js');
    console.log('[Server] MD2WordConverter导入成功');
    
    // 创建转换器实例
    console.log('[Server] 正在创建转换器实例...');
    const converter = new MD2WordConverter({
      renderMath: false,
      mathToImage: false,
      renderSvg: false
    });
    console.log('[Server] 转换器实例创建成功');
    
    // 测试转换
    console.log('[Server] 正在测试转换...');
    const testMarkdown = '# 测试\n\n这是一个测试。';
    const buffer = await converter.convertMarkdown(testMarkdown, './');
    console.log('[Server] 转换成功，文档大小:', buffer.length);
    
    res.json({
      success: true,
      message: '测试转换成功',
      bufferSize: buffer.length
    });
    
  } catch (error) {
    console.error('[Server] 测试转换失败:', error);
    console.error('[Server] 错误堆栈:', error.stack);
    
    res.status(500).json({
      success: false,
      error: '测试转换失败: ' + error.message,
      stack: error.stack
    });
  }
});

// 文件转换
app.post('/api/convert', upload.array('files', 10), async (req, res) => {
  try {
    const { conversionType, settings } = req.body;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: '请上传至少一个文件' 
      });
    }

    console.log(`开始转换 ${files.length} 个文件，类型: ${conversionType}`);

    const results = [];
    const errors = [];

    // 解析设置
    let parsedSettings = {};
    try {
      parsedSettings = settings ? JSON.parse(settings) : {};
    } catch (e) {
      console.warn('设置解析失败，使用默认设置:', e.message);
    }

    // 处理每个文件
    for (const file of files) {
      try {
        console.log(`[Server] 开始转换文件: ${file.originalname}, 大小: ${file.size} bytes, 路径: ${file.path}`);
        
        // 验证文件类型和转换类型的匹配
        const fileExt = path.extname(file.originalname).toLowerCase();
        const isValidCombination = 
          (conversionType === 'word2md' && fileExt === '.docx') ||
          (conversionType === 'md2word' && fileExt === '.md');
        
        if (!isValidCombination) {
          throw new Error(`文件类型 ${fileExt} 与转换类型 ${conversionType} 不匹配。word2md需要.docx文件，md2word需要.md文件。`);
        }
        
        console.log(`[Server] 文件类型验证通过: ${fileExt} -> ${conversionType}`);
        
        let result;
        if (conversionType === 'word2md') {
          console.log(`[Server] 执行Word转Markdown转换`);
          result = await convertWordToMarkdown(file, parsedSettings);
        } else if (conversionType === 'md2word') {
          console.log(`[Server] 执行Markdown转Word转换`);
          result = await convertMarkdownToWord(file, parsedSettings);
        } else {
          throw new Error('不支持的转换类型');
        }

        console.log(`[Server] 转换成功: ${file.originalname} -> ${result.fileName}`);
        
        const resultObject = {
          originalName: file.originalname,
          success: true,
          ...result
        };
        
        console.log(`[Server] 添加结果到results数组:`, {
          originalName: resultObject.originalName,
          fileName: resultObject.fileName,
          size: resultObject.size
        });
        
        results.push(resultObject);

        // 清理临时文件
        await fs.unlink(file.path).catch(console.warn);

      } catch (error) {
        console.error(`[Server] 文件 ${file.originalname} 转换失败:`, error.message);
        console.error(`[Server] 错误堆栈:`, error.stack);
        
        const errorObject = {
          originalName: file.originalname,
          success: false,
          error: error.message
        };
        
        console.log(`[Server] 添加错误到errors数组:`, errorObject);
        
        errors.push(errorObject);

        // 清理临时文件
        await fs.unlink(file.path).catch(console.warn);
      }
    }

    console.log(`[Server] 转换完成。成功: ${results.length}, 失败: ${errors.length}`);
    console.log(`[Server] results数组内容:`, results.map(r => ({ originalName: r.originalName, fileName: r.fileName })));
    console.log(`[Server] errors数组内容:`, errors.map(e => ({ originalName: e.originalName, error: e.error })));
    
    const responseData = {
      success: true,
      results: results,
      errors: errors,
      summary: {
        total: files.length,
        successful: results.length,
        failed: errors.length
      }
    };
    
    console.log(`[Server] 发送响应:`, {
      success: responseData.success,
      resultsCount: responseData.results.length,
      errorsCount: responseData.errors.length,
      summary: responseData.summary
    });

    res.json(responseData);

  } catch (error) {
    console.error('[Server] 转换请求处理失败:', error);
    console.error('[Server] 错误堆栈:', error.stack);
    
    // 为调试提供更详细的错误信息
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    };
    console.error('[Server] 详细错误信息:', errorDetails);
    
    res.status(500).json({
      success: false,
      error: '服务器内部错误: ' + error.message,
      debug: process.env.NODE_ENV === 'development' ? errorDetails : undefined
    });
  }
});

// Word 转 Markdown
async function convertWordToMarkdown(file, settings) {
  const outputDir = path.join(__dirname, '../../output');
  await fs.mkdir(outputDir, { recursive: true });

  // 设置图片目录
  const imageDir = path.join(outputDir, 'images');
  await fs.mkdir(imageDir, { recursive: true });

  // 配置转换选项
  const options = {
    extractImages: settings.extractImages !== false,
    imageDir: imageDir,
    preserveLatex: settings.preserveLatex !== false,
    convertSvg: settings.convertSvg !== false,
    ...settings
  };

  // 执行转换
  const result = await word2mdConverter.convertFile(file.path);
  
  // 生成输出文件名
  const baseName = path.basename(file.originalname, '.docx');
  const outputFileName = `${baseName}.md`;
  const outputPath = path.join(outputDir, outputFileName);

  // 保存Markdown文件
  await fs.writeFile(outputPath, result.markdown);

  // 保存图片文件
  if (result.images && result.images.length > 0) {
    await saveExtractedImages(result.images, imageDir);
  }

  // 读取生成的文件内容
  const content = await fs.readFile(outputPath, 'utf-8');

  return {
    fileName: outputFileName,
    content: content,
    size: Buffer.byteLength(content, 'utf-8'),
    images: result.images || [],
    warnings: result.warnings || [],
    downloadUrl: `/api/download/${outputFileName}`
  };
}

// Markdown 转 Word
async function convertMarkdownToWord(file, settings) {
  const outputDir = path.join(__dirname, '../../output');
  await fs.mkdir(outputDir, { recursive: true });

  // 配置转换选项
  const options = {
    renderMath: settings.renderMath !== false,
    mathToImage: settings.mathToImage !== false,
    renderSvg: settings.renderSvg !== false,
    safeModeEnabled: false, // 在遇到错误时自动启用
    ...settings
  };

  console.log(`[Server] MD2Word conversion options:`, options);

  // 创建转换器实例
  const converter = new MD2WordConverter(options);

  // 执行转换
  const baseName = path.basename(file.originalname, '.md');
  const outputFileName = `${baseName}.docx`;
  const outputPath = path.join(outputDir, outputFileName);

  console.log(`[Server] Converting ${file.originalname} to ${outputFileName}`);
  const buffer = await converter.convertFile(file.path, outputPath);
  console.log(`[Server] Conversion completed, buffer size: ${buffer.length}`);

  // 获取文件信息
  const stats = await fs.stat(outputPath);

  return {
    fileName: outputFileName,
    size: stats.size,
    downloadUrl: `/api/download/${outputFileName}`
  };
}

// 保存提取的图片
async function saveExtractedImages(images, imageDir) {
  for (const image of images) {
    try {
      const imagePath = path.join(imageDir, image.filename);
      await fs.writeFile(imagePath, image.buffer);
    } catch (error) {
      console.warn(`保存图片失败 ${image.filename}:`, error.message);
    }
  }
}

// 文件下载
app.get('/api/download/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../../output', filename);

    // 检查文件是否存在
    await fs.access(filePath);

    // 设置响应头
    const ext = path.extname(filename).toLowerCase();
    const contentType = ext === '.md' ? 'text/markdown' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);

    // 发送文件
    res.sendFile(path.resolve(filePath));

  } catch (error) {
    console.error('文件下载失败:', error);
    res.status(404).json({
      success: false,
      error: '文件不存在或已过期'
    });
  }
});

// 获取转换统计
app.get('/api/stats', (req, res) => {
  // 这里可以从数据库或缓存中获取统计信息
  res.json({
    totalConversions: 12586,
    successRate: 99.2,
    avgProcessingTime: 2.3,
    supportedFormats: ['docx', 'md'],
    features: [
      'LaTeX公式支持',
      'SVG图形转换',
      '复杂表格处理',
      '图片自动提取',
      '批量转换',
      '双向转换'
    ]
  });
});

// 错误处理中间件
app.use((error, req, res, next) => {
  console.error('服务器错误:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: '文件大小超过限制（最大10MB）'
      });
    }
  }

  res.status(500).json({
    success: false,
    error: '服务器内部错误'
  });
});

// 404处理
app.use('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({
      success: false,
      error: 'API接口不存在'
    });
  } else {
    // 对于非API请求，返回前端应用
    res.sendFile(path.join(__dirname, '../../dist/index.html'));
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 Word2MD Pro 服务器启动成功!`);
  console.log(`📡 API服务地址: http://localhost:${PORT}/api`);
  console.log(`🌐 Web界面地址: http://localhost:${PORT}`);
  console.log(`📁 上传目录: ${path.join(__dirname, '../../uploads')}`);
  console.log(`📄 输出目录: ${path.join(__dirname, '../../output')}`);
});

// 优雅关闭
process.on('SIGTERM', async () => {
  console.log('收到SIGTERM信号，正在关闭服务器...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('收到SIGINT信号，正在关闭服务器...');
  process.exit(0);
});

export default app;