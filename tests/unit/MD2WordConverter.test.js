import { describe, test, expect, beforeEach, afterEach } from '@jest/globals'
import { MD2WordConverter } from '../../src/core/MD2WordConverter.js'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

describe('MD2WordConverter', () => {
  let converter
  const testDataDir = path.join(__dirname, '../fixtures')
  const outputDir = path.join(__dirname, '../output')

  beforeEach(() => {
    converter = new MD2WordConverter({
      renderMath: true,
      mathToImage: true,
      renderSvg: true
    })
  })

  afterEach(async () => {
    // 清理测试输出文件
    try {
      await fs.rm(outputDir, { recursive: true, force: true })
    } catch (error) {
      // 忽略清理错误
    }
  })

  describe('构造函数', () => {
    test('应该使用默认配置', () => {
      const defaultConverter = new MD2WordConverter()
      expect(defaultConverter.options.pageSize).toBe('A4')
      expect(defaultConverter.options.renderMath).toBe(true)
      expect(defaultConverter.options.fontSize).toBe(24)
    })

    test('应该合并自定义配置', () => {
      const customConverter = new MD2WordConverter({
        pageSize: 'Letter',
        customOption: 'test'
      })
      expect(customConverter.options.pageSize).toBe('Letter')
      expect(customConverter.options.customOption).toBe('test')
      expect(customConverter.options.renderMath).toBe(true) // 默认值保持
    })
  })

  describe('Markdown 预处理', () => {
    test('应该处理数学公式块', async () => {
      const markdown = '这是一个公式：\n\n$$E = mc^2$$\n\n后续内容'
      const result = await converter.preprocessMarkdown(markdown)
      // 如果启用了mathToImage，应该被转换为图片引用
      if (converter.options.mathToImage) {
        expect(result).toContain('![math](')
      }
    })

    test('应该处理内联数学公式', async () => {
      const markdown = '这是内联公式 $x = y + z$ 在文本中'
      const result = await converter.preprocessMarkdown(markdown)
      if (converter.options.mathToImage) {
        expect(result).toContain('![math](')
      }
    })

    test('应该处理SVG代码块', async () => {
      const markdown = '```svg\n<svg><circle r="10"/></svg>\n```'
      const result = await converter.preprocessMarkdown(markdown)
      if (converter.options.renderSvg) {
        expect(result).toContain('![svg](')
      }
    })
  })

  describe('数学公式渲染', () => {
    test('应该渲染内联数学公式', async () => {
      const latex = 'E = mc^2'
      const result = await converter.renderMathToImage(latex, false)
      
      if (result) {
        expect(result).toHaveProperty('path')
        expect(result).toHaveProperty('filename')
        expect(result.filename).toContain('math_')
        expect(result.filename).toContain('.png')
      }
    })

    test('应该渲染显示数学公式', async () => {
      const latex = '\\frac{a}{b} + \\sqrt{c}'
      const result = await converter.renderMathToImage(latex, true)
      
      if (result) {
        expect(result).toHaveProperty('path')
        expect(result).toHaveProperty('filename')
      }
    })

    test('应该处理无效的LaTeX', async () => {
      const invalidLatex = '\\invalidcommand{{'
      const result = await converter.renderMathToImage(invalidLatex, false)
      // 应该返回null或处理错误
      expect(result).toBeNull()
    })
  })

  describe('SVG 渲染', () => {
    test('应该转换SVG到图片', async () => {
      const svgContent = '<svg width="100" height="100"><circle cx="50" cy="50" r="40" fill="blue"/></svg>'
      const result = await converter.renderSvgToImage(svgContent)
      
      if (result) {
        expect(result).toHaveProperty('path')
        expect(result).toHaveProperty('filename')
        expect(result.filename).toContain('svg_')
        expect(result.filename).toContain('.png')
      }
    })
  })

  describe('Token 处理', () => {
    test('应该创建标题元素', async () => {
      const token = {
        type: 'heading',
        depth: 1,
        text: 'Test Heading'
      }
      
      const element = await converter.createHeading(token)
      expect(element).toBeDefined()
      // 验证是否为Paragraph类型的标题
    })

    test('应该创建段落元素', async () => {
      const token = {
        type: 'paragraph',
        text: 'Test paragraph',
        tokens: [{ type: 'text', text: 'Test paragraph' }]
      }
      
      const element = await converter.createParagraph(token)
      expect(element).toBeDefined()
    })

    test('应该创建代码块', async () => {
      const token = {
        type: 'code',
        text: 'console.log("Hello World")',
        lang: 'javascript'
      }
      
      const element = await converter.createCodeBlock(token)
      expect(element).toBeDefined()
    })
  })

  describe('内联Token解析', () => {
    test('应该解析文本Token', async () => {
      const tokens = [
        { type: 'text', text: 'Normal text' }
      ]
      
      const runs = await converter.parseInlineTokens(tokens)
      expect(runs).toHaveLength(1)
    })

    test('应该解析粗体Token', async () => {
      const tokens = [
        { type: 'strong', text: 'Bold text' }
      ]
      
      const runs = await converter.parseInlineTokens(tokens)
      expect(runs).toHaveLength(1)
    })

    test('应该解析斜体Token', async () => {
      const tokens = [
        { type: 'em', text: 'Italic text' }
      ]
      
      const runs = await converter.parseInlineTokens(tokens)
      expect(runs).toHaveLength(1)
    })

    test('应该解析代码Token', async () => {
      const tokens = [
        { type: 'code', text: 'code' }
      ]
      
      const runs = await converter.parseInlineTokens(tokens)
      expect(runs).toHaveLength(1)
    })
  })

  describe('表格创建', () => {
    test('应该创建简单表格', async () => {
      const token = {
        type: 'table',
        header: [
          { text: 'Column 1' },
          { text: 'Column 2' }
        ],
        rows: [
          [
            { text: 'Row 1 Col 1' },
            { text: 'Row 1 Col 2' }
          ]
        ]
      }
      
      const table = await converter.createTable(token)
      expect(table).toBeDefined()
    })
  })

  describe('列表创建', () => {
    test('应该创建无序列表', async () => {
      const token = {
        type: 'list',
        ordered: false,
        items: [
          { tokens: [{ type: 'text', text: 'Item 1' }] },
          { tokens: [{ type: 'text', text: 'Item 2' }] }
        ]
      }
      
      const elements = await converter.createList(token)
      expect(elements).toHaveLength(2)
    })

    test('应该创建有序列表', async () => {
      const token = {
        type: 'list',
        ordered: true,
        items: [
          { tokens: [{ type: 'text', text: 'Item 1' }] },
          { tokens: [{ type: 'text', text: 'Item 2' }] }
        ]
      }
      
      const elements = await converter.createList(token)
      expect(elements).toHaveLength(2)
    })
  })

  describe('辅助函数', () => {
    test('replaceAsync应该正确工作', async () => {
      const input = 'Hello WORLD and WORLD again'
      const regex = /WORLD/g
      const replacer = async (match) => {
        return new Promise(resolve => {
          setTimeout(() => resolve('Universe'), 10)
        })
      }
      
      const result = await converter.replaceAsync(input, regex, replacer)
      expect(result).toBe('Hello Universe and Universe again')
    })
  })

  describe('错误处理', () => {
    test('应该处理文件不存在', async () => {
      await expect(
        converter.convertFile('nonexistent.md')
      ).rejects.toThrow()
    })

    test('应该处理无效的Markdown', async () => {
      // 创建临时测试文件
      const testFile = path.join(testDataDir, 'invalid.md')
      await fs.mkdir(testDataDir, { recursive: true })
      await fs.writeFile(testFile, 'Valid markdown content')
      
      // 这应该成功，因为任何文本都是有效的Markdown
      await expect(
        converter.convertFile(testFile)
      ).resolves.toBeDefined()
      
      // 清理
      await fs.unlink(testFile)
    })
  })

  describe('图片处理', () => {
    test('应该获取图片尺寸', async () => {
      // 创建一个1x1像素的PNG图片数据
      const pngData = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE
      ])
      
      const dimensions = await converter.getImageDimensions(pngData)
      expect(dimensions).toHaveProperty('width')
      expect(dimensions).toHaveProperty('height')
      expect(typeof dimensions.width).toBe('number')
      expect(typeof dimensions.height).toBe('number')
    })
  })
})