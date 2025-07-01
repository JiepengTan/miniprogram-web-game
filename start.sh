#!/bin/bash

# 简化版启动脚本 - 一键启动调试服务器

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 正在启动游戏调试服务器...${NC}"

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 执行完整的启动脚本
exec "$SCRIPT_DIR/start-debug-server.sh" "$@" 