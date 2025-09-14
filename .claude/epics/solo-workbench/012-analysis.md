---
issue: 12
title: "003 - 项目执行和计时功能"
created: 2025-01-14T00:00:00Z
updated: 2025-09-14T15:28:05Z
epic: solo-workbench
type: task
priority: medium
status: completed
github: https://github.com/qinshu1109/grgzt/issues/12
---

# Issue #12 Analysis

## 任务描述
实现最简单的项目管理界面和基础计时功能。

## 最小功能范围
- 项目列表显示（从线索转换）
- 任务清单管理（添加、完成标记）
- 简单的计时器（开始/暂停/停止）
- 工时记录显示

## 技术实现分析

### 数据库设计
需要新增2个表：
```sql
-- 项目表（从线索转换）
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  base_price INTEGER,
  hourly_rate INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES leads(id)
);

-- 任务表
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo', -- todo, doing, done
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- 工时记录表
CREATE TABLE IF NOT EXISTS timesheets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  task_id INTEGER,
  description TEXT NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME,
  duration_minutes INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);
```

### 并行工作流
可以分解为3个并行工作流：

**Stream A: 数据库层**
- 修改 preload.js 添加项目管理API
- 修改 main.js 添加IPC处理
- 创建projects、tasks、timesheets表

**Stream B: 项目管理UI**
- 项目列表显示组件
- 从线索转换项目功能
- 项目详情页面

**Stream C: 计时器功能**
- 计时器组件（开始/暂停/停止）
- 任务管理（添加/完成）
- 工时记录显示和统计

### 依赖关系
- Stream B 和 Stream C 依赖 Stream A 的数据库API
- Stream B 和 Stream C 可以并行开发

## 实现时间预估
- Stream A: 2小时
- Stream B: 1.5小时
- Stream C: 1.5小时
总计：5小时

## 验收标准
- [ ] 能显示项目列表
- [ ] 能添加/完成任务
- [ ] 计时器能正常工作
- [ ] 工时记录能保存
- [ ] 能查看工时统计