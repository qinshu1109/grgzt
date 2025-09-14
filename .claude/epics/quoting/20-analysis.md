---
issue: 20
epic: quoting
title: 统一复杂度系数到单一配置源并全局生效
priority: P0
estimate: 4小时
module: pricing
analyzed: 2025-09-15T03:30:00Z
completed: 2025-09-15T03:45:00Z
status: completed

# 任务#20分析：统一复杂度系数配置

## 📋 任务简述
实现复杂度系数（S=1.0, M=1.5, L=2.2）的统一配置管理，消除硬编码不一致问题。

## 🎯 简洁实现原则
- **最小化修改**：仅修改必要的文件
- **复用现有架构**：不引入新框架
- **简单API设计**：一个函数搞定配置读取
- **基础UI**：最简单的表单，避免复杂交互

## 📁 文件范围分析
**必须修改**：
- main.js - 数据库操作和API实现
- index.html - 配置UI组件（简单表单）
- preload.js - API桥接

**绝不修改**：
- quotes/quote_items表核心结构
- 其他业务逻辑文件

## 🔧 技术实现要点

### 数据库设计
```sql
CREATE TABLE IF NOT EXISTS app_settings (
  id INTEGER PRIMARY KEY,
  key TEXT UNIQUE,
  value TEXT
);
```

### 配置数据结构
```json
{
  "complexity_factors": {
    "S": 1.0,
    "M": 1.5,
    "L": 2.2
  },
  "hourly_rate": 500,
  "base_price": 3000
}
```

### API设计
```javascript
// 最简单的API，一个函数搞定
function getAppSettings() {
  // 返回完整配置对象
}
```

## 🚀 实现策略

### 流程1：数据库层（30分钟）
1. 创建app_settings表
2. 插入默认配置数据
3. 实现getAppSettings()函数

### 流程2：API桥接（20分钟）
1. preload.js暴露API
2. 前端调用API
3. 错误处理和fallback

### 流程3：UI组件（40分钟）
1. 简单表单界面
2. 实时预览功能
3. 保存配置功能

### 流程4：替换硬编码（30分钟）
1. 搜索main.js中的硬编码
2. 替换为API调用
3. 验证功能正确性

## 🎯 并行工作流
由于任务相对简单，可以按顺序执行，不需要复杂的并行代理。

## 📊 风险评估
- **低风险**：主要是数据库操作和API设计
- **回退简单**：保留原有硬编码作为fallback
- **测试容易**：可以快速验证配置读取和价格计算

## 📝 验收清单
- [x] app_settings表创建成功
- [x] getAppSettings() API正常工作
- [x] 前端可以读取和修改配置
- [x] 所有硬编码系数被替换
- [x] 价格计算结果正确
- [x] 配置修改后重启应用仍生效

---

## ✅ 实现总结

### 🎯 已完成功能

**数据库层实现**:
- 创建了`app_settings`表结构，支持复杂度系数配置
- 实现了完整的配置管理API：
  - `get-app-settings` - 获取所有应用配置
  - `update-app-settings` - 更新应用配置
  - `get-complexity-factors` - 专门获取复杂度系数配置
  - `update-complexity-factors` - 更新复杂度系数配置

**API桥接**:
- 在preload.js中暴露了所有配置管理接口到前端
- 保持了与现有API的一致性
- 支持SQLite和IndexedDB双后端

**前端配置组件**:
- 添加了配置管理面板，支持显示/隐藏
- 实现了当前配置显示和配置修改表单
- 支持复杂度系数（S/M/L）、时薪、基础价格的配置
- 添加了配置验证和错误处理

**硬编码替换**:
- 替换了main.js中calculate-quote函数的硬编码系数
- 替换了index.html中Web API和前端计算函数的硬编码系数
- 保持了向后兼容性，配置不存在时使用默认值

### 🔧 技术实现要点

**配置数据结构**:
```json
{
  "complexity_factors": { "S": 1.0, "M": 1.5, "L": 2.2 },
  "hourly_rate": 500,
  "base_price": 3000
}
```

**核心API设计**:
- `getComplexityFactors()` - 统一获取复杂度系数
- `updateComplexityFactors()` - 更新复杂度系数
- `updateAppSettings()` - 更新完整配置

**简洁实现原则**:
- 最小化代码修改，仅修改3个文件
- 复用现有架构，不引入新框架
- 简单API设计，一个函数搞定配置读取
- 保持现有硬编码作为fallback机制

### 📊 实际效果

- ✅ 配置统一管理，前后端一致读取
- ✅ 消除了硬编码不一致问题
- ✅ 用户界面可以修改配置并实时预览
- ✅ 双后端支持（SQLite + IndexedDB）
- ✅ 高可靠性，包含完整fallback机制
- ✅ 配置持久化，重启后仍然有效

---
**任务完成**：采用最简洁的实现方式，避免过度设计，所有验收标准已达成