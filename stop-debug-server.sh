#!/bin/bash

# 配置变量
PORT=8080

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

# 停止服务器
stop_server() {
    local pids=$(lsof -ti:$PORT 2>/dev/null)
    
    if [ -z "$pids" ]; then
        print_info "端口 $PORT 当前没有运行的服务"
        return 0
    fi
    
    print_warning "发现端口 $PORT 被以下进程占用:"
    echo ""
    lsof -i:$PORT 2>/dev/null
    echo ""
    
    print_info "正在停止调试服务器..."
    
    # 逐个终止进程
    for pid in $pids; do
        if kill -0 $pid 2>/dev/null; then
            print_info "停止进程 PID: $pid"
            kill -TERM $pid 2>/dev/null
            
            # 等待进程终止，最多等待3秒
            local count=0
            while kill -0 $pid 2>/dev/null && [ $count -lt 30 ]; do
                sleep 0.1
                count=$((count + 1))
            done
            
            # 如果进程仍然存在，强制终止
            if kill -0 $pid 2>/dev/null; then
                print_warning "进程 $pid 未响应，强制终止"
                kill -KILL $pid 2>/dev/null
                sleep 0.5
            fi
            
            if ! kill -0 $pid 2>/dev/null; then
                print_success "进程 $pid 已停止"
            else
                print_error "无法停止进程 $pid"
            fi
        fi
    done
    
    # 检查是否全部停止
    sleep 0.5
    local remaining_pids=$(lsof -ti:$PORT 2>/dev/null)
    if [ -z "$remaining_pids" ]; then
        print_success "调试服务器已完全停止"
    else
        print_error "仍有进程占用端口 $PORT"
        return 1
    fi
}

# 主函数
main() {
    echo -e "${BLUE}================================================${NC}"
    echo -e "${RED}🛑 停止小程序游戏调试服务器${NC}"
    echo -e "${BLUE}================================================${NC}"
    
    stop_server
}

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--port)
            PORT="$2"
            shift 2
            ;;
        -h|--help)
            echo "用法: $0 [选项]"
            echo ""
            echo "选项:"
            echo "  -h, --help     显示帮助信息"
            echo "  -p, --port     指定端口号 (默认: 8080)"
            echo ""
            echo "示例:"
            echo "  $0             # 停止默认端口8080的服务"
            echo "  $0 -p 3000     # 停止端口3000的服务"
            exit 0
            ;;
        *)
            print_error "未知参数: $1"
            exit 1
            ;;
    esac
done

main 