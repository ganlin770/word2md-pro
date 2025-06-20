// 基本功能测试
describe('项目基本功能测试', () => {
  test('项目结构完整性', () => {
    const fs = require('fs')
    const path = require('path')
    
    // 检查核心文件是否存在
    const requiredFiles = [
      'package.json',
      'src/core/Word2MDConverter.js',
      'src/core/MD2WordConverter.js',
      'src/main.js',
      'src/App.vue',
      'index.html'
    ]
    
    requiredFiles.forEach(file => {
      expect(fs.existsSync(path.join(process.cwd(), file))).toBe(true)
    })
  })

  test('package.json 配置正确', () => {
    const packageJson = require('../package.json')
    
    expect(packageJson.name).toBe('word2md-pro')
    expect(packageJson.version).toBe('1.0.0')
    expect(packageJson.type).toBe('module')
    expect(packageJson.scripts).toHaveProperty('dev')
    expect(packageJson.scripts).toHaveProperty('build')
    expect(packageJson.scripts).toHaveProperty('test')
    expect(packageJson.scripts).toHaveProperty('lint')
  })

  test('核心依赖已安装', () => {
    const packageJson = require('../package.json')
    const coreDependencies = [
      'mammoth',
      'turndown',
      'marked',
      'docx',
      'express',
      'vue'
    ]
    
    coreDependencies.forEach(dep => {
      expect(packageJson.dependencies || packageJson.devDependencies).toHaveProperty(dep)
    })
  })
})