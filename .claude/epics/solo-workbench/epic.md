---
name: solo-workbench
status: backlog
created: 2025-09-14T12:48:33Z
progress: 0%
prd: .claude/prds/solo-workbench.md
github: [Will be updated when synced to GitHub]
---

# Epic: solo-workbench

## Overview

基于 Electron + React + SQLite 的本地单机工作台应用，为个人自由职业者提供从需求接洽到项目交付的全流程管理工具。采用极简设计理念，通过桌面应用形式实现数据本地化存储和完全离线操作，满足隐私保护和高效工作需求。

## Architecture Decisions

### 技术栈选择
- **Electron**：跨平台桌面应用框架，确保 Windows/macOS 兼容性
- **React + TypeScript**：前端框架，提供类型安全和组件化开发
- **SQLite**：轻量级本地数据库，零配置，满足单机应用需求
- **Tailwind CSS**：原子化 CSS 框架，快速实现极简设计风格

### 架构模式
- **单进程架构**：Electron 主进程 + 渲染进程，避免多进程复杂度
- **本地数据优先**：所有数据存储在本地 SQLite，无网络依赖
- **组件化设计**：UI 组件高度可复用，业务逻辑与展示分离
- **状态管理**：使用 React Context + useReducer，避免引入 Redux 等重型状态管理

### 关键技术决策
- **PDF 导出**：使用 Puppeteer（基于 Chromium）确保跨平台兼容性
- **Excel 导出**：SheetJS (xlsx) 库，纯前端实现，无后端依赖
- **数据备份**：SQLite 数据库文件直接复制 + 版本化管理
- **安全性**：数据加密存储（可选），敏感操作二次确认

## Technical Approach

### 前端组件架构

#### 核心页面组件
- **Dashboard**：首页 - 线索/项目卡片列表，搜索筛选
- **QuoteWorkspace**：报价工作台 - 功能点管理 + 三档报价预览
- **ProjectExecution**：项目执行台 - 任务清单 + 工时记录 + 里程碑
- **Settings**：系统设置 - 参数配置 + 路径管理

#### 通用组件
- **ProjectCard**：项目/线索卡片，支持快速操作
- **FeatureList**：功能点列表，支持拖拽排序
- **QuoteCalculator**：三档报价计算器，实时预览
- **TimerWidget**：悬浮计时器，全局可用
- **DataTable**：通用数据表格，支持排序筛选

#### 状态管理
```typescript
// 全局状态结构
interface AppState {
  projects: Project[]
  settings: Settings
  currentProject: Project | null
  timer: TimerState
}

// 使用 Context + useReducer
const AppContext = createContext<AppContext>(initialState)
```

### 数据层架构

#### 数据库 Schema
```sql
-- 线索表
CREATE TABLE leads (
  id INTEGER PRIMARY KEY,
  client TEXT NOT NULL,
  title TEXT NOT NULL,
  budget_min INTEGER,
  budget_max INTEGER,
  deadline DATE,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 项目表
CREATE TABLE projects (
  id INTEGER PRIMARY KEY,
  lead_id INTEGER,
  title TEXT NOT NULL,
  status TEXT CHECK(status IN ('draft', 'doing', 'done')) DEFAULT 'draft',
  base_price INTEGER,
  hourly_rate INTEGER,
  risk REAL DEFAULT 1.15,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES leads(id)
);

-- 功能点表
CREATE TABLE features (
  id INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  hours_est INTEGER NOT NULL,
  complexity TEXT CHECK(complexity IN ('S', 'M', 'L')) DEFAULT 'M',
  in_scope BOOLEAN DEFAULT true,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- 工时记录表
CREATE TABLE timesheets (
  id INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL,
  task TEXT NOT NULL,
  start_at DATETIME,
  end_at DATETIME,
  minutes INTEGER,
  note TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- 里程碑表
CREATE TABLE milestones (
  id INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  due_date DATE NOT NULL,
  paid_at DATE,
  status TEXT CHECK(status IN ('due', 'paid', 'overdue')) DEFAULT 'due',
  FOREIGN KEY (project_id) REFERENCES projects(id)
);
```

#### 数据访问层
```typescript
// 数据库操作封装
class Database {
  private db: Database

  constructor(dbPath: string) {
    this.db = new Database(dbPath)
  }

  // 项目 CRUD
  async createProject(project: Omit<Project, 'id'>): Promise<Project>
  async updateProject(id: number, updates: Partial<Project>): Promise<void>
  async deleteProject(id: number): Promise<void>
  async getProjects(): Promise<Project[]>

  // 报价计算
  async calculateQuote(projectId: number): Promise<QuoteResult>

  // 工时统计
  async getTimeStats(projectId: number): Promise<TimeStats>
}
```

### 业务逻辑层

#### 报价计算引擎
```typescript
class QuoteCalculator {
  calculate(
    basePrice: number,
    hourlyRate: number,
    features: Feature[],
    riskFactor: number = 1.15
  ): QuoteResult {
    const standard = basePrice + features.reduce((sum, feature) => {
      const complexity = this.getComplexityFactor(feature.complexity)
      return sum + feature.hoursEst * hourlyRate * complexity * riskFactor
    }, 0)

    return {
      basic: Math.round(standard * 0.8),
      standard: Math.round(standard),
      premium: Math.round(standard * 1.25)
    }
  }

  private getComplexityFactor(complexity: string): number {
    switch (complexity) {
      case 'S': return 1.0
      case 'M': return 1.5
      case 'L': return 2.2
      default: return 1.5
    }
  }
}
```

