#!/usr/bin/env node

import { Command } from 'commander';
import { Word2MDConverter } from '../core/Word2MDConverter.js';
import { MD2WordConverter } from '../core/MD2WordConverter.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const program = new Command();

program
  .name('word2md')
  .description('专业的Word与Markdown双向转换工具')
  .version('1.0.0');

// Word 转 Markdown 命令
program
  .command('word2md')
  .description('将Word文档转换为Markdown')
  .argument('<input>', 'Word文档路径 (.docx)')
  .option('-o, --output <file>', '输出文件路径')
  .option('--no-images', '不提取图片')
  .option('--no-latex', '不保留LaTeX公式')
  .option('--no-svg', '不转换SVG')
  .option('--images-dir <dir>', '图片保存目录', './images')
  .action(async (input, options) => {
    try {
      console.log(`开始转换 Word 文档: ${input}`);
      
      const converter = new Word2MDConverter({
        extractImages: options.images !== false,
        preserveLatex: options.latex !== false,
        convertSvg: options.svg !== false,
        imageDir: options.imagesDir
      });

      const outputPath = options.output || input.replace(/\.docx$/i, '.md');
      const result = await converter.convertFile(input, outputPath);

      console.log('✅ 转换成功!');
      console.log(`📄 输出文件: ${outputPath}`);
      
      if (result.images && result.images.length > 0) {
        console.log(`🖼️  提取图片: ${result.images.length} 个`);
      }
      
      if (result.warnings && result.warnings.length > 0) {
        console.log('⚠️  警告信息:');
        result.warnings.forEach(warning => console.log(`   ${warning}`));
      }

    } catch (error) {
      console.error('❌ 转换失败:', error.message);
      process.exit(1);
    }
  });

// Markdown 转 Word 命令
program
  .command('md2word')
  .description('将Markdown文档转换为Word')
  .argument('<input>', 'Markdown文档路径 (.md)')
  .option('-o, --output <file>', '输出文件路径')
  .option('--no-math', '不渲染数学公式')
  .option('--no-svg', '不渲染SVG')
  .option('--math-to-image', '将数学公式转换为图片')
  .action(async (input, options) => {
    try {
      console.log(`开始转换 Markdown 文档: ${input}`);
      
      const converter = new MD2WordConverter({
        renderMath: options.math !== false,
        renderSvg: options.svg !== false,
        mathToImage: options.mathToImage || false
      });

      const outputPath = options.output || input.replace(/\.md$/i, '.docx');
      await converter.convertFile(input, outputPath);

      console.log('✅ 转换成功!');
      console.log(`📄 输出文件: ${outputPath}`);

    } catch (error) {
      console.error('❌ 转换失败:', error.message);
      process.exit(1);
    }
  });

// 批量转换命令
program
  .command('batch')
  .description('批量转换文件')
  .argument('<pattern>', '文件匹配模式 (例如: *.docx)')
  .option('-t, --type <type>', '转换类型 (word2md|md2word)', 'word2md')
  .option('-o, --output-dir <dir>', '输出目录', './output')
  .action(async (pattern, options) => {
    try {
      const { glob } = await import('glob');
      const files = await glob(pattern);
      
      if (files.length === 0) {
        console.log('❌ 未找到匹配的文件');
        return;
      }

      console.log(`📁 找到 ${files.length} 个文件`);
      
      // 确保输出目录存在
      await fs.mkdir(options.outputDir, { recursive: true });

      let successful = 0;
      let failed = 0;

      for (const file of files) {
        try {
          console.log(`🔄 转换: ${file}`);
          
          const basename = path.basename(file, path.extname(file));
          let outputPath;
          
          if (options.type === 'word2md') {
            const converter = new Word2MDConverter();
            outputPath = path.join(options.outputDir, `${basename}.md`);
            await converter.convertFile(file, outputPath);
          } else {
            const converter = new MD2WordConverter();
            outputPath = path.join(options.outputDir, `${basename}.docx`);
            await converter.convertFile(file, outputPath);
          }
          
          console.log(`✅ 完成: ${outputPath}`);
          successful++;
          
        } catch (error) {
          console.error(`❌ 失败: ${file} - ${error.message}`);
          failed++;
        }
      }

      console.log('\n📊 批量转换完成');
      console.log(`✅ 成功: ${successful} 个`);
      console.log(`❌ 失败: ${failed} 个`);

    } catch (error) {
      console.error('❌ 批量转换失败:', error.message);
      process.exit(1);
    }
  });

// 启动Web服务器命令
program
  .command('serve')
  .description('启动Web服务器')
  .option('-p, --port <port>', '端口号', '3001')
  .option('--host <host>', '主机地址', 'localhost')
  .action(async (options) => {
    try {
      console.log('🚀 启动 Word2MD Pro Web 服务器...');
      
      // 动态导入服务器模块
      const serverPath = path.join(__dirname, '../server/index.js');
      process.env.PORT = options.port;
      
      await import(serverPath);
      
    } catch (error) {
      console.error('❌ 服务器启动失败:', error.message);
      process.exit(1);
    }
  });

// 信息命令
program
  .command('info')
  .description('显示系统信息')
  .action(async () => {
    console.log('📋 Word2MD Pro 系统信息');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`版本: 1.0.0`);
    console.log(`Node.js: ${process.version}`);
    console.log(`平台: ${process.platform}`);
    console.log(`架构: ${process.arch}`);
    console.log(`工作目录: ${process.cwd()}`);
    console.log(`内存使用: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
    
    // 检查依赖
    const dependencies = [
      'mammoth', 'turndown', 'marked', 'docx', 'katex'
    ];
    
    console.log('\n📦 依赖检查:');
    for (const dep of dependencies) {
      try {
        await import(dep);
        console.log(`✅ ${dep}`);
      } catch (error) {
        console.log(`❌ ${dep} - 未安装`);
      }
    }
  });

// 帮助信息
program
  .command('examples')
  .description('显示使用示例')
  .action(() => {
    console.log('📖 Word2MD Pro 使用示例');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('📄 单文件转换:');
    console.log('  word2md word2md document.docx');
    console.log('  word2md md2word README.md');
    console.log('');
    console.log('📁 指定输出:');
    console.log('  word2md word2md input.docx -o output.md');
    console.log('  word2md md2word input.md -o output.docx');
    console.log('');
    console.log('🔧 自定义选项:');
    console.log('  word2md word2md input.docx --no-images --images-dir ./imgs');
    console.log('  word2md md2word input.md --math-to-image');
    console.log('');
    console.log('📦 批量转换:');
    console.log('  word2md batch "*.docx" -t word2md -o ./markdown');
    console.log('  word2md batch "*.md" -t md2word -o ./word');
    console.log('');
    console.log('🌐 Web服务器:');
    console.log('  word2md serve -p 3000');
    console.log('  word2md serve --host 0.0.0.0 -p 8080');
    console.log('');
  });

program.parse();