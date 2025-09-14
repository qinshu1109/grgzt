---
issue: 20
stream: main
agent: general-purpose
started: 2025-09-15T03:30:00Z
status: in_progress

---

# 任务#20进度：统一复杂度系数配置

## 📋 任务目标
实现复杂度系数（S=1.0, M=1.5, L=2.2）的统一配置管理

## 🎯 简洁实现策略
- 最小化代码修改
- 复用现有架构
- 简单API设计
- 基础UI组件

## 📁 实施范围
**修改文件**：main.js, index.html, preload.js
**绝不修改**：其他业务逻辑，数据库核心结构

## 🚀 进度状态

### ✅ 准备工作
- [x] 创建分析文档
- [x] 检查worktree存在
- [x] 设置进度跟踪

### ✅ 已完成
- [x] 创建app_settings表结构
- [x] 实现getAppSettings() API
- [x] 前端简单配置UI
- [x] 替换硬编码系数
- [x] 验证测试

### 🔄 实施中
- [ ] 最终验证和文档

### 📊 技术要点
- SQLite + IndexedDB双后端支持
- 一个API函数搞定配置读取
- 简单表单界面，避免复杂交互
- 保持现有硬编码作为fallback

---
正在实施中...