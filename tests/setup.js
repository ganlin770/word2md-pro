// Jest测试环境设置
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
  log: jest.fn()
}

// 模拟浏览器环境
global.window = {}
global.document = {
  createElement: jest.fn(() => ({})),
  body: {
    appendChild: jest.fn(),
    removeChild: jest.fn()
  }
}

// 模拟URL相关API
global.URL = {
  createObjectURL: jest.fn(() => 'blob:mock-url'),
  revokeObjectURL: jest.fn()
}

// 设置测试超时时间
jest.setTimeout(30000)