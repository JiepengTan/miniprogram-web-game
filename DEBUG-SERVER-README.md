# 🎮 小程序游戏调试服务器

这个文件夹包含了用于启动和管理本地调试服务器的脚本，方便调试小程序中的web-view游戏。

## 📁 文件说明

| 文件 | 作用 | 说明 |
|------|------|------|
| `start.sh` | 🚀 快速启动 | 最简单的启动方式，双击即可运行 |
| `start-debug-server.sh` | 🔧 完整启动脚本 | 带详细检查和日志的启动脚本 |
| `stop-debug-server.sh` | 🛑 停止服务器 | 安全停止所有相关进程 |
| `serve.py` | 🌐 HTTP服务器 | Python HTTP服务器脚本 |
| `index.html` | 🎮 游戏页面 | 带日志转发功能的游戏页面 |
| `online-debug.html` | 🐛 调试页面 | 纯调试页面，用于测试日志转发 |

## 🚀 快速开始

### 方法1: 一键启动 (推荐)
```bash
./start.sh
```

### 方法2: 完整启动
```bash
./start-debug-server.sh
```

### 停止服务器
```bash
./stop-debug-server.sh
```

## 🔧 高级用法

### 自定义端口启动
```bash
./start-debug-server.sh -p 3000
```

### 自定义目录启动
```bash
./start-debug-server.sh -d /path/to/your/game
```

### 查看帮助信息
```bash
./start-debug-server.sh --help
./stop-debug-server.sh --help
```

## 🌐 访问地址

服务器启动后，可以通过以下地址访问：

| 地址 | 说明 |
|------|------|
| `http://localhost:8080/` | 服务器根目录 |
| `http://localhost:8080/index.html` | 完整游戏页面（带日志转发） |
| `http://localhost:8080/online-debug.html` | 调试测试页面 |

## 📱 小程序配置

在小程序的 `game.js` 中切换不同的调试URL：

```javascript
// 本地完整游戏
const baseUrl = 'http://localhost:8080/index.html';

// 本地调试页面  
const baseUrl = 'http://localhost:8080/online-debug.html';

// 线上游戏
const baseUrl = 'https://jiepengtan.github.io/miniprogram-web-game';
```

## 🐛 调试功能

### 日志转发功能
- ✅ 自动捕获所有 `console.log/error/warn/info/debug`
- ✅ 捕获JavaScript运行时错误
- ✅ 捕获未处理的Promise rejection
- ✅ 转发到小程序控制台和可视化调试面板

### 小程序调试面板
- 点击右上角🐛按钮打开调试面板
- 支持按日志级别颜色分类
- 支持清除日志和导出到剪贴板
- 实时显示日志数量

## ⚙️ 脚本特性

### `start-debug-server.sh` 功能
- 🔍 环境检查 (Python3, 文件存在性)
- 🔄 自动关闭占用端口的进程
- 🌐 网络连接检测
- 🎨 彩色输出和进度提示
- 🛡️ 优雅的信号处理 (Ctrl+C)
- 📊 详细的服务器信息显示

### `stop-debug-server.sh` 功能
- 🔍 检查端口占用情况
- 🔄 优雅终止进程 (TERM -> KILL)
- 📊 显示被终止的进程信息
- ✅ 确认所有进程已停止

## 🛠️ 故障排除

### 问题1: 端口被占用
**现象**: 启动时提示端口8080被占用
**解决**: 脚本会自动检测并关闭占用的进程

### 问题2: Python3未找到
**现象**: 提示"Python3 未找到"
**解决**: 安装Python3或检查PATH环境变量

### 问题3: 权限不足
**现象**: 脚本无法执行
**解决**: 
```bash
chmod +x *.sh
```

### 问题4: 小程序无法访问localhost
**现象**: 小程序提示网络错误
**解决**: 
1. 在微信开发者工具中启用"不校验合法域名"
2. 确保 `project.config.json` 中设置了 `"urlCheck": false`

## 📝 使用日志示例

### 启动成功的输出示例
```
================================================
🎮 小程序游戏调试服务器启动脚本
================================================
ℹ️  正在执行环境检查...
✅ Python3 检查通过: Python 3.9.7
✅ 服务器文件检查通过
ℹ️  检查端口占用情况...
ℹ️  端口 8080 当前未被占用
ℹ️  切换到服务器目录: /Users/tjp/projects/miniprogram/game_demo
ℹ️  启动调试服务器...
================================================
🚀 服务器启动信息:
   📁 服务目录: /Users/tjp/projects/miniprogram/game_demo
   🌐 服务地址: http://localhost:8080/
   🎮 游戏页面: http://localhost:8080/index.html
   🐛 调试页面: http://localhost:8080/online-debug.html
================================================
按 Ctrl+C 停止服务器

Server running at http://localhost:8080/
Game URL: http://localhost:8080/index.html
Press Ctrl+C to stop the server
```

## 💡 使用建议

1. **开发时**: 使用 `./start.sh` 快速启动
2. **调试时**: 使用 `online-debug.html` 页面测试日志转发
3. **测试时**: 使用 `index.html` 页面进行完整游戏测试
4. **完成后**: 使用 `./stop-debug-server.sh` 安全停止服务

## 🤝 更多帮助

如果遇到问题，可以：
1. 查看脚本的帮助信息 (`--help`)
2. 检查控制台的详细错误信息
3. 确认网络和防火墙设置 