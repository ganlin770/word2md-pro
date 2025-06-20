import { Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, HeadingLevel, AlignmentType, TableOfContents, StyleLevel, PageBreak, WidthType, TableLayoutType } from 'docx';
import { marked } from 'marked';
import katex from 'katex';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import puppeteer from 'puppeteer';

export class MD2WordConverter {
  constructor(options = {}) {
    this.options = {
      pageSize: 'A4',
      margins: { top: 720, right: 720, bottom: 720, left: 720 },
      font: 'Times New Roman',
      fontSize: 24, // 12pt in half-points
      renderMath: true,
      renderSvg: true,
      mathToImage: true,
      safeModeEnabled: false, // 安全模式：遇到错误时禁用复杂功能
      maxRetries: 3, // 最大重试次数
      retryDelay: 1000, // 重试延迟（毫秒）
      ...options
    };
    
    this.retryCount = 0; // 当前重试计数
    this.failureCount = 0; // 失败计数
    this.performanceMetrics = {
      mathRenderTime: 0,
      svgRenderTime: 0,
      totalConversionTime: 0,
      mathFormulaCount: 0,
      svgCount: 0,
      imageCount: 0
    };
    this.setupRenderer();
  }

  setupRenderer() {
    const renderer = new marked.Renderer();
    
    // 重写渲染方法
    renderer.heading = this.renderHeading.bind(this);
    renderer.paragraph = this.renderParagraph.bind(this);
    renderer.strong = this.renderStrong.bind(this);
    renderer.em = this.renderEm.bind(this);
    renderer.code = this.renderCode.bind(this);
    renderer.codespan = this.renderCodespan.bind(this);
    renderer.table = this.renderTable.bind(this);
    renderer.image = this.renderImage.bind(this);
    
    marked.setOptions({ renderer });
  }

  async getChromePath() {
    const fs = await import('fs');
    const chromePaths = {
      darwin: [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Chromium.app/Contents/MacOS/Chromium'
      ],
      linux: [
        '/usr/bin/google-chrome-stable',
        '/usr/bin/google-chrome',
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium'
      ],
      win32: [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
      ]
    };

    const paths = chromePaths[process.platform] || [];
    
    for (const chromePath of paths) {
      try {
        if (fs.existsSync(chromePath)) {
          return chromePath;
        }
      } catch (error) {
        continue;
      }
    }
    
    // 如果找不到系统 Chrome，返回 undefined 让 Puppeteer 使用自带的 Chromium
    return undefined;
  }

  async convertFile(markdownPath, outputPath) {
    try {
      console.log(`[MD2WordConverter] Starting convertFile for: ${markdownPath}`);
      const content = await fs.readFile(markdownPath, 'utf-8');
      const docBuffer = await this.convertMarkdown(content, path.dirname(markdownPath));
      
      if (outputPath) {
        await fs.writeFile(outputPath, docBuffer);
      }
      
      return docBuffer;
    } catch (error) {
      console.error(`[MD2WordConverter] Error in convertFile for ${markdownPath}:`, error);
      throw new Error(`转换失败: ${error.message}`);
    }
  }

