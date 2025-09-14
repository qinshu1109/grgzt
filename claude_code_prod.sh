#!/bin/bash

set -euo pipefail

# ========================
#       常量定义
# ========================
SCRIPT_NAME=$(basename "$0")
NODE_MIN_VERSION=18
NODE_INSTALL_VERSION=22
NVM_VERSION="v0.40.3"
CLAUDE_PACKAGE="@anthropic-ai/claude-code"
CONFIG_DIR="$HOME/.claude"
CONFIG_FILE="$CONFIG_DIR/settings.json"
API_BASE_URL="https://open.bigmodel.cn/api/anthropic"
API_KEY_URL="https://open.bigmodel.cn/usercenter/proj-mgmt/apikeys"
API_TIMEOUT_MS=3000000

# 你的 ZHIPU API Key（已内置）
API_KEY_EMBEDDED='f8e84ebe55404afda787c7bab7205705.Mah6WGFa8L4X59T3'

# ========================
#       工具函数
# ========================

log_info() { echo "🔹 $*"; }
log_success() { echo "✅ $*"; }
log_error() { echo "❌ $*" >&2; }

ensure_dir_exists() {
    local dir="$1"
    if [ ! -d "$dir" ]; then
        mkdir -p "$dir" || { log_error "Failed to create directory: $dir"; exit 1; }
    fi
}

# ========================
#     Node.js 安装函数
# ========================

install_nodejs() {
    local platform
    platform=$(uname -s)

    case "$platform" in
        Linux|Darwin)
            log_info "Installing Node.js on $platform..."

            # 安装 nvm
            log_info "Installing nvm ($NVM_VERSION)..."
            curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/"$NVM_VERSION"/install.sh | bash

            # 加载 nvm
            log_info "Loading nvm environment..."
            # shellcheck disable=SC1090
            \. "$HOME/.nvm/nvm.sh"

            # 安装 Node.js
            log_info "Installing Node.js $NODE_INSTALL_VERSION..."
            nvm install "$NODE_INSTALL_VERSION"

            # 验证安装
            node -v &>/dev/null || { log_error "Node.js installation failed"; exit 1; }
            log_success "Node.js installed: $(node -v)"
            log_success "npm version: $(npm -v)"
            ;;
        *)
            log_error "Unsupported platform: $platform"
            exit 1
            ;;
    esac
}

# ========================
#     Node.js 检查函数
# ========================

check_nodejs() {
    if command -v node &>/dev/null; then
        current_version=$(node -v | sed 's/v//')
        major_version=$(echo "$current_version" | cut -d. -f1)

        if [ "$major_version" -ge "$NODE_MIN_VERSION" ]; then
            log_success "Node.js is already installed: v$current_version"
            return 0
        else
            log_info "Node.js v$current_version is installed but version < $NODE_MIN_VERSION. Upgrading..."
            install_nodejs
        fi
    else
        log_info "Node.js not found. Installing..."
        install_nodejs
    fi
}

# ========================
#     Claude Code 安装
# ========================

install_claude_code() {
    if command -v claude &>/dev/null; then
        log_success "Claude Code is already installed: $(claude --version)"
    else
        log_info "Installing Claude Code..."
        npm install -g "$CLAUDE_PACKAGE" || { log_error "Failed to install claude-code"; exit 1; }
        log_success "Claude Code installed successfully"
    fi
}

configure_claude_json(){
  node --eval '
      const os = require("os");
      const fs = require("fs");
      const path = require("path");
      const homeDir = os.homedir();
      const filePath = path.join(homeDir, ".claude.json");
      const base = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, "utf-8")) : {};
      fs.writeFileSync(filePath, JSON.stringify({ ...base, hasCompletedOnboarding: true }, null, 2), "utf-8");
  '
}

# ========================
#     API Key 配置
# ========================

configure_claude() {
    log_info "Configuring Claude Code with embedded API key..."
    local api_key="$API_KEY_EMBEDDED"

    ensure_dir_exists "$CONFIG_DIR"

    node --eval '
        const os = require("os");
        const fs = require("fs");
        const path = require("path");

        const homeDir = os.homedir();
        const filePath = path.join(homeDir, ".claude", "settings.json");
        const content = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, "utf-8")) : {};

        const updated = {
          ...content,
          env: {
            ...(content.env || {}),
            ANTHROPIC_AUTH_TOKEN: "'"$api_key"'",
            ANTHROPIC_BASE_URL: "'"$API_BASE_URL"'",
            API_TIMEOUT_MS: "'"$API_TIMEOUT_MS"'",
          }
        };

        fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), "utf-8");
    ' || { log_error "Failed to write settings.json"; exit 1; }

    chmod 600 "$CONFIG_FILE" || true
    log_success "Claude Code configured (settings.json updated, key not echoed)"
}

# ========================
#        主流程
# ========================

main() {
    echo "🚀 Starting $SCRIPT_NAME"

    check_nodejs
    install_claude_code
    configure_claude_json
    configure_claude

    echo ""
    log_success "🎉 Installation completed successfully!"
    echo ""
    echo "🚀 You can now start using Claude Code with:"
    echo "   claude"
}

main "$@"

