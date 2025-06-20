# 极端测试用例文档

## 超长数学公式测试
$$
\begin{align}
\frac{\partial}{\partial t}\int_{\Omega} u \, d\Omega + \int_{\partial \Omega} \mathbf{u} \cdot \mathbf{n} \, d\Gamma &= \int_{\Omega} f \, d\Omega \\
\frac{\partial u}{\partial t} + \nabla \cdot (u\mathbf{v}) &= f + \nabla \cdot (D\nabla u) \\
\sum_{i=1}^{n} \sum_{j=1}^{m} \sum_{k=1}^{p} a_{ijk} x_i y_j z_k &= \prod_{l=1}^{q} \left( \int_{0}^{\infty} e^{-\lambda_l t} g_l(t) dt \right) \\
\lim_{n \to \infty} \frac{1}{n} \sum_{i=1}^{n} \left| f\left(\frac{i}{n}\right) - \int_0^1 f(x) dx \right|^2 &= 0
\end{align}
$$

## 嵌套公式和矩阵
$$
\mathbf{A} = \begin{pmatrix}
\frac{\partial^2 u}{\partial x^2} & \frac{\partial^2 u}{\partial x \partial y} & \cdots & \frac{\partial^2 u}{\partial x \partial z} \\
\frac{\partial^2 u}{\partial y \partial x} & \frac{\partial^2 u}{\partial y^2} & \cdots & \frac{\partial^2 u}{\partial y \partial z} \\
\vdots & \vdots & \ddots & \vdots \\
\frac{\partial^2 u}{\partial z \partial x} & \frac{\partial^2 u}{\partial z \partial y} & \cdots & \frac{\partial^2 u}{\partial z^2}
\end{pmatrix}
$$

## 特殊字符密集测试

### Unicode数学符号
∀ε>0 ∃δ>0 ∀x∈ℝ: |x-a|<δ ⟹ |f(x)-f(a)|<ε

∑∏∫∮∯∰∱∲∳∀∃∅∈∉∋∌∩∪⊂⊃⊆⊇⊄⊅⊊⊋⊏⊐⊑⊒

### 希腊字母全集
Α Β Γ Δ Ε Ζ Η Θ Ι Κ Λ Μ Ν Ξ Ο Π Ρ Σ Τ Υ Φ Χ Ψ Ω
α β γ δ ε ζ η θ ι κ λ μ ν ξ ο π ρ σ τ υ φ χ ψ ω

### 特殊符号
←→↑↓↔↕↖↗↘↙⇐⇒⇑⇓⇔⇕⇖⇗⇘⇙⇦⇧⇨⇩

## 复杂SVG图形

### 包含渐变和动画的SVG
```svg
<svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="complexGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:rgb(255,255,0);stop-opacity:1" />
      <stop offset="25%" style="stop-color:rgb(255,128,0);stop-opacity:0.8" />
      <stop offset="50%" style="stop-color:rgb(255,0,0);stop-opacity:0.6" />
      <stop offset="75%" style="stop-color:rgb(128,0,255);stop-opacity:0.8" />
      <stop offset="100%" style="stop-color:rgb(0,0,255);stop-opacity:1" />
    </linearGradient>
    <radialGradient id="radialGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:white;stop-opacity:1" />
      <stop offset="100%" style="stop-color:black;stop-opacity:1" />
    </radialGradient>
    <pattern id="checkerboard" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
      <rect x="0" y="0" width="10" height="10" fill="white"/>
      <rect x="10" y="10" width="10" height="10" fill="white"/>
      <rect x="10" y="0" width="10" height="10" fill="black"/>
      <rect x="0" y="10" width="10" height="10" fill="black"/>
    </pattern>
  </defs>
  
  <rect width="300" height="200" fill="url(#checkerboard)" opacity="0.3"/>
  
  <ellipse cx="150" cy="100" rx="100" ry="60" fill="url(#complexGrad)" opacity="0.8"/>
  
  <path d="M 50 50 Q 150 20 250 50 T 250 150 Q 150 180 50 150 T 50 50" 
        stroke="darkblue" stroke-width="3" fill="url(#radialGrad)" opacity="0.6"/>
  
  <polygon points="150,30 180,70 220,70 190,100 200,140 150,115 100,140 110,100 80,70 120,70" 
           fill="gold" stroke="orange" stroke-width="2"/>
  
  <text x="150" y="100" text-anchor="middle" font-family="Arial" font-size="16" 
        fill="white" stroke="black" stroke-width="0.5">
    Complex SVG
  </text>
  
  <circle cx="50" cy="50" r="20" fill="red" opacity="0.7">
    <animate attributeName="cx" values="50;250;50" dur="3s" repeatCount="indefinite"/>
  </circle>
</svg>
```

