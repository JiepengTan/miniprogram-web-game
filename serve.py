#!/usr/bin/env python3
import http.server
import socketserver
import os
import signal
import sys
import argparse

# 切换到当前目录
os.chdir(os.path.dirname(os.path.abspath(__file__)))

# 默认端口号
DEFAULT_PORT = 13687
Handler = http.server.SimpleHTTPRequestHandler

# 添加CORS头部支持
class CORSRequestHandler(Handler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        # 禁用缓存以便调试
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def log_message(self, format, *args):
        # 简化日志输出，添加emoji
        message = format % args
        if "GET" in message and ("200" in message or "304" in message):
            print(f"✅ {message}")
        elif "404" in message:
            print(f"❌ {message}")
        else:
            print(f"📝 {message}")

def signal_handler(sig, frame):
    print('\n')
    print('🛑 收到停止信号，正在关闭服务器...')
    print('✅ 服务器已安全停止')
    sys.exit(0)

def main():
    # 解析命令行参数
    parser = argparse.ArgumentParser(description='启动调试服务器')
    parser.add_argument('-p', '--port', type=int, default=DEFAULT_PORT,
                        help=f'指定服务器端口号 (默认: {DEFAULT_PORT})')
    args = parser.parse_args()
    
    PORT = args.port
    
    # 设置信号处理
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    try:
        with socketserver.TCPServer(("", PORT), CORSRequestHandler) as httpd:
            print(f"🚀 调试服务器启动成功")
            print(f"🌐 服务地址: http://localhost:{PORT}/")
            print(f"🎮 游戏页面: http://localhost:{PORT}/index.html")
            print(f"🐛 调试页面: http://localhost:{PORT}/online-debug.html")
            print(f"📂 服务目录: {os.getcwd()}")
            print("按 Ctrl+C 停止服务器")
            print("-" * 60)
            
            httpd.serve_forever()
            
    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"❌ 错误: 端口 {PORT} 已被占用")
            print(f"💡 解决方法:")
            print(f"   1. 运行 './stop-debug-server.sh' 停止其他服务")
            print(f"   2. 或使用 'lsof -ti:{PORT} | xargs kill' 手动终止")
            print(f"   3. 然后重新运行启动脚本")
            sys.exit(1)
        else:
            print(f"❌ 服务器启动失败: {e}")
            sys.exit(1)
    except KeyboardInterrupt:
        # 已由信号处理器处理
        pass
    except Exception as e:
        print(f"❌ 意外错误: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 