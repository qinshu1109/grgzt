# Solo Workbench - 个人接单工作台

## 项目概述
Solo Workbench 是一个专为 freelancers 和个人开发者设计的极简项目管理工具，专注于接单、报价、项目执行和工时管理的完整工作流。

## 核心功能
- **线索管理** - 客户信息收集和项目需求整理
- **报价系统** - 功能点分解、工时估算、三档报价策略
- **项目管理** - 线索转项目、任务分解、进度跟踪
- **工时记录** - 实时计时器、工时统计、数据分析
- **数据导出** - 项目数据导出和财务统计

## 技术架构
- **前端**: React 18.2.0 + Tailwind CSS
- **后端**: Electron 30.0.0
- **数据库**: SQLite 3 (本地存储)
- **通信**: IPC (进程间通信)

## 核心代码文件
- **main.js** - 主进程，包含所有业务逻辑和数据库操作
- **index.html** - 完整的React前端界面
- **preload.js** - Electron安全API桥接
- **server.js** - Web开发服务器

## 快速开始
```bash
# 安装依赖
npm install

# 开发模式 (Web浏览器)
npm run dev

# 生产模式 (Electron应用)
npm start
```

## 数据库设计
项目使用SQLite数据库，包含以下核心表：
- `users` - 用户管理
- `leads` - 客户线索
- `features` - 功能点
- `projects` - 项目
- `project_tasks` - 项目任务
- `timesheets` - 工时记录
- `quotes` - 报价
- `quote_items` - 报价明细

## 项目状态
- ✅ 基础架构搭建完成
- ✅ 线索管理和报价功能
- ✅ 项目执行和计时功能
- 🔄 收款管理和数据导出 (部分实现)

## 部署说明
- 支持 Windows/macOS/Linux
- 双模式运行：Electron桌面应用 + Web浏览器
- 数据本地存储，无需云服务

## 许可证
MIT License