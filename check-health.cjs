#!/usr/bin/env node

const http = require('http');
const { exec } = require('child_process');

async function checkService(port, path, description) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: port,
      path: path,
      method: 'GET',
      timeout: 5000
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`✅ ${description}: ${res.statusCode} ${res.statusMessage}`);
        if (res.headers['content-type'] && res.headers['content-type'].includes('application/json')) {
          try {
            const json = JSON.parse(data);
            console.log(`   JSON响应: ${JSON.stringify(json)}`);
          } catch (e) {
            console.log(`   数据: ${data.substring(0, 100)}...`);
          }
        } else {
          console.log(`   Content-Type: ${res.headers['content-type']}`);
          console.log(`   数据: ${data.substring(0, 100)}...`);
        }
        resolve(true);
      });
    });
    
    req.on('error', (error) => {
      console.log(`❌ ${description}: ${error.message}`);
      resolve(false);
    });
    
    req.on('timeout', () => {
      console.log(`⏰ ${description}: 请求超时`);
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
}

async function checkProcess(command, description) {
  return new Promise((resolve) => {
    exec(command, (error, stdout) => {
      if (stdout.trim()) {
        console.log(`✅ ${description}`);
      } else {
        console.log(`❌ ${description}`);
      }
      resolve();
    });
  });
}

async function main() {
  console.log('🔍 检查服务器状态...\n');
  
  console.log('1. 检查后端服务器:');
  await checkService(3001, '/api/health', '后端健康检查');
  await checkService(3001, '/api/stats', '后端统计接口');
  
  console.log('\n2. 检查前端服务器:');
  await checkService(5173, '/', '前端主页');
  await checkService(5173, '/api/health', '前端代理API');
  
  console.log('\n3. 检查进程:');
  await checkProcess('ps aux | grep "node.*src/server/index.js" | grep -v grep', '后端进程运行中');
  await checkProcess('ps aux | grep "node.*vite" | grep -v grep', '前端进程运行中');
  
  console.log('\n4. 检查端口占用:');
  await checkProcess('lsof -i :3001', '端口3001已占用');
  await checkProcess('lsof -i :5173', '端口5173已占用');
  
  console.log('\n✨ 健康检查完成！');
  console.log('\n💡 建议操作:');
  console.log('1. 在浏览器中访问 http://localhost:5173');
  console.log('2. 打开浏览器开发者工具 (F12)');
  console.log('3. 查看 Console 和 Network 标签页');
  console.log('4. 尝试上传文件并观察详细的错误信息');
  console.log('5. 如果仍有问题，请分享浏览器控制台的具体错误信息');
}

main().catch(console.error); 