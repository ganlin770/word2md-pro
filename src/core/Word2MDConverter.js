import mammoth from 'mammoth';
import TurndownService from 'turndown';
import * as cheerio from 'cheerio';
import katex from 'katex';
import fs from 'fs/promises';
import path from 'path';

export class Word2MDConverter {
  constructor(options = {}) {
    this.options = {
      extractImages: true,
      imageDir: './images',
      preserveLatex: true,
      convertSvg: true,
      mathDelimiters: {
        inline: ['$', '$'],
        display: ['$$', '$$']
      },
      ...options
    };
    
    this.turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced'
    });
    
    this.setupTurndownRules();
  }

  setupTurndownRules() {
    // 自定义SVG处理规则
    this.turndownService.addRule('svg', {
      filter: 'svg',
      replacement: (content, node) => {
        const svgContent = node.outerHTML;
        return `\n\`\`\`svg\n${svgContent}\n\`\`\`\n`;
      }
    });

    // 数学公式处理规则
    this.turndownService.addRule('math', {
      filter: (node) => {
        return node.classList && (
          node.classList.contains('math-inline') || 
          node.classList.contains('math-display') ||
          node.tagName === 'MATH'
        );
      },
      replacement: (content, node) => {
        const isDisplay = node.classList.contains('math-display') || node.getAttribute('display') === 'block';
        const latex = node.getAttribute('data-latex') || this.extractLatexFromMath(node);
        return isDisplay ? `$$${latex}$$` : `$${latex}$`;
      }
    });

    // 表格优化规则
    this.turndownService.addRule('table', {
      filter: 'table',
      replacement: (content, node) => {
        return this.convertTable(node);
      }
    });
  }

  async convertFile(filePath, outputPath) {
    try {
      const buffer = await fs.readFile(filePath);
      const result = await this.convertBuffer(buffer);
      
      if (outputPath) {
        await fs.writeFile(outputPath, result.markdown);
        if (result.images && result.images.length > 0) {
          await this.saveImages(result.images);
        }
      }
      
      return result;
    } catch (error) {
      throw new Error(`转换失败: ${error.message}`);
    }
  }

  async convertBuffer(buffer) {
    try {
      // 使用mammoth转换为HTML
      console.log('[Word2MDConverter] Starting convertBuffer...');
      const result = await mammoth.convertToHtml(buffer, {
        convertImage: mammoth.images.imgElement(this.handleImage.bind(this)),
        styleMap: [
          "p[style-name='Math'] => .math-display",
          "span[style-name='Math Inline'] => .math-inline",
          "p[style-name='Code'] => pre"
        ]
      });

      let html = result.value;
      console.log('[Word2MDConverter] HTML from Mammoth:', html ? html.substring(0, 500) + '...' : 'null');
      if (result.messages && result.messages.length > 0) {
        console.log('[Word2MDConverter] Mammoth messages:', result.messages);
      }
      const messages = result.messages;

      // 预处理HTML - 提取和处理数学公式
      html = await this.preprocessMath(html);
      
      // 处理SVG内容
      html = await this.preprocessSvg(html);
      
      // 转换为Markdown
      const markdown = this.turndownService.turndown(html);
      console.log('[Word2MDConverter] Markdown from Turndown:', markdown ? markdown.substring(0, 500) + '...' : 'null');
      
      // 后处理Markdown
      const processedMarkdown = this.postprocessMarkdown(markdown);

      console.log('[Word2MDConverter] Conversion successful. Markdown length:', processedMarkdown.length);
      
      return {
        markdown: processedMarkdown,
        images: this.extractedImages || [],
        messages: messages,
        warnings: this.extractWarnings(messages)
      };
    } catch (error) {
      console.error('[Word2MDConverter] Error in convertBuffer:', error);
      throw new Error(`转换过程出错: ${error.message}`);
    }
  }

  async preprocessMath(html) {
    const $ = cheerio.load(html);
    
    // 查找可能的数学公式模式
    $('p, span').each((index, element) => {
      const text = $(element).text();
      
      // 检测LaTeX模式
      if (this.containsLatex(text)) {
        const processedText = this.processLatexInText(text);
        $(element).html(processedText);
      }
    });

    // 处理MathML或Office Math
    $('math, m\\:math').each((index, element) => {
      const mathml = $(element).html();
      try {
        const latex = this.mathmlToLatex(mathml);
        const isDisplay = $(element).attr('display') === 'block';
        $(element).replaceWith(
          `<span class="${isDisplay ? 'math-display' : 'math-inline'}" data-latex="${latex}">${latex}</span>`
        );
      } catch (e) {
        console.warn('MathML转换失败:', e.message);
      }
    });

    return $.html();
  }

  async preprocessSvg(html) {
    const $ = cheerio.load(html);
    
    // 查找SVG内容
    $('svg').each((index, element) => {
      const svgHtml = $(element).prop('outerHTML');
      // 保持SVG标签用于后续处理
      $(element).attr('data-original-svg', 'true');
    });

    // 查找可能的SVG文本内容
    $('p, div').each((index, element) => {
      const text = $(element).text().trim();
      if (text.startsWith('<svg') && text.endsWith('</svg>')) {
        $(element).html(`<svg data-text-svg="true">${text}</svg>`);
      }
    });

    return $.html();
  }

  containsLatex(text) {
    // 检测常见的LaTeX模式
    const latexPatterns = [
      /\\\w+\{[^}]*\}/,  // \command{content}
      /\$[^$]+\$/,       // $formula$
      /\$\$[^$]+\$\$/,   // $$formula$$
      /\\frac\{[^}]+\}\{[^}]+\}/, // \frac{a}{b}
      /\\sqrt\{[^}]+\}/,  // \sqrt{x}
      /\\sum_\{[^}]+\}\^\{[^}]+\}/, // \sum_{i=1}^{n}
      /\\int_\{[^}]+\}\^\{[^}]+\}/, // \int_{a}^{b}
    ];
    
    return latexPatterns.some(pattern => pattern.test(text));
  }

  processLatexInText(text) {
    // 处理内联数学公式 $...$
    text = text.replace(/\$([^$]+)\$/g, '<span class="math-inline" data-latex="$1">$$$1$$</span>');
    
    // 处理显示数学公式 $$...$$
    text = text.replace(/\$\$([^$]+)\$\$/g, '<div class="math-display" data-latex="$1">$$$$1$$$$</div>');
    
    return text;
  }

  mathmlToLatex(mathml) {
    // 简化的MathML到LaTeX转换
    // 实际项目中可使用专门的库如 mathml-to-latex
    let latex = mathml
      .replace(/<mfrac><mi>([^<]+)<\/mi><mi>([^<]+)<\/mi><\/mfrac>/g, '\\frac{$1}{$2}')
      .replace(/<msqrt><mi>([^<]+)<\/mi><\/msqrt>/g, '\\sqrt{$1}')
      .replace(/<mi>([^<]+)<\/mi>/g, '$1')
      .replace(/<mn>([^<]+)<\/mn>/g, '$1')
      .replace(/<mo>([^<]+)<\/mo>/g, '$1')
      .replace(/<\/?m[a-z]+>/g, '');
    
    return latex.trim();
  }

  convertTable(tableNode) {
    const rows = Array.from(tableNode.querySelectorAll('tr'));
    if (rows.length === 0) return '';

    const tableData = rows.map(row => {
      const cells = Array.from(row.querySelectorAll('td, th'));
      return cells.map(cell => cell.textContent.trim().replace(/\n/g, ' '));
    });

    // 生成Markdown表格
    const header = `| ${tableData[0].join(' | ')} |`;
    const separator = `|${' --- |'.repeat(tableData[0].length)}`;
    const body = tableData.slice(1).map(row => `| ${row.join(' | ')} |`).join('\n');

    return `\n${header}\n${separator}\n${body}\n`;
  }

  handleImage(element) {
    if (!this.options.extractImages) return element;
    
    const buffer = element.read();
    const extension = element.contentType.split('/')[1] || 'png';
    const filename = `image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${extension}`;
    const filepath = path.join(this.options.imageDir, filename);
    
    if (!this.extractedImages) this.extractedImages = [];
    this.extractedImages.push({
      filename,
      filepath,
      buffer,
      contentType: element.contentType
    });

    return {
      src: filepath,
      alt: element.altText || ''
    };
  }

  async saveImages(images) {
    if (!images || images.length === 0) return;
    
    // 确保图片目录存在
    await fs.mkdir(this.options.imageDir, { recursive: true });
    
    for (const image of images) {
      await fs.writeFile(image.filepath, image.buffer);
    }
  }

  postprocessMarkdown(markdown) {
    // 清理多余的空行
    markdown = markdown.replace(/\n{3,}/g, '\n\n');
    
    // 优化数学公式格式
    markdown = markdown.replace(/\$\$\$\$([^$]+)\$\$\$\$/g, '$$$$1$$$$');
    markdown = markdown.replace(/\$\$([^$]+)\$\$/g, '$$$1$$');
    
    // 优化SVG代码块
    markdown = markdown.replace(/```svg\n([\s\S]*?)\n```/g, (match, svgContent) => {
      return '```svg\n' + svgContent.trim() + '\n```';
    });
    
    return markdown.trim();
  }

  extractWarnings(messages) {
    return messages.filter(msg => msg.type === 'warning').map(msg => msg.message);
  }

  extractLatexFromMath(node) {
    // 从数学节点提取LaTeX
    const text = node.textContent || '';
    return text.trim();
  }
}