### 嵌套组和变换的SVG
```svg
<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(200,150)">
    <g transform="rotate(45)">
      <g transform="scale(1.5)">
        <rect x="-50" y="-25" width="100" height="50" fill="lightblue" stroke="navy"/>
        <circle cx="0" cy="0" r="15" fill="red"/>
        <text x="0" y="5" text-anchor="middle" font-size="12" fill="white">CENTER</text>
      </g>
    </g>
    <g transform="rotate(-45) translate(80,0)">
      <polygon points="0,-20 20,0 0,20 -20,0" fill="green" opacity="0.7"/>
    </g>
  </g>
  
  <g stroke="purple" stroke-width="2" fill="none">
    <path d="M 10 10 Q 50 50 100 10 T 200 10"/>
    <path d="M 10 50 C 50 10, 100 90, 150 50 S 250 10, 300 50"/>
  </g>
</svg>
```

## 极端表格测试

### 大型数据表格
| ID | 姓名 | 年龄 | 部门 | 职位 | 工资 | 入职日期 | 邮箱 | 电话 | 地址 |
|----|------|------|------|------|------|----------|------|------|------|
| 001 | 张三 | 28 | 技术部 | 高级工程师 | 15000 | 2020-01-15 | zhangsan@company.com | 138****1234 | 北京市朝阳区 |
| 002 | 李四 | 32 | 产品部 | 产品经理 | 18000 | 2019-06-20 | lisi@company.com | 139****5678 | 上海市浦东新区 |
| 003 | 王五 | 26 | 设计部 | UI设计师 | 12000 | 2021-03-10 | wangwu@company.com | 136****9012 | 深圳市南山区 |
| 004 | 赵六 | 35 | 运营部 | 运营总监 | 22000 | 2018-09-01 | zhaoliu@company.com | 137****3456 | 广州市天河区 |
| 005 | 陈七 | 29 | 技术部 | 架构师 | 20000 | 2019-11-25 | chenqi@company.com | 135****7890 | 杭州市西湖区 |

### 包含公式的复杂表格
| 函数类型 | 函数表达式 | 一阶导数 | 二阶导数 | 积分 | 应用领域 |
|----------|------------|----------|----------|------|----------|
| 线性函数 | $f(x) = ax + b$ | $f'(x) = a$ | $f''(x) = 0$ | $\int f(x)dx = \frac{ax^2}{2} + bx + C$ | 基础数学 |
| 二次函数 | $f(x) = ax^2 + bx + c$ | $f'(x) = 2ax + b$ | $f''(x) = 2a$ | $\int f(x)dx = \frac{ax^3}{3} + \frac{bx^2}{2} + cx + C$ | 物理学 |
| 指数函数 | $f(x) = e^{ax}$ | $f'(x) = ae^{ax}$ | $f''(x) = a^2e^{ax}$ | $\int f(x)dx = \frac{e^{ax}}{a} + C$ | 增长模型 |
| 对数函数 | $f(x) = \ln(ax)$ | $f'(x) = \frac{1}{x}$ | $f''(x) = -\frac{1}{x^2}$ | $\int f(x)dx = x\ln(ax) - x + C$ | 信息论 |
| 三角函数 | $f(x) = \sin(ax)$ | $f'(x) = a\cos(ax)$ | $f''(x) = -a^2\sin(ax)$ | $\int f(x)dx = -\frac{\cos(ax)}{a} + C$ | 波动分析 |

## 多级嵌套列表

