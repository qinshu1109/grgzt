# Epic: Intelligent Quoting System Implementation

**Epic ID**: quoting
**PRD Reference**: `.claude/prds/quoting.md`
**Created**: 2025-09-15
**Status**: Planning
**Estimated Duration**: P0: 2 weeks, P1: 1 week

## 📋 Executive Summary

基于已确认的PRD文档，将现有Solo Workbench从复杂项目管理工具简化为专注的PRD→报价智能系统。核心实现包括：PRD文本解析、规则驱动的技术功能点识别、三档报价计算、以及个人使用场景的极简界面。

**严格遵循PRD约束**：
- 仅实现PRD中明确的功能需求
- 保持现有Electron+React+SQLite架构
- 复用现有quotes/quote_items表结构
- 个人使用场景，不生成企业级复杂需求

## 🎯 Technical Architecture Decisions

### Core Stack (PRD Mandated)
- **Frontend**: React 18.2.0 + Tailwind CSS (内嵌于index.html)
- **Backend**: Electron 30.0.0 + SQLite 3 (桌面) / IndexedDB (Web回退)
- **Communication**: IPC进程间通信
- **No new frameworks**: 严格复用现有技术栈

### Data Model Implementation (PRD Defined)

**新增表结构**:
```sql
-- PRD历史记录
prds: id, title, raw_text, created_at, parse_method, extracted_json, confidence

-- 技术关键词词典
keyword_dict: id, tag, display_name, patterns_json TEXT, default_hours, default_complexity, weight
-- 说明: patterns以JSON格式存储字符串数组，或采用keyword_patterns(tag, pattern)子表

-- 报价基准配置
pricing_baselines: id, tag, base_hours, multiplier_S/M/L, default_rate, notes

-- 全局设置
app_settings: id, hourly_rate_default, base_price_default, complexity_factors, tax_percent_default, contingency_percent_default
```

**现有表结构扩展**:
```sql
-- quotes表扩展
quotes: 新增可选字段（subtotal_before_surcharge: feature+package小计，不含base_price/surcharge/contingency, notes）

-- quote_items表扩展
quote_items: 新增type（feature/package/surcharge/contingency）、meta（JSON存储公式）
```

### Key Algorithms (PRD Specified)
1. **文本预处理算法**: 格式化、分段、关键词提取
2. **词典匹配算法**: 多模式匹配、权重计算、冲突解决
3. **复杂度评估算法**: 基于技术特征的自动评级
4. **价格计算算法**: 多层次价格计算和打包项处理

## 🚀 Implementation Plan

### Phase P0: Core Functionality (2 weeks)

#### P0.1: Configuration Management (3 days)
**目标**: 统一复杂度系数配置，前后端一致读取

**技术实现**:
```javascript
// pricing_baselines配置结构
{
  "complexity_factors": { "S": 1.0, "M": 1.5, "L": 2.2 },
  "hourly_rate_default": 500,
  "base_price_default": 3000,
  "tax_percent_default": 0.06,
  "contingency_percent_default": 0.1
}
```

**实现任务**:
- [ ] 创建app_settings表结构
- [ ] 实现配置读取API (SQLite/IndexedDB统一接口)
- [ ] 前端配置组件开发
- [ ] 迁移现有硬编码复杂度系数

#### P0.2: UI Simplification (3 days)
**目标**: 隐藏现有项目管理功能，新增PRD粘贴区

**界面布局** (PRD指定):
```
┌─────────────────────────────────────────────────────────────┐
│ 顶部：模式切换（简洁模式/完整模式）｜设置｜历史记录              │
├─────────────────────────────────────────────────────────────┤
│ 左列：PRD粘贴区                │ 右列-上：识别结果表格          │
│ - 支持txt/md格式              │ - 功能条目、复杂度、工时       │
│ - 字数统计                    │ - 置信度、证据片段            │
│ - 「识别关键点」按钮          │ - 人工勾选/调整               │
│                               │                               │
│                               │ 右列-中：报价参数             │
│                               │ - 基础价、时薪、复杂度系数     │
│                               │ - 税费预留比例                │
│                               │ - 打包项配置                  │
│                               │                               │
│                               │ 右列-下：报价预览             │
│                               │ - 三档价格卡片                │
│                               │ - 总价和明细                  │
│                               │ - 导出/保存按钮               │
├─────────────────────────────────────────────────────────────┤
│ 底部：历史记录（最近N次PRD），点击可复用参数与条目            │
└─────────────────────────────────────────────────────────────┘
```

**实现任务**:
- [ ] 隐藏Leads/Projects/Tasks/Timesheets UI组件
- [ ] 实现简洁模式开关逻辑
- [ ] PRD粘贴区组件开发
- [ ] 识别结果表格组件
- [ ] 报价参数配置组件
- [ ] 报价预览组件

#### P0.3: Rule Engine Implementation (4 days)
**目标**: 实现20+技术标签的词典匹配和识别