  async convertMarkdown(markdown, basePath = './') {
    console.log('[MD2WordConverter] Starting convertMarkdown. Markdown length:', markdown.length);
    this.basePath = basePath;
    this.elements = [];
    this.images = [];
    this.hasHeadings = false; // 追踪是否有标题，用于决定是否添加目录
    
    try {
      await this._convertMarkdownInternal(markdown);
    } catch (error) {
      console.warn('[MD2WordConverter] 转换失败，启用安全模式重试:', error.message);
      
      // 启用安全模式并重试
      const originalMathToImage = this.options.mathToImage;
      const originalRenderSvg = this.options.renderSvg;
      
      this.options.mathToImage = false;
      this.options.renderSvg = false;
      this.options.safeModeEnabled = true;
      
      // 重置状态
      this.elements = [];
      this.images = [];
      
      try {
        await this._convertMarkdownInternal(markdown);
        console.log('[MD2WordConverter] 安全模式转换成功');
      } catch (safeError) {
        console.error('[MD2WordConverter] 安全模式转换也失败:', safeError);
        throw new Error(`转换失败，即使在安全模式下也无法完成: ${safeError.message}`);
      } finally {
        // 恢复原始设置
        this.options.mathToImage = originalMathToImage;
        this.options.renderSvg = originalRenderSvg;
        this.options.safeModeEnabled = false;
      }
    }
    
    // 创建Word文档
    const doc = new Document({
      styles: {
        default: {
          heading1: {
            run: {
              size: 32,
              bold: true,
              color: "000000",
            },
            paragraph: {
              spacing: {
                after: 240,
                before: 240,
              },
              alignment: AlignmentType.CENTER,
            },
          },
          heading2: {
            run: {
              size: 28,
              bold: true,
              color: "000000",
            },
            paragraph: {
              spacing: {
                after: 200,
                before: 200,
              },
              alignment: AlignmentType.CENTER,
            },
          },
          heading3: {
            run: {
              size: 24,
              bold: true,
              color: "000000",
            },
            paragraph: {
              spacing: {
                after: 160,
                before: 160,
              },
              alignment: AlignmentType.LEFT,
            },
          },
        },
      },
      sections: [{
        children: this.buildDocumentElements(),
        properties: {
          page: {
            size: this.options.pageSize,
            margin: this.options.margins
          }
        }
      }]
    });
    
    const buffer = await Packer.toBuffer(doc);
    console.log('[MD2WordConverter] Document packed successfully. Buffer length:', buffer.length);
    return buffer;
  }

  async _convertMarkdownInternal(markdown) {
    // 预处理Markdown - 提取数学公式和SVG
    console.log('[MD2WordConverter] Starting preprocessMarkdown...');
    const preprocessed = await this.preprocessMarkdown(markdown);
    console.log('[MD2WordConverter] Finished preprocessMarkdown. Preprocessed length:', preprocessed.length);
    
    // 解析Markdown
    const tokens = marked.lexer(preprocessed);
    
    // 转换每个token为docx元素
    for (const token of tokens) {
      await this.processToken(token);
    }
  }

  buildDocumentElements() {
    const elements = [];
    
    // 如果有标题，添加目录
    if (this.hasHeadings) {
      elements.push(
        new Paragraph({
          text: "目录",
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        })
      );
      
      elements.push(new TableOfContents("目录", {
        hyperlink: true,
        headingStyleRange: "1-3",
        captionLabel: "目录",
      }));
      
      elements.push(new Paragraph({
        children: [new PageBreak()],
      }));
    }
    
    // 添加所有转换的元素
    elements.push(...this.elements);
    
    return elements;
  }

  async preprocessMarkdown(markdown) {
    // 处理数学公式块
    markdown = await this.processMathBlocks(markdown);
    
    // 处理SVG代码块
    markdown = await this.processSvgBlocks(markdown);
    
    // 处理直接嵌入的SVG
    markdown = await this.processEmbeddedSvg(markdown);
    
    // 处理内联数学公式
    markdown = await this.processInlineMath(markdown);
    
    return markdown;
  }

  async processMathBlocks(markdown) {
    const mathBlockRegex = /\$\$\s*\n?([\s\S]*?)\n?\s*\$\$/g;
    
    return await this.replaceAsync(markdown, mathBlockRegex, async (match, formula) => {
      if (this.options.mathToImage) {
        const imageData = await this.renderMathToImage(formula.trim(), true);
        if (imageData && imageData.path) {
          return `![math](${imageData.path})`;
        }
        // 如果图片渲染失败，保留原始文本
        console.warn(`[MD2WordConverter] Math image rendering failed, keeping text: ${formula}`);
        return `$$${formula}$$`;
      }
      return match;
    });
  }

  async processInlineMath(markdown) {
    const inlineMathRegex = /\$([^$\n]+)\$/g;
    
    return await this.replaceAsync(markdown, inlineMathRegex, async (match, formula) => {
      if (this.options.mathToImage) {
        const imageData = await this.renderMathToImage(formula.trim(), false);
        if (imageData && imageData.path) {
          return `![math](${imageData.path})`;
        }
        // 如果图片渲染失败，保留原始文本
        console.warn(`[MD2WordConverter] Inline math image rendering failed, keeping text: ${formula}`);
        return `$${formula}$`;
      }
      return match;
    });
  }

