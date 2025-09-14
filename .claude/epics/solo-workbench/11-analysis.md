---
issue: 11
title: "002 - 线索管理和报价功能"
created: 2025-01-14T00:00:00Z
updated: 2025-09-15T16:06:00Z
epic: solo-workbench
type: task
priority: medium
status: completed
github_comment: https://github.com/qinshu1109/grgzt/issues/11#issuecomment-3289654209
completion_date: 2025-09-15T16:06:00Z
github: https://github.com/qinshu1109/grgzt/issues/11
---

# Issue #11 Analysis

## 任务描述
实现最简单的客户线索录入和基础报价计算功能。

## 最小功能范围
- 客户信息表单（姓名、项目名、预算、期限）
- 功能点列表（名称、工时、复杂度）
- 三档报价计算（基础、标准、进阶）
- 简单的报价预览

## 技术实现分析

### 数据库设计
需要新增2个表：
```sql
-- 客户线索表
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  project_name TEXT,
  budget REAL,
  deadline DATE,
  status TEXT DEFAULT 'lead',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 功能点表
CREATE TABLE IF NOT EXISTS features (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  hours REAL NOT NULL,
  complexity REAL DEFAULT 1.0, -- 复杂度系数
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES leads(id)
);
```

### 并行工作流
可以分解为3个并行工作流：

**Stream A: 数据库层**
- 修改 preload.js 添加新API
- 修改 main.js 添加IPC处理
- 创建leads和features表

**Stream B: 客户管理UI**
- 客户信息表单组件
- 客户列表显示
- 数据加载和保存

**Stream C: 报价计算UI**
- 功能点管理
- 三档报价计算器
- 报价预览

### 报价计算公式
```
基础档 = (基础价 + Σ(工时 × 时薪 × 复杂度系数)) × 0.8
标准档 = 基础价 + Σ(工时 × 时薪 × 复杂度系数)
进阶档 = 标准档 × 1.25
```

### 依赖关系
- Stream B 和 Stream C 依赖 Stream A 的数据库API
- Stream B 和 Stream C 可以并行开发

## 实现时间预估
- Stream A: 2小时
- Stream B: 2小时
- Stream C: 2小时
总计：6小时

## 验收标准
- [x] ✅ 能够添加客户信息
- [x] ✅ 能够添加/删除功能点
- [x] ✅ 能够实时计算三档报价
- [x] ✅ 数据能保存到 SQLite
- [x] ✅ 页面刷新后数据不丢失

## 🎯 实际完成情况

### 完成时间
- **开始时间**: 2025-09-14T21:59:00Z
- **完成时间**: 2025-09-15T16:06:00Z
- **实际用时**: ~5小时（预估6小时）

### 关键成果
1. **双模式兼容**: 同时支持Electron SQLite和Web IndexedDB
2. **级联删除**: 删除线索时自动删除关联功能点
3. **实时计算**: 功能点变化时立即更新三档报价
4. **响应式设计**: 适配不同屏幕尺寸的UI布局
5. **数据完整性**: 外键约束和事务处理确保数据安全

### 技术亮点
- 使用React状态管理实现实时UI更新
- 采用contextBridge确保Electron安全性
- IndexedDB作为Web模式的数据存储方案
- 报价计算采用前端实时计算避免服务依赖

### 测试验证
- ✅ 端到端功能测试通过
- ✅ 客户线索添加、查看、删除功能正常
- ✅ 功能点添加、删除、报价计算正确
- ✅ 数据持久化验证通过
- ✅ 页面刷新数据不丢失
- ✅ 报价计算公式验证正确

---
**状态**: 已完成 ✅ | **GitHub评论**: https://github.com/qinshu1109/grgzt/issues/11#issuecomment-3289654209