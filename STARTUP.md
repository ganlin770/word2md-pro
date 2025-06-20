# 启动说明

## 解决 "Unexpected token '<', "<!DOCTYPE "... is not valid JSON" 错误

这个错误通常是因为后端服务器没有运行，导致前端请求被重定向到HTML错误页面。

### 方法一：使用启动脚本（推荐）

```bash
./start-all.sh
```

这个脚本会自动启动前后端服务器并进行健康检查。

### 方法二：手动启动

1. **首先启动后端服务器**（在一个终端窗口）：
   ```bash
   npm run start
   ```
   这将在端口 3001 上启动 Express 服务器

2. **然后启动前端开发服务器**（在另一个终端窗口）：
   ```bash
   npm run dev
   ```
   这将在端口 5173 上启动 Vite 开发服务器

3. **访问应用**：
   打开浏览器访问 http://localhost:5173

### 验证服务器状态：

可以访问以下URL检查后端服务器是否正常运行：
- http://localhost:3001/api/health

应该返回类似：
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0"
}
```

### 故障排查：

1. **检查端口占用**：
   ```bash
   lsof -i :3001  # Mac/Linux
   netstat -ano | findstr :3001  # Windows
   ```

2. **检查Node进程**：
   ```bash
   ps aux | grep node
   ```

3. **查看错误日志**：
   如果服务器启动失败，检查控制台输出的错误信息

4. **测试简单服务器**：
   ```bash
   node test-server.js
   ```
   然后访问 http://localhost:3001/api/health

### 常见问题：

1. **端口被占用**：
   - 关闭占用端口的进程
   - 或修改 `src/server/index.js` 中的 PORT 变量

2. **依赖未安装**：
   ```bash
   npm install
   ```

3. **权限问题**：
   ```bash
   sudo npm run start  # 仅在必要时使用
   ```

4. **Node.js 版本**：
   ```bash
   node --version  # 应该是 v14.x 或更高
   ```

### 开发提示：

- 使用 `Ctrl+Shift+M` 显示开发监控面板（查看console日志和网络请求）
- 监控面板会实时显示所有API调用和响应