### 复杂项目结构
1. 前端开发
   1. Vue.js框架
      - 组件开发
        - 基础组件
          - Button组件
            - 样式定义
            - 事件处理
            - 属性配置
          - Input组件
            - 输入验证
            - 数据绑定
            - 错误提示
        - 业务组件
          - 文件上传组件
          - 转换结果组件
          - 进度显示组件
      - 路由管理
        - 页面路由
        - 权限控制
        - 导航守卫
   2. CSS样式
      - Tailwind CSS
        - 响应式设计
        - 主题配置
        - 自定义样式
   3. 构建工具
      - Vite配置
        - 开发服务器
        - 生产构建
        - 插件管理

2. 后端开发
   1. Node.js服务
      - Express框架
        - 路由定义
        - 中间件配置
        - 错误处理
      - 文件处理
        - Multer上传
        - 文件验证
        - 临时文件管理
   2. 核心转换器
      - MD2WordConverter
        - Markdown解析
        - 公式渲染
        - SVG处理
        - Word文档生成
      - Word2MDConverter
        - Word文档解析
        - 格式转换
        - 图片提取

## 边界情况测试

### 空内容处理
- 空段落：



- 空代码块：
```

```

- 空表格：
| |
|-|
| |

### 特殊字符转义
- HTML实体：&lt; &gt; &amp; &quot; &#39;
- Markdown转义：\* \_ \` \\ \[ \] \( \) \# \+ \- \. \!
- 特殊符号：© ® ™ § ¶ † ‡ • ‰ ′ ″ ‴ ⁇ ⁈ ⁉

### 超长内容
超长单词测试：pneumonoultramicroscopicsilicovolcanoconiosis是一个医学术语，指由吸入非常细小的硅酸盐或石英粉尘引起的肺部疾病。

超长URL测试：https://www.example.com/very/very/very/very/very/very/very/very/very/very/very/very/very/very/very/very/very/very/very/very/very/very/very/very/very/very/long/path/to/some/resource?with=many&parameters=and&values=that&make=it&extremely=long&and=difficult&to=handle&properly=true

## 错误恢复测试

### 无效数学公式
正常公式：$x = y + z$

错误公式1：$\invalidcommand{test}$

错误公式2：$$\begin{matrix} a & b \\ c$$

错误公式3：$x = \frac{}{0}$

正常公式：$\sin(x) + \cos(x) = \sqrt{2}\sin(x + \frac{\pi}{4})$

### 无效SVG
正常SVG：
```svg
<svg width="50" height="50">
  <circle cx="25" cy="25" r="20" fill="blue"/>
</svg>
```

错误SVG1：
```svg
<svg>
  <invalidtag>broken</invalidtag>
</svg>
```

错误SVG2：
```svg
<svg width="100" height="100"
  <rect width="50" height="50" fill="red"
</svg>
```

正常SVG：
```svg
<svg width="60" height="60">
  <rect width="60" height="60" fill="green"/>
</svg>
```

## 性能测试内容

### 大量重复内容
${'重复内容测试 '.repeat(100)}

### 大量数学公式
${Array.from({length: 20}, (_, i) => 
  `第${i+1}个公式：$f_{${i+1}}(x) = \\sum_{n=0}^{\\infty} \\frac{(-1)^n x^{${i+1}n}}{(${i+1}n)!}$`
).join('\n\n')}

### 大量SVG图形
${Array.from({length: 10}, (_, i) => 
  `图形${i+1}：\n\`\`\`svg\n<svg width="50" height="50"><rect width="50" height="50" fill="hsl(${i * 36}, 70%, 50%)"/><text x="25" y="30" text-anchor="middle" font-size="12" fill="white">${i+1}</text></svg>\n\`\`\`\n`
).join('\n')}

## 总结

这个极端测试文档包含了所有可能遇到的边界情况：
- ✅ 超长复杂数学公式
- ✅ 复杂嵌套SVG图形  
- ✅ 大型数据表格
- ✅ 深层嵌套列表
- ✅ 特殊字符和Unicode
- ✅ 错误恢复场景
- ✅ 性能压力测试
- ✅ 边界条件处理

文档统计：
- 总字符数：约${Math.ceil('# 极端测试用例文档'.length * 50)}字符
- 数学公式：约30个
- SVG图形：约15个
- 表格：3个大型表格
- 列表层级：最深6层

测试目标：验证系统在极端条件下的稳定性和错误恢复能力。