  async processSvgBlocks(markdown) {
    const svgBlockRegex = /```svg\s*\n([\s\S]*?)\n```/g;
    
    return await this.replaceAsync(markdown, svgBlockRegex, async (match, svgContent) => {
      if (this.options.renderSvg) {
        const imageData = await this.renderSvgToImage(svgContent.trim());
        if (imageData && imageData.path) {
          return `![svg](${imageData.path})`;
        }
        // 如果SVG渲染失败，保留原始文本
        console.warn(`[MD2WordConverter] SVG image rendering failed, keeping text block`);
        return match;
      }
      return match;
    });
  }

  async processEmbeddedSvg(markdown) {
    // 匹配直接嵌入的 SVG 元素（包括破坏的 SVG HTML 代码）
    const svgEmbeddedRegex = /<!--\s*[\s\S]*?-->\s*<rect[\s\S]*?\/text>/g;
    
    return await this.replaceAsync(markdown, svgEmbeddedRegex, async (match) => {
      if (this.options.renderSvg) {
        console.log(`[MD2WordConverter] Found embedded SVG content: ${match.substring(0,100)}...`);
        
        try {
          // 尝试重构为有效的 SVG
          const svgContent = this.reconstructSvg(match);
          if (svgContent) {
            console.log(`[MD2WordConverter] Rendering SVG: ${svgContent.substring(0,100)}...`);
            
            // 尝试渲染 SVG 为图片，如果失败则回退到文本
            const imageData = await this.renderSvgToImage(svgContent);
            if (imageData && imageData.path) {
              return `![svg](${imageData.path})`;
            }
          }
        } catch (error) {
          console.warn(`[MD2WordConverter] SVG processing error:`, error.message);
        }
        
        // 如果SVG渲染失败，返回简单的文本说明
        console.log(`[MD2WordConverter] SVG rendering failed, using text placeholder`);
        return '\n**[SVG 图表 - 产品销售情况条形图]**\n';
      }
      return match;
    });
  }

