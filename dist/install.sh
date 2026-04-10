#!/bin/bash

# LUMEN OpenCLI Adapters 一键安装脚本

# 1. 确定目标目录
TARGET_DIR="$HOME/.opencli/clis"

echo "正在准备安装适配器到: $TARGET_DIR"

# 2. 创建目录（如果不存在）
mkdir -p "$TARGET_DIR"

# 3. 复制适配器
cp -r clis/* "$TARGET_DIR/"

echo "✅ 安装成功！"
echo "你可以运行 'opencli list' 来验证 archdaily 和 gooood 是否在列表中。"
echo "输入 'opencli archdaily search --help' 查看使用说明。"
