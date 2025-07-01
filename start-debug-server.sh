#!/bin/bash

# 配置变量
PORT=13687
SERVER_DIR="/Users/tjp/projects/miniprogram/game_demo"
PYTHON_CMD="python3"
SERVER_SCRIPT="serve.py"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_separator() {
    echo -e "${BLUE}================================================${NC}"
}

# 检查是否存在Python3
check_python() {
    if ! command -v $PYTHON_CMD &> /dev/null; then
        print_error "Python3 未找到，请确保已安装 Python 3"
        exit 1
    fi
    print_success "Python3 检查通过: $(python3 --version)"
}

# 检查服务器目录和脚本是否存在
check_server_files() {
    if [ ! -d "$SERVER_DIR" ]; then
        print_error "服务器目录不存在: $SERVER_DIR"
        exit 1
    fi
    
    if [ ! -f "$SERVER_DIR/$SERVER_SCRIPT" ]; then
        print_error "服务器脚本不存在: $SERVER_DIR/$SERVER_SCRIPT"
        exit 1
    fi
    
    print_success "服务器文件检查通过"
}

# 检查端口是否被占用
check_port() {
    local pid=$(lsof -ti:$PORT 2>/dev/null)
    if [ -n "$pid" ]; then
        return 0  # 端口被占用
    else
        return 1  # 端口未被占用
    fi
}

# 关闭占用端口的进程
kill_existing_server() {
    local pids=$(lsof -ti:$PORT 2>/dev/null)
    
    if [ -n "$pids" ]; then
        print_warning "发现端口 $PORT 被以下进程占用:"
        
        # 显示占用端口的进程信息
        echo ""
        lsof -i:$PORT 2>/dev/null | head -n 1  # 显示标题行
        lsof -i:$PORT 2>/dev/null | grep -v "COMMAND"  # 显示进程信息
        echo ""
        
        print_info "正在终止这些进程..."
        
        # 逐个终止进程
        for pid in $pids; do
            if kill -0 $pid 2>/dev/null; then
                print_info "终止进程 PID: $pid"
                kill -TERM $pid 2>/dev/null
                
                # 等待进程终止，最多等待5秒
                local count=0
                while kill -0 $pid 2>/dev/null && [ $count -lt 50 ]; do
                    sleep 0.1
                    count=$((count + 1))
                done
                
                # 如果进程仍然存在，强制终止
                if kill -0 $pid 2>/dev/null; then
                    print_warning "进程 $pid 未响应 TERM 信号，使用 KILL 信号强制终止"
                    kill -KILL $pid 2>/dev/null
                    sleep 0.5
                fi
                
                if ! kill -0 $pid 2>/dev/null; then
                    print_success "进程 $pid 已终止"
                else
                    print_error "无法终止进程 $pid"
                fi
            fi
        done
        
        # 再次检查端口是否已释放
        sleep 1
        if check_port; then
            print_error "端口 $PORT 仍被占用，请手动检查"
            exit 1
        else
            print_success "端口 $PORT 已释放"
        fi
    else
        print_info "端口 $PORT 当前未被占用"
    fi
}

# 启动调试服务器
start_server() {
    print_info "切换到服务器目录: $SERVER_DIR"
    cd "$SERVER_DIR" || {
        print_error "无法切换到目录: $SERVER_DIR"
        exit 1
    }
    
    print_info "启动调试服务器..."
    print_separator
    echo -e "${GREEN}🚀 服务器启动信息:${NC}"
    echo -e "${BLUE}   📁 服务目录: $SERVER_DIR${NC}"
    echo -e "${BLUE}   🌐 服务地址: http://localhost:$PORT/${NC}"
    echo -e "${BLUE}   🎮 游戏页面: http://localhost:$PORT/index.html${NC}"
    echo -e "${BLUE}   🐛 调试页面: http://localhost:$PORT/online-debug.html${NC}"
    print_separator
    echo -e "${YELLOW}按 Ctrl+C 停止服务器${NC}"
    echo ""
    
    # 启动服务器，传递端口参数
    exec $PYTHON_CMD $SERVER_SCRIPT -p $PORT
}

# 信号处理函数
cleanup() {
    echo ""
    print_info "收到停止信号，正在优雅地关闭服务器..."
    
    # 给Python服务器一点时间自己处理信号
    sleep 1
    
    # 检查是否还有服务在运行
    local remaining_pids=$(lsof -ti:$PORT 2>/dev/null)
    if [ -n "$remaining_pids" ]; then
        print_warning "服务器仍在运行，正在强制停止..."
        kill_existing_server
    fi
    
    print_success "调试服务器已完全停止"
    print_separator
    echo -e "${GREEN}感谢使用小程序游戏调试服务器！${NC}"
    exit 0
}

# 主函数
main() {
    print_separator
    echo -e "${GREEN}🎮 小程序游戏调试服务器启动脚本${NC}"
    print_separator
    
    # 设置信号处理
    trap cleanup SIGINT SIGTERM
    
    # 执行检查
    print_info "正在执行环境检查..."
    check_python
    check_server_files
    
    # 处理现有服务
    print_info "检查端口占用情况..."
    kill_existing_server
    
    # 启动新服务
    start_server
}

# 显示帮助信息
show_help() {
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -h, --help     显示帮助信息"
    echo "  -p, --port     指定端口号 (默认: 13687)"
    echo "  -d, --dir      指定服务器目录"
    echo ""
    echo "示例:"
    echo "  $0                    # 使用默认配置启动"
    echo "  $0 -p 3000           # 在端口3000启动"
    echo "  $0 -d /path/to/game  # 指定游戏目录"
    echo ""
    echo "调试URL:"
    echo "  游戏页面: http://localhost:$PORT/index.html"
    echo "  调试页面: http://localhost:$PORT/online-debug.html"
}

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -p|--port)
            PORT="$2"
            shift 2
            ;;
        -d|--dir)
            SERVER_DIR="$2"
            shift 2
            ;;
        *)
            print_error "未知参数: $1"
            show_help
            exit 1
            ;;
    esac
done

# 运行主函数
main 