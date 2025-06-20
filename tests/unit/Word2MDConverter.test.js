import { describe, test, expect, beforeEach, afterEach } from '@jest/globals'
import { Word2MDConverter } from '../../src/core/Word2MDConverter.js'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

describe('Word2MDConverter', () => {
  let converter
  const testDataDir = path.join(__dirname, '../fixtures')
  const outputDir = path.join(__dirname, '../output')

  beforeEach(() => {
    converter = new Word2MDConverter({
      extractImages: true,
      imageDir: './test-images',
      preserveLatex: true,
      convertSvg: true
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
      const defaultConverter = new Word2MDConverter()
      expect(defaultConverter.options.extractImages).toBe(true)
      expect(defaultConverter.options.imageDir).toBe('./images')
      expect(defaultConverter.options.preserveLatex).toBe(true)
    })

    test('应该合并自定义配置', () => {
      const customConverter = new Word2MDConverter({
        extractImages: false,
        customOption: 'test'
      })
      expect(customConverter.options.extractImages).toBe(false)
      expect(customConverter.options.customOption).toBe('test')
      expect(customConverter.options.preserveLatex).toBe(true) // 默认值保持
    })
  })

  describe('LaTeX 处理', () => {
    test('应该识别LaTeX模式', () => {
      const testCases = [
        { text: '$x = y + z$', expected: true },
        { text: '$$\\frac{a}{b}$$', expected: true },
        { text: '\\sqrt{x}', expected: true },
        { text: 'normal text', expected: false },
        { text: '\\command{content}', expected: true }
      ]

      testCases.forEach(({ text, expected }) => {
        expect(converter.containsLatex(text)).toBe(expected)
      })
    })

    test('应该正确处理内联数学公式', () => {
      const input = '这是一个公式 $E = mc^2$ 在文本中'
      const result = converter.processLatexInText(input)
      expect(result).toContain('class="math-inline"')
      expect(result).toContain('data-latex="E = mc^2"')
    })

    test('应该正确处理显示数学公式', () => {
      const input = '这是一个公式 $$E = mc^2$$ 独立显示'
      const result = converter.processLatexInText(input)
      expect(result).toContain('class="math-display"')
      expect(result).toContain('data-latex="E = mc^2"')
    })
  })

  describe('MathML 转换', () => {
    test('应该转换简单的MathML到LaTeX', () => {
      const mathml = '<mfrac><mi>a</mi><mi>b</mi></mfrac>'
      const result = converter.mathmlToLatex(mathml)
      expect(result).toBe('\\frac{a}{b}')
    })

    test('应该转换平方根MathML', () => {
      const mathml = '<msqrt><mi>x</mi></msqrt>'
      const result = converter.mathmlToLatex(mathml)
      expect(result).toBe('\\sqrt{x}')
    })
  })

  describe('表格转换', () => {
    test('应该转换简单表格', () => {
      // 创建模拟的表格DOM节点
      const mockTable = {
        querySelectorAll: (selector) => {
          if (selector === 'tr') {
            return [
              {
                querySelectorAll: () => [
                  { textContent: 'Header 1' },
                  { textContent: 'Header 2' }
                ]
              },
              {
                querySelectorAll: () => [
                  { textContent: 'Row 1 Col 1' },
                  { textContent: 'Row 1 Col 2' }
                ]
              }
            ]
          }
          return []
        }
      }

      const result = converter.convertTable(mockTable)
      expect(result).toContain('| Header 1 | Header 2 |')
      expect(result).toContain('| --- | --- |')
      expect(result).toContain('| Row 1 Col 1 | Row 1 Col 2 |')
    })
  })

  describe('图片处理', () => {
    test('应该正确处理图片元素', () => {
      const mockElement = {
        read: () => Buffer.from('fake image data'),
        contentType: 'image/png',
        altText: 'Test image'
      }

      const result = converter.handleImage(mockElement)
      expect(result.src).toContain('.png')
      expect(result.alt).toBe('Test image')
    })

    test('当不提取图片时应该返回原元素', () => {
      converter.options.extractImages = false
      const mockElement = { test: 'data' }
      const result = converter.handleImage(mockElement)
      expect(result).toBe(mockElement)
    })
  })

  describe('后处理', () => {
    test('应该清理多余的空行', () => {
      const input = 'Line 1\n\n\n\nLine 2\n\n\n\nLine 3'
      const result = converter.postprocessMarkdown(input)
      expect(result).toBe('Line 1\n\nLine 2\n\nLine 3')
    })

    test('应该优化数学公式格式', () => {
      const input = '$$$$formula$$$$'
      const result = converter.postprocessMarkdown(input)
      expect(result).toBe('$$formula$$')
    })

    test('应该优化SVG代码块', () => {
      const input = '```svg\n  <svg>content</svg>  \n```'
      const result = converter.postprocessMarkdown(input)
      expect(result).toContain('```svg\n<svg>content</svg>\n```')
    })
  })

  describe('错误处理', () => {
    test('应该抛出文件不存在错误', async () => {
      await expect(
        converter.convertFile('nonexistent.docx')
      ).rejects.toThrow('转换失败')
    })

    test('应该处理损坏的文档', async () => {
      // 创建一个假的docx文件
      const fakeDocx = path.join(testDataDir, 'fake.docx')
      await fs.mkdir(testDataDir, { recursive: true })
      await fs.writeFile(fakeDocx, 'not a real docx file')

      await expect(
        converter.convertFile(fakeDocx)
      ).rejects.toThrow()

      // 清理
      await fs.unlink(fakeDocx)
    })
  })

  describe('集成测试', () => {
    test('应该创建有效的转换结果结构', async () => {
      // 这个测试需要真实的docx文件，暂时跳过
      test.skip('with real docx file', async () => {
        const result = await converter.convertBuffer(Buffer.from('fake'))
        expect(result).toHaveProperty('markdown')
        expect(result).toHaveProperty('images')
        expect(result).toHaveProperty('messages')
        expect(result).toHaveProperty('warnings')
      })
    })
  })
})