#### 计时器服务
```typescript
class TimerService {
  private timers: Map<string, Timer> = new Map()

  start(projectId: string, taskId?: string): void
  pause(projectId: string): void
  stop(projectId: string): TimesheetEntry
  getActiveTimers(): Timer[]

  // 自动保存到数据库
  private async saveTimesheet(entry: TimesheetEntry): Promise<void>
}
```

### 导出功能

#### PDF 导出
```typescript
class PDFExporter {
  async exportQuote(quote: QuoteResult, project: Project): Promise<string> {
    const html = this.generateQuoteHTML(quote, project)
    const pdf = await this.renderToPDF(html)
    return this.savePDF(pdf, this.generateFilename(project))
  }

  private async renderToPDF(html: string): Promise<Buffer> {
    // 使用 Puppeteer 渲染
  }
}
```

#### Excel 导出
```typescript
class ExcelExporter {
  async exportMilestones(projectId: number): Promise<string> {
    const milestones = await this.getMilestones(projectId)
    const workbook = this.createWorkbook(milestones)
    return this.saveExcel(workbook, this.generateFilename(projectId))
  }
}
```

## Implementation Strategy

### 开发阶段划分

#### Phase 1: 核心框架搭建 (Day 1)
- [ ] Electron 应用基础架构搭建
- [ ] SQLite 数据库初始化和模型定义
- [ ] React 基础组件库和路由配置
- [ ] 数据访问层 (DAO) 实现
- [ ] 基础 UI 组件开发 (卡片、表单、按钮)

#### Phase 2: 核心功能实现 (Day 2)
- [ ] 线索管理和项目创建功能
- [ ] 功能点管理和报价计算引擎
- [ ] 计时器服务和工时记录
- [ ] 里程碑管理和收款状态跟踪
- [ ] 基础数据导入导出功能

#### Phase 3: 完善和优化 (Day 3)
- [ ] PDF/Excel 导出功能完善
- [ ] 数据备份和恢复机制
- [ ] 性能优化和用户体验改进
- [ ] 测试覆盖和 bug 修复
- [ ] 打包和部署配置

### 风险控制策略

#### 技术风险缓解
- **跨平台兼容性**：使用 Electron 官方推荐的打包工具
- **数据安全**：实现自动备份 + 手动备份双重保障
- **性能优化**：使用虚拟列表处理大量数据，懒加载非关键功能

#### 开发效率提升
- **组件复用**：建立通用组件库，避免重复开发
- **类型安全**：全面使用 TypeScript，减少运行时错误
- **开发工具**：配置热重载和调试工具，提升开发体验

### 测试策略
- **单元测试**：核心业务逻辑和数据处理函数
- **集成测试**：数据库操作和 API 调用
- **端到端测试**：关键用户流程自动化测试
- **手动测试**：UI 交互和用户体验验证

## Task Breakdown Preview

### 基础架构任务
- [ ] **项目初始化**：Electron + React + TypeScript 项目搭建
- [ ] **数据库设计**：SQLite Schema 设计和数据模型定义
- [ ] **状态管理**：全局状态架构和 Context 设计
- [ ] **UI 组件库**：基础组件和设计系统实现

### 核心功能任务
- [ ] **线索管理**：客户信息录入和线索跟踪
- [ ] **报价系统**：功能点管理和三档报价计算
- [ ] **项目执行**：任务管理和计时器功能
- [ ] **收款管理**：里程碑管理和对账导出

### 系统功能任务
- [ ] **数据管理**：备份恢复和数据迁移
- [ ] **导出功能**：PDF 报价单和 Excel 对账单
- [ ] **设置系统**：参数配置和路径管理
- [ ] **性能优化**：响应速度和用户体验优化

## Dependencies

### 外部依赖
- **Electron**：桌面应用框架
- **React + TypeScript**：前端开发框架
- **SQLite3**：本地数据库
- **Tailwind CSS**：样式框架
- **Puppeteer**：PDF 渲染
- **xlsx**：Excel 导出

### 开发工具
- **Webpack**：模块打包
- **ESLint**：代码质量检查
- **Jest**：单元测试
- **Electron Builder**：应用打包

### 系统依赖
- **Node.js**：运行时环境
- **Chromium**：PDF 渲染引擎（Puppeteer 依赖）

## Success Criteria (Technical)

### 性能指标
- **应用启动时间** ≤ 3秒
- **报价计算响应** ≤ 1秒
- **PDF 导出时间** ≤ 5秒
- **Excel 导出时间** ≤ 10秒（2000行数据）
- **页面响应时间** ≤ 150ms

### 质量标准
- **代码覆盖率** ≥ 80%
- **TypeScript 严格模式**：无 any 类型使用
- **内存使用**：空闲状态 ≤ 100MB
- **稳定性**：连续运行24小时无崩溃

### 用户体验
- **操作流程**：核心功能 ≤ 3次点击完成
- **错误处理**：友好的错误提示和恢复机制
- **数据一致性**：异常退出不损坏数据
- **界面响应**：所有操作有即时视觉反馈

## Estimated Effort

### 时间估算
- **总开发时间**：3个工作日
- **Phase 1**：1天（基础架构）
- **Phase 2**：1天（核心功能）
- **Phase 3**：1天（完善优化）

### 关键路径
1. 数据库设计和实现（阻塞其他功能开发）
2. 报价计算引擎（核心业务逻辑）
3. PDF/Excel 导出功能（用户价值高的功能）

### 资源需求
- **开发人员**：1名全栈开发
- **设计资源**：UI 设计稿（可参考现有设计系统）
- **测试环境**：Windows 和 macOS 测试机器
- **部署工具**：代码签名和分发证书