**技术词典** (PRD指定):
```javascript
// 核心业务模块 (15个)
const coreTags = {
  'auth_basic': { name: '认证基础', hours: 16, complexity: 'M' },
  'oauth_sns': { name: '第三方登录', hours: 12, complexity: 'M' },
  'rbac_workflow': { name: '权限工作流', hours: 40, complexity: 'L' },
  'payment': { name: '支付系统', hours: 36, complexity: 'L' },
  'files_object': { name: '文件对象管理', hours: 20, complexity: 'M' },
  'realtime': { name: '实时通信', hours: 24, complexity: 'M' },
  'search': { name: '搜索功能', hours: 24, complexity: 'M' },
  'report_dashboard': { name: '报表仪表盘', hours: 28, complexity: 'M' },
  'notification': { name: '消息通知', hours: 12, complexity: 'S' },
  'geo_map': { name: '地图定位', hours: 20, complexity: 'M' },
  'i18n': { name: '多语言', hours: 10, complexity: 'S' },
  'multi_tenant': { name: '多租户', hours: 36, complexity: 'L' },
  'ai_basic': { name: 'AI基础', hours: 28, complexity: 'M' },
  'security_compliance': { name: '安全合规', hours: 20, complexity: 'M' },
  'admin_console': { name: '管理后台', hours: 16, complexity: 'M' }
};

// 集成与扩展 (5个)
const extensionTags = {
  'integration_x': { name: '第三方集成', hours: 16, complexity: 'M', perItem: true },
  'observability_logging': { name: '日志审计', hours: 16, complexity: 'M' },
  'devops_release': { name: 'CI/CD部署', hours: 20, complexity: 'M' },
  'nfr_perf': { name: '性能优化', hours: 24, complexity: 'M' },
  'nfr_reliability': { name: '可靠性保障', hours: 24, complexity: 'M' }
};
```

**匹配算法**:
```javascript
function extractFeatures(prdText, keywordDict) {
  // 1. 文本预处理：分段、去除噪音
  const sections = preprocessText(prdText);

  // 2. 词典匹配：多模式匹配、权重计算
  const matches = [];
  sections.forEach(section => {
    Object.entries(keywordDict).forEach(([tag, config]) => {
      const patterns = JSON.parse(config.patterns_json);
      patterns.forEach(pattern => {
        if (section.text.match(new RegExp(pattern, 'gi'))) {
          matches.push({
            tag,
            section: section.title,
            text: section.text,
            confidence: calculateConfidence(pattern, section.text),
            weight: config.weight
          });
        }
      });
    });
  });

  // 3. 冲突解决：高权重优先，去重
  const uniqueMatches = resolveConflicts(matches);

  // 4. 生成功能条目
  return uniqueMatches.map(match => ({
    tag: match.tag,
    name: keywordDict[match.tag].display_name,
    complexity: keywordDict[match.tag].default_complexity,
    estimated_hours: keywordDict[match.tag].default_hours,
    evidence: {
      section: match.section,
      text: match.text,
      confidence: match.confidence
    }
  }));
}
```

**实现任务**:
- [ ] keyword_dict表结构创建和初始数据导入
- [ ] 文本预处理算法实现
- [ ] 词典匹配算法实现
- [ ] 置信度计算和冲突解决逻辑
- [ ] 识别结果数据结构定义

#### P0.4: Virtual Lead Handling (2 days)
**目标**: 实现client_name占位格式，确保数据库约束兼容

**虚拟线索格式** (PRD指定): `PRD/<yyyy-MM-dd HH:mm>/<slug>`

**实现任务**:
- [ ] 虚拟线索生成逻辑
- [ ] 数据库约束兼容性处理
- [ ] 虚拟线索与报价关联逻辑

#### P0.5: Pricing Engine (3 days)
**目标**: 实现三档价格计算，支持打包项和税费处理

**计算公式** (PRD指定):
```javascript
// 定义
const subtotal_core = sum(feature与package明细行金额);
const surcharge = subtotal_core * tax_percent;
const contingency = subtotal_core * contingency_percent;

// 总价
const total = base_price + subtotal_core + surcharge + contingency;

// 三档
const basic = 0.8 * total;
const standard = 1.0 * total;
const premium = 1.25 * total;
```

**实现任务**:
- [ ] 报价计算API开发
- [ ] quote_items类型扩展（feature/package/surcharge/contingency）
- [ ] 打包项管理逻辑
- [ ] 实时价格预览功能

#### P0.6: Keyword Dictionary Maintenance (2 days)
**目标**: 技术词典的可视化维护（P0关键能力）

**实现任务**:
- [ ] 词典维护界面开发
- [ ] 词典导入导出功能
- [ ] 表格编辑功能
- [ ] 词典数据验证

#### P0.7: Markdown Export (2 days)
**目标**: 实现详细版和简版两种模板的报价单导出

**实现任务**:
- [ ] Markdown模板引擎开发
- [ ] 详细版和简版模板实现
- [ ] 报价单生成和下载功能
- [ ] 导出格式验证

