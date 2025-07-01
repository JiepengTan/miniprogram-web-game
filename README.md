# 简单测试游戏

这是一个用于测试微信小程序Web-view功能的简单HTML5游戏。

## 游戏特性

- 🎮 **控制方式**: 支持键盘方向键和触摸按钮
- 🏆 **游戏目标**: 控制金色方块收集所有金币
- 🚧 **障碍物**: 避开红色障碍物
- 📱 **响应式设计**: 自适应不同屏幕尺寸
- 🔄 **可重复游戏**: 支持重新开始

## 本地测试

### 1. 直接在浏览器中测试
```bash
# 在game_demo目录下启动本地服务器
cd game_demo
python -m http.server 8000
# 或者使用Node.js
npx serve .
```

然后在浏览器中访问 `http://localhost:8000`

### 2. 在微信开发者工具中测试
由于微信小程序的web-view组件只能加载HTTPS URL，您需要先将游戏部署到支持HTTPS的服务器上。

## 部署方案

### 方案1: GitHub Pages (推荐，免费)

1. 创建GitHub仓库
2. 将`index.html`上传到仓库
3. 启用GitHub Pages
4. 获得类似 `https://username.github.io/repo-name/index.html` 的URL

### 方案2: Netlify (推荐，免费)

1. 访问 [Netlify](https://netlify.com)
2. 拖拽`game_demo`文件夹到Netlify部署区域
3. 获得自动生成的HTTPS URL

### 方案3: Vercel (推荐，免费)

1. 访问 [Vercel](https://vercel.com)
2. 导入项目或拖拽文件夹
3. 获得自动生成的HTTPS URL

### 方案4: 腾讯云COS + CDN

1. 上传文件到腾讯云对象存储
2. 配置CDN域名
3. 启用HTTPS

## 在小程序中使用

1. 将游戏部署到HTTPS服务器
2. 获得游戏URL（例如：`https://your-username.github.io/game/index.html`）
3. 更新小程序代码中的URL：

```typescript
// 在 pages/game/game.ts 中更新
const gameUrl = options.gameUrl || 'https://your-actual-domain.com/game_demo/index.html'

// 在 pages/index/index.ts 中更新
url: '../game/game?gameUrl=https://your-actual-domain.com/game_demo/index.html'
```

4. 在微信公众平台配置业务域名：
   - 登录微信公众平台
   - 进入小程序管理后台
   - 选择"开发" > "开发管理" > "开发设置"
   - 在"业务域名"中添加您的游戏域名

## 游戏控制

- **键盘**: 方向键 ↑↓←→ 或 WASD
- **触摸**: 点击屏幕上的方向按钮
- **目标**: 收集所有15个金币
- **重新开始**: 游戏结束后点击"重新开始"按钮

## 技术特性

- 纯HTML5 + JavaScript，无外部依赖
- Canvas 2D渲染
- 响应式设计，适配移动端
- 支持触摸和键盘输入
- 包含碰撞检测和游戏逻辑
- 向父窗口发送消息（用于小程序通信）

## 自定义游戏

您可以轻松修改 `index.html` 文件来自定义游戏：

- 修改玩家颜色：更改 `this.player.color`
- 调整游戏难度：修改 `this.coinCount` 和 `this.player.speed`
- 添加新障碍物：在 `generateObstacles()` 中添加
- 改变游戏尺寸：修改 canvas 的 width 和 height

## 故障排除

### 游戏无法在小程序中加载
1. 确认URL是HTTPS协议
2. 检查是否已在微信公众平台配置业务域名
3. 查看微信开发者工具的控制台错误信息

### 游戏显示异常
1. 检查屏幕尺寸适配
2. 确认CSS样式没有冲突
3. 验证Canvas渲染是否正常

### 控制无响应
1. 确认触摸事件绑定
2. 检查键盘事件监听
3. 验证游戏是否处于运行状态 