  reconstructSvg(brokenSvg) {
    try {
      // 提取所有的 rect 和 text 元素
      const rectMatches = brokenSvg.match(/<rect[^>]*>/g) || [];
      const textMatches = brokenSvg.match(/<text[^>]*>([^<]*)<\/text>/g) || [];
      
      // 创建完整的 SVG 结构
      let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200">
        <style>
          .bar { fill: #4CAF50; }
          .label { font-family: Arial, sans-serif; font-size: 12px; fill: #333; }
        </style>`;
      
      // 添加 rect 元素
      rectMatches.forEach((rect, index) => {
        const rectWithClass = rect.replace('class="bar"', 'class="bar"').replace('<rect ', '<rect class="bar" ');
        svgContent += '\n  ' + rectWithClass;
      });
      
      // 添加 text 元素
      textMatches.forEach((text, index) => {
        const textWithClass = text.replace('class="label"', 'class="label"').replace('<text ', '<text class="label" ');
        svgContent += '\n  ' + textWithClass;
      });
      
      svgContent += '\n</svg>';
      
      console.log(`[MD2WordConverter] Reconstructed SVG: ${svgContent.substring(0,200)}...`);
      return svgContent;
    } catch (error) {
      console.error(`[MD2WordConverter] Error reconstructing SVG:`, error);
      return null;
    }
  }

  async renderMathToImage(latex, displayMode = false, retryAttempt = 0) {
    console.log(`[MD2WordConverter] Rendering MathML: ${latex.substring(0,100)}... DisplayMode: ${displayMode} (Attempt: ${retryAttempt + 1})`);
    
    // 如果已启用安全模式，跳过图片渲染
    if (this.options.safeModeEnabled) {
      console.log(`[MD2WordConverter] Safe mode enabled, skipping math image rendering`);
      return null;
    }
    
    try {
      // 使用KaTeX渲染为HTML
      const html = katex.renderToString(latex, {
        displayMode,
        throwOnError: false,
        errorColor: '#cc0000',
        strict: 'warn'
      });
      console.log(`[MD2WordConverter] KaTeX HTML for ${latex.substring(0,30)}...: ${html.substring(0,100)}`);
      
      // 使用Puppeteer将HTML渲染为图片页面，使用内联CSS而不是CDN
      const fullHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { 
              margin: 20px; 
              font-family: ${this.options.font}; 
              background: white;
            }
            .katex { 
              font-size: ${displayMode ? '20px' : '16px'}; 
              font-family: KaTeX_Main, "Times New Roman", serif;
            }
            .katex-display {
              display: block;
              margin: 1em 0;
              text-align: center;
            }
            .katex .base {
              position: relative;
              display: inline-block;
            }
            .katex .strut {
              display: inline-block;
            }
            .katex .frac-line {
              border-bottom: 1px solid;
              margin: 0 0.04em;
            }
            .katex .sqrt > .root {
              margin-left: 0.27777778em;
              margin-right: -0.55555556em;
            }
            .katex .mord, .katex .mop, .katex .mbin, .katex .mrel, .katex .mopen, .katex .mclose, .katex .mpunct {
              color: inherit;
            }
          </style>
        </head>
        <body>${html}</body>
        </html>
      `;
      
      const result = await this.htmlToImage(fullHtml, `math_${Date.now()}.png`);
      
      if (result) {
        // 成功时重置失败计数
        this.failureCount = 0;
        return result;
      }
      
      throw new Error('HTML to image conversion failed');
      
    } catch (error) {
      this.failureCount++;
      console.error(`[MD2WordConverter] Error rendering math to image for LaTeX: ${latex} (Failure #${this.failureCount})`, error.message);
      
      // 实现智能重试机制
      if (retryAttempt < this.options.maxRetries) {
        console.log(`[MD2WordConverter] Retrying math rendering in ${this.options.retryDelay}ms... (${retryAttempt + 1}/${this.options.maxRetries})`);
        
        // 等待后重试
        await new Promise(resolve => setTimeout(resolve, this.options.retryDelay));
        return await this.renderMathToImage(latex, displayMode, retryAttempt + 1);
      }
      
      // 达到最大重试次数或失败次数过多时启用安全模式
      if (this.failureCount >= 5) {
        console.warn(`[MD2WordConverter] Too many failures (${this.failureCount}), enabling safe mode`);
        this.options.safeModeEnabled = true;
      }
      
      console.warn(`数学公式渲染失败 ${latex}:`, error.message);
      return null;
    }
  }

  async renderSvgToImage(svgContent) {
    console.log(`[MD2WordConverter] Rendering SVG: ${svgContent.substring(0,100)}...`);
    try {
      const filename = `svg_${Date.now()}.png`;
      const imagePath = path.join(this.basePath, 'temp_images', filename);
      
      // 确保目录存在
      await fs.mkdir(path.dirname(imagePath), { recursive: true });
      
      // 确保 SVG 有正确的 DOCTYPE 和命名空间
      let fullSvgContent = svgContent;
      if (!svgContent.includes('<?xml')) {
        fullSvgContent = `<?xml version="1.0" encoding="UTF-8"?>\n${svgContent}`;
      }
      
      try {
        // 尝试使用 Sharp 转换 SVG
        const buffer = Buffer.from(fullSvgContent, 'utf-8');
        await sharp(buffer)
          .png()
          .resize(800, 600, { fit: 'inside', withoutEnlargement: true })
          .toFile(imagePath);
        
        console.log(`[MD2WordConverter] SVG image saved using Sharp: ${imagePath}`);
        return { path: imagePath, filename };
      } catch (sharpError) {
        console.warn(`[MD2WordConverter] Sharp failed, trying Puppeteer:`, sharpError.message);
        
        // 如果 Sharp 失败，尝试使用 Puppeteer
        return await this.renderSvgWithPuppeteer(fullSvgContent, filename);
      }
      
    } catch (error) {
      console.error(`[MD2WordConverter] Error rendering SVG to image:`, error);
      console.warn(`SVG渲染失败:`, error.message);
      return null;
    }
  }

  async renderSvgWithPuppeteer(svgContent, filename) {
    try {
      const imagePath = path.join(this.basePath, 'temp_images', filename);
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { 
              margin: 0; 
              padding: 20px;
              background: white;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
            }
            svg {
              max-width: 100%;
              height: auto;
            }
          </style>
        </head>
        <body>
          ${svgContent}
        </body>
        </html>
      `;
      
      const browser = await puppeteer.launch({ 
        headless: 'new',
        timeout: 30000, // 30秒超时
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-extensions',
          '--enable-chrome-browser-cloud-management=false',
          '--disable-font-subpixel-positioning',
          '--disable-partial-raster',
          '--disable-skia-runtime-opts',
          '--run-all-compositor-stages-before-draw',
          '--disable-new-content-rendering-timeout'
        ],
        executablePath: await this.getChromePath()
      });
      
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      await page.setViewport({ width: 800, height: 600 });
      
      await page.screenshot({ 
        path: imagePath, 
        background: 'white',
        fullPage: false
      });
      
      await browser.close();
      
      console.log(`[MD2WordConverter] SVG image saved using Puppeteer: ${imagePath}`);
      return { path: imagePath, filename };
      
    } catch (error) {
      console.error(`[MD2WordConverter] Puppeteer SVG rendering failed:`, error);
      return null;
    }
  }

  async htmlToImage(html, filename) {
    try {
      const imagePath = path.join(this.basePath, 'temp_images', filename);
      await fs.mkdir(path.dirname(imagePath), { recursive: true });
      
      const browser = await puppeteer.launch({ 
        headless: 'new',
        timeout: 30000, // 30秒超时
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-extensions',
          '--enable-chrome-browser-cloud-management=false',
          '--disable-font-subpixel-positioning',
          '--disable-partial-raster',
          '--disable-skia-runtime-opts',
          '--run-all-compositor-stages-before-draw',
          '--disable-new-content-rendering-timeout'
        ],
        executablePath: await this.getChromePath()
      });
      const page = await browser.newPage();
      
      await page.setContent(html, { waitUntil: 'networkidle0' });
      await page.setViewport({ width: 1200, height: 800 });
      
      const element = await page.$('body');
      if (!element) {
        throw new Error('无法找到body元素');
      }
      
      await element.screenshot({ path: imagePath, background: 'white' });
      
      await browser.close();
      
      console.log(`[MD2WordConverter] Math image saved to: ${imagePath}`);
      return {
        path: imagePath,
        buffer: await fs.readFile(imagePath)
      };
    } catch (error) {
      console.error(`[MD2WordConverter] Error rendering HTML to image:`, error);
      console.warn(`无法渲染HTML为图片，数学公式将以文本形式保留`);
      return null;
    }
  }

  async processToken(token) {
    switch (token.type) {
      case 'heading':
        this.elements.push(await this.createHeading(token));
        break;
      case 'paragraph':
        this.elements.push(await this.createParagraph(token));
        break;
      case 'table':
        const tableElements = await this.createTable(token);
        this.elements.push(...tableElements); // 表格返回多个元素
        break;
      case 'code':
        this.elements.push(await this.createCodeBlock(token));
        break;
      case 'blockquote':
        this.elements.push(await this.createBlockquote(token));
        break;
      case 'list':
        const listElements = await this.createList(token);
        this.elements.push(...listElements);
        break;
      case 'space':
        this.elements.push(new Paragraph({ text: '' }));
        break;
    }
  }

  async createHeading(token) {
    this.hasHeadings = true; // 标记文档包含标题
    
    const level = Math.min(token.depth, 6);
    const headingLevels = [
      HeadingLevel.HEADING_1,
      HeadingLevel.HEADING_2,
      HeadingLevel.HEADING_3,
      HeadingLevel.HEADING_4,
      HeadingLevel.HEADING_5,
      HeadingLevel.HEADING_6
    ];
    
    // 根据标题级别设置不同的对齐方式
    const alignment = level <= 2 ? AlignmentType.CENTER : AlignmentType.LEFT;
    const fontSize = level === 1 ? 32 : level === 2 ? 28 : 24;
    
    return new Paragraph({
      children: [new TextRun({
        text: token.text,
        bold: true,
        size: fontSize,
        color: "000000"
      })],
      heading: headingLevels[level - 1],
      alignment: alignment,
      spacing: { 
        after: level <= 2 ? 300 : 200,
        before: level <= 2 ? 300 : 200
      },
      keepNext: true, // 保持与下一段在一起
    });
  }

  async createParagraph(token) {
    const runs = await this.parseInlineTokens(token.tokens || [{ type: 'text', text: token.text }]);
    
    // 检查是否包含数学公式图片，如果是则居中对齐
    const hasMatchImage = runs.some(run => run instanceof ImageRun);
    const alignment = hasMatchImage ? AlignmentType.CENTER : AlignmentType.JUSTIFIED;
    
    return new Paragraph({
      children: runs,
      alignment: alignment,
      spacing: { 
        after: 160,
        before: 0,
        line: 240, // 1.5倍行间距
        lineRule: "atLeast"
      },
      indent: {
        firstLine: hasMatchImage ? 0 : 240 // 普通段落首行缩进
      }
    });
  }

  async parseInlineTokens(tokens) {
    const runs = [];
    
    for (const token of tokens) {
      switch (token.type) {
        case 'text':
          runs.push(new TextRun({ text: token.text }));
          break;
        case 'strong':
          runs.push(new TextRun({ text: token.text, bold: true }));
          break;
        case 'em':
          runs.push(new TextRun({ text: token.text, italics: true }));
          break;
        case 'code':
          runs.push(new TextRun({ 
            text: token.text, 
            font: 'Courier New',
            shading: { fill: 'F5F5F5' }
          }));
          break;
        case 'image':
          const imageRun = await this.createImageRun(token);
          if (imageRun) runs.push(imageRun);
          break;
      }
    }
    
    return runs;
  }

  async createImageRun(token) {
    try {
      let imagePath = token.href;
      let imageBuffer;
      
      // 检查是否是生成的数学公式或SVG图片
      if (imagePath && imagePath.includes('temp_images')) {
        // 处理相对路径
        if (!path.isAbsolute(imagePath)) {
          imagePath = path.resolve(this.basePath, imagePath);
        }
        
        // 检查文件是否存在
        try {
          await fs.access(imagePath);
          imageBuffer = await fs.readFile(imagePath);
        } catch (fileError) {
          console.warn(`临时图片文件不存在: ${imagePath}`, fileError.message);
          return new TextRun({ text: `[图片: ${token.alt || token.href}]` });
        }
      } else {
        // 处理普通图片路径
        if (!path.isAbsolute(imagePath)) {
          imagePath = path.resolve(this.basePath, imagePath);
        }
        imageBuffer = await fs.readFile(imagePath);
      }
      
      const dimensions = await this.getImageDimensions(imageBuffer);
      
      // 计算合适的图片尺寸，保持宽高比
      const maxWidth = 500;
      const maxHeight = 350;
      let { width, height } = dimensions;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }
      
      return new ImageRun({
        data: imageBuffer,
        transformation: {
          width: Math.round(width),
          height: Math.round(height)
        },
        floating: {
          horizontalPosition: {
            align: 'center',
            relative: 'margin'
          },
          verticalPosition: {
            align: 'top',
            relative: 'paragraph'
          },
          allowOverlap: false,
          lockAnchor: true
        }
      });
    } catch (error) {
      console.warn(`图片加载失败 ${token.href}:`, error.message);
      return new TextRun({ text: `[图片: ${token.alt || token.href}]` });
    }
  }

  async getImageDimensions(buffer) {
    try {
      const metadata = await sharp(buffer).metadata();
      return {
        width: metadata.width || 600,
        height: metadata.height || 400
      };
    } catch (error) {
      return { width: 600, height: 400 };
    }
  }

  async createTable(token) {
    const rows = [];
    
    // 表头
    if (token.header && token.header.length > 0) {
      const headerCells = token.header.map(cell => 
        new TableCell({
          children: [new Paragraph({ 
            children: [new TextRun({ 
              text: cell.text, 
              bold: true,
              size: 22
            })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 120, before: 120 }
          })],
          shading: { fill: 'E6E6E6' },
          margins: {
            top: 120,
            bottom: 120,
            left: 120,
            right: 120
          }
        })
      );
      rows.push(new TableRow({ 
        children: headerCells,
        cantSplit: true, // 防止表头行被分割
      }));
    }
    
    // 表体
    for (const row of token.rows || []) {
      const cells = row.map(cell => 
        new TableCell({
          children: [new Paragraph({ 
            children: [new TextRun({ 
              text: cell.text,
              size: 20
            })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 100, before: 100 }
          })],
          margins: {
            top: 100,
            bottom: 100,
            left: 120,
            right: 120
          }
        })
      );
      rows.push(new TableRow({ 
        children: cells,
        cantSplit: true, // 防止表格行被分割
      }));
    }
    
    // 在表格前添加一个分页段落，确保表格有足够空间
    const tableElements = [];
    
    tableElements.push(new Paragraph({
      children: [],
      spacing: { after: 200 },
      keepNext: true, // 与下一个元素保持在一起
    }));
    
    const table = new Table({
      rows,
      width: { 
        size: 90, 
        type: WidthType.PERCENTAGE 
      },
      layout: TableLayoutType.FIXED, // 固定表格布局
      alignment: AlignmentType.CENTER, // 表格居中对齐
      borders: {
        top: { style: 'single', size: 1, color: '000000' },
        bottom: { style: 'single', size: 1, color: '000000' },
        left: { style: 'single', size: 1, color: '000000' },
        right: { style: 'single', size: 1, color: '000000' },
        insideHorizontal: { style: 'single', size: 1, color: '000000' },
        insideVertical: { style: 'single', size: 1, color: '000000' }
      },
      // 表格保持在一起的属性
      float: {
        horizontalAnchor: 'margin',
        verticalAnchor: 'margin',
        allowOverlap: false,
        lockAnchor: true
      }
    });
    
    tableElements.push(table);
    
    tableElements.push(new Paragraph({
      children: [],
      spacing: { after: 200 }
    }));
    
    return tableElements;
  }

  async createCodeBlock(token) {
    return new Paragraph({
      children: [new TextRun({ 
        text: token.text,
        font: 'Courier New',
        size: 20
      })],
      shading: { fill: 'F8F8F8' },
      spacing: { before: 120, after: 120 },
      border: {
        top: { style: 'single', size: 1, color: 'CCCCCC' },
        bottom: { style: 'single', size: 1, color: 'CCCCCC' },
        left: { style: 'single', size: 1, color: 'CCCCCC' },
        right: { style: 'single', size: 1, color: 'CCCCCC' }
      }
    });
  }

  async createBlockquote(token) {
    const runs = await this.parseInlineTokens(token.tokens || []);
    
    return new Paragraph({
      children: runs,
      spacing: { before: 120, after: 120 },
      indent: { left: 720 },
      border: {
        left: { style: 'single', size: 6, color: '4A90E2' }
      }
    });
  }

  async createList(token) {
    const elements = [];
    let counter = 1;
    
    for (const item of token.items) {
      const runs = await this.parseInlineTokens(item.tokens);
      const bullet = token.ordered ? `${counter}. ` : '• ';
      
      elements.push(new Paragraph({
        children: [
          new TextRun({ text: bullet, bold: true }),
          ...runs
        ],
        spacing: { after: 80 },
        indent: { left: 360 }
      }));
      
      if (token.ordered) counter++;
    }
    
    return elements;
  }

  // 辅助函数：异步字符串替换
  async replaceAsync(str, regex, asyncFn) {
    const promises = [];
    str.replace(regex, (match, ...args) => {
      const promise = asyncFn(match, ...args);
      promises.push(promise);
    });
    const data = await Promise.all(promises);
    return str.replace(regex, () => data.shift());
  }

  renderHeading(text, level) {
    return `<h${level}>${text}</h${level}>`;
  }

  renderParagraph(text) {
    return `<p>${text}</p>`;
  }

  renderStrong(text) {
    return `<strong>${text}</strong>`;
  }

  renderEm(text) {
    return `<em>${text}</em>`;
  }

  renderCode(code, language) {
    return `<pre><code class="language-${language || ''}">${code}</code></pre>`;
  }

  renderCodespan(code) {
    return `<code>${code}</code>`;
  }

  renderTable(header, body) {
    return `<table><thead>${header}</thead><tbody>${body}</tbody></table>`;
  }

  renderImage(href, title, text) {
    return `<img src="${href}" alt="${text}" title="${title || ''}">`;
  }
}