### Phase P1: Stability Enhancement (1 week)

#### P1.1: History Management (2 days)
**目标**: PRD文本和识别结果的完整保存和检索

**实现任务**:
- [ ] prds表结构创建
- [ ] PRD历史记录保存逻辑
- [ ] 历史记录检索界面
- [ ] 数据复用功能

#### P1.2: Evidence Viewing (2 days)
**目标**: 识别结果表格支持证据片段查看

**实现任务**:
- [ ] 证据片段存储结构优化
- [ ] 证据查看组件开发
- [ ] 置信度可视化展示
- [ ] 不确定性提示功能

#### P1.3: Package Management (2 days)
**目标**: 实现打包项的灵活配置和税费预留计算

**实现任务**:
- [ ] 打包项配置界面
- [ ] 税费预留百分比设置
- [ ] 打包项模板管理
- [ ] 自动计算逻辑优化

#### P1.4: Performance Optimization (1 day)
**目标**: 大文本分段处理和用户感知优化

**实现任务**:
- [ ] 文本分段处理逻辑
- [ ] 进度反馈机制
- [ ] 渐进式结果展示
- [ ] 性能监控

### Phase P2: Optional Enhancements (On-demand)

#### P2.1: LLM Integration
- [ ] 大模型模式接入（OpenAI/Anthropic等）
- [ ] API配置界面
- [ ] 模型结果校验逻辑

#### P2.2: Third-party Integration Recognition
- [ ] 第三方服务自动识别
- [ ] 集成数量计算逻辑
- [ ] 常见第三方库识别

#### P2.3: Advanced Export
- [ ] Excel/CSV格式导出
- [ ] PDF格式导出
- [ ] 模板定制功能

## 📊 Success Metrics (PRD Defined)

### 量化指标
- **效率提升**: PRD分析时间从30分钟缩短到5分钟以内
- **识别准确率**: 在用户提供的历史PRD测试集上，以条目级指标评估；经词典迭代后目标75-85%起步，持续提升
- **用户满意度**: 个人满意度评分，操作流程是否减少手工时间
- **数据完整性**: 历史记录保存率达到100%

### 质量指标
- **系统稳定性**: 功能上线后3个月内无重大bug
- **性能表现**: PRD识别响应时间，大文本(>50k)采用进度分段+结果渐显，以用户感知为先
- **数据安全**: 本地数据加密，支持隐私保护
- **兼容性**: 支持Windows/macOS/Linux三大平台

## 🗂️ File Structure

```
.claude/epics/quoting/
├── epic.md                          # 本文件
├── 001.md                           # P0.1: Configuration Management
├── 002.md                           # P0.2: UI Simplification
├── 003.md                           # P0.3: Rule Engine Implementation
├── 004.md                           # P0.4: Virtual Lead Handling
├── 005.md                           # P0.5: Pricing Engine
├── 006.md                           # P0.6: Keyword Dictionary Maintenance
├── 007.md                           # P0.7: Markdown Export
├── 008.md                           # P1.1: History Management
├── 009.md                           # P1.2: Evidence Viewing
├── 010.md                           # P1.3: Package Management
├── 011.md                           # P1.4: Performance Optimization
└── updates/                         # 工作进展记录
```

## ⚠️ Technical Constraints

### 必须遵守的约束
- **严格复用现有技术栈**: 不引入新框架
- **保持现有架构**: Electron + React + SQLite/IndexedDB
- **个人使用场景**: 不生成企业级复杂需求
- **最小化修改**: 优先扩展现有表结构，避免大规模重构
- **本地存储优先**: 数据主要存储在本地，支持隐私保护

### 数据库约束
- **SQLite兼容性**: patterns使用JSON TEXT格式，避免数组类型
- **虚拟线索处理**: client_name必须满足NOT NULL约束
- **表结构扩展**: 通过添加可选字段，不破坏现有数据

### 性能约束
- **文本处理**: 支持200k字符，分段处理
- **响应时间**: 大文本采用渐进式展示
- **内存使用**: 避免大文本全量加载

## 🔄 Dependencies

### 内部依赖
- 现有quotes/quote_items表结构
- 现有Electron IPC通信机制
- 现有React组件库

### 外部依赖
- SQLite 3 (现有)
- IndexedDB (现有回退方案)
- 无新外部依赖

## 📝 Notes

### 实现原则
- **读取→计划→最小修改**: 优先复用现有代码
- **边界守卫**: 不跨越模块边界，保持架构清晰
- **可运行代码优先**: 提交可运行的代码，避免过度设计
- **人工校准核心**: 工时和复杂度以用户配置为准

### 风险控制
- **识别准确率**: 通过人工校准和词典迭代优化
- **数据迁移**: 虚拟线索方案确保现有功能不受影响
- **用户体验**: 简洁模式不影响现有完整模式使用

---

**Epic Status**: 规划完成，等待任务分解
**Next Step**: `/pm:epic-decompose quoting`
**Total Estimated Tasks**: 11个主要任务