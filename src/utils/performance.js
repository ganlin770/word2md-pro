// 性能监控工具
export class PerformanceMonitor {
  constructor() {
    this.metrics = new Map()
    this.observers = new Map()
    this.init()
  }

  init() {
    // 监控Web Vitals
    this.observeWebVitals()
    
    // 监控资源加载
    this.observeResourceTiming()
    
    // 监控用户交互
    this.observeUserTiming()
  }

  // 监控核心Web Vitals指标
  observeWebVitals() {
    // Largest Contentful Paint (LCP)
    this.observePerformanceEntry('largest-contentful-paint', (entry) => {
      this.recordMetric('LCP', entry.startTime)
    })

    // First Input Delay (FID)
    this.observePerformanceEntry('first-input', (entry) => {
      this.recordMetric('FID', entry.processingStart - entry.startTime)
    })

    // Cumulative Layout Shift (CLS)
    this.observePerformanceEntry('layout-shift', (entry) => {
      if (!entry.hadRecentInput) {
        const currentCLS = this.metrics.get('CLS') || 0
        this.recordMetric('CLS', currentCLS + entry.value)
      }
    })
  }

  // 监控资源加载性能
  observeResourceTiming() {
    this.observePerformanceEntry('resource', (entry) => {
      const duration = entry.responseEnd - entry.startTime
      const resourceType = this.getResourceType(entry.name)
      
      this.recordMetric(`${resourceType}_load_time`, duration)
      
      // 记录慢资源
      if (duration > 1000) {
        this.recordSlowResource(entry)
      }
    })
  }

  // 监控用户交互性能
  observeUserTiming() {
    this.observePerformanceEntry('measure', (entry) => {
      this.recordMetric(`custom_${entry.name}`, entry.duration)
    })
  }

  // 通用性能观察器
  observePerformanceEntry(type, callback) {
    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach(callback)
      })
      
      observer.observe({ type, buffered: true })
      this.observers.set(type, observer)
    } catch (error) {
      console.warn(`Performance observer for ${type} not supported:`, error)
    }
  }

  // 记录性能指标
  recordMetric(name, value) {
    this.metrics.set(name, value)
    
    // 发送到分析服务 (可选)
    this.sendToAnalytics(name, value)
    
    // 在开发环境下输出日志
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Performance Metric: ${name} = ${value.toFixed(2)}ms`)
    }
  }

  // 记录慢资源
  recordSlowResource(entry) {
    const slowResource = {
      name: entry.name,
      duration: entry.responseEnd - entry.startTime,
      size: entry.transferSize || 0,
      timestamp: Date.now()
    }
    
    console.warn('🐌 Slow Resource Detected:', slowResource)
  }

  // 获取资源类型
  getResourceType(url) {
    if (url.includes('.js')) return 'javascript'
    if (url.includes('.css')) return 'stylesheet'
    if (url.match(/\.(png|jpg|jpeg|gif|webp|svg)$/)) return 'image'
    if (url.includes('.woff') || url.includes('.ttf')) return 'font'
    return 'other'
  }

  // 发送数据到分析服务
  sendToAnalytics(name, value) {
    // 这里可以集成Google Analytics、百度统计等
    if (window.gtag) {
      window.gtag('event', 'performance_metric', {
        metric_name: name,
        metric_value: Math.round(value),
        custom_map: { metric_1: name }
      })
    }
  }

  // 生成性能报告
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      metrics: Object.fromEntries(this.metrics),
      recommendations: this.generateRecommendations()
    }

    return report
  }

  // 生成优化建议
  generateRecommendations() {
    const recommendations = []
    
    const lcp = this.metrics.get('LCP')
    if (lcp && lcp > 2500) {
      recommendations.push({
        type: 'LCP',
        message: 'Largest Contentful Paint过慢，建议优化图片加载或减少渲染阻塞',
        priority: 'high'
      })
    }

    const fid = this.metrics.get('FID')
    if (fid && fid > 100) {
      recommendations.push({
        type: 'FID',
        message: 'First Input Delay过长，建议优化JavaScript执行',
        priority: 'medium'
      })
    }

    const cls = this.metrics.get('CLS')
    if (cls && cls > 0.1) {
      recommendations.push({
        type: 'CLS',
        message: 'Cumulative Layout Shift过大，建议稳定页面布局',
        priority: 'medium'
      })
    }

    return recommendations
  }

  // 清理资源
  destroy() {
    this.observers.forEach(observer => observer.disconnect())
    this.observers.clear()
    this.metrics.clear()
  }
}

// 转换性能监控
export class ConversionPerformanceTracker {
  constructor() {
    this.conversions = []
  }

  // 开始转换计时
  startConversion(conversionId, type, fileSize) {
    const conversion = {
      id: conversionId,
      type,
      fileSize,
      startTime: performance.now(),
      stages: []
    }
    
    this.conversions.push(conversion)
    return conversion
  }

  // 记录转换阶段
  recordStage(conversionId, stageName) {
    const conversion = this.findConversion(conversionId)
    if (conversion) {
      conversion.stages.push({
        name: stageName,
        timestamp: performance.now()
      })
    }
  }

  // 完成转换
  completeConversion(conversionId, success, error = null) {
    const conversion = this.findConversion(conversionId)
    if (conversion) {
      conversion.endTime = performance.now()
      conversion.duration = conversion.endTime - conversion.startTime
      conversion.success = success
      conversion.error = error

      // 计算各阶段耗时
      conversion.stageDurations = this.calculateStageDurations(conversion)
      
      // 记录性能指标
      this.recordConversionMetrics(conversion)
    }
  }

  // 查找转换记录
  findConversion(conversionId) {
    return this.conversions.find(c => c.id === conversionId)
  }

  // 计算阶段耗时
  calculateStageDurations(conversion) {
    const durations = {}
    let previousTime = conversion.startTime

    conversion.stages.forEach(stage => {
      durations[stage.name] = stage.timestamp - previousTime
      previousTime = stage.timestamp
    })

    return durations
  }

  // 记录转换性能指标
  recordConversionMetrics(conversion) {
    const throughput = conversion.fileSize / (conversion.duration / 1000) // bytes per second
    
    console.log(`🔄 Conversion Performance:`, {
      type: conversion.type,
      duration: `${conversion.duration.toFixed(2)}ms`,
      fileSize: `${(conversion.fileSize / 1024).toFixed(2)}KB`,
      throughput: `${(throughput / 1024).toFixed(2)}KB/s`,
      success: conversion.success
    })

    // 发送到性能监控系统
    if (window.gtag) {
      window.gtag('event', 'conversion_performance', {
        conversion_type: conversion.type,
        duration: Math.round(conversion.duration),
        file_size: Math.round(conversion.fileSize / 1024),
        success: conversion.success
      })
    }
  }

  // 获取性能统计
  getStats() {
    const successful = this.conversions.filter(c => c.success)
    const failed = this.conversions.filter(c => !c.success)

    return {
      total: this.conversions.length,
      successful: successful.length,
      failed: failed.length,
      averageDuration: successful.reduce((sum, c) => sum + c.duration, 0) / successful.length || 0,
      successRate: (successful.length / this.conversions.length) * 100 || 0
    }
  }
}

// 单例实例
export const performanceMonitor = new PerformanceMonitor()
export const conversionTracker = new ConversionPerformanceTracker()