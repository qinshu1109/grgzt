const { contextBridge, ipcRenderer } = require('electron');

// 通过 contextBridge 暴露最小 API 到渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 数据库表操作
  createTables: () => ipcRenderer.invoke('create-tables'),

  // 用户操作
  getUsers: () => ipcRenderer.invoke('get-users'),
  addUser: (userData) => ipcRenderer.invoke('add-user', userData),

  // 任务操作
  getTasks: () => ipcRenderer.invoke('get-tasks'),
  addTask: (taskData) => ipcRenderer.invoke('add-task', taskData),
  updateTaskStatus: (taskId, status) => ipcRenderer.invoke('update-task-status', taskId, status),

  // 线索操作
  getLeads: () => ipcRenderer.invoke('get-leads'),
  addLead: (leadData) => ipcRenderer.invoke('add-lead', leadData),
  updateLead: (leadId, leadData) => ipcRenderer.invoke('update-lead', leadId, leadData),
  deleteLead: (leadId) => ipcRenderer.invoke('delete-lead', leadId),

  // 功能点操作
  getFeatures: (leadId) => ipcRenderer.invoke('get-features', leadId),
  addFeature: (featureData) => ipcRenderer.invoke('add-feature', featureData),
  updateFeature: (featureId, featureData) => ipcRenderer.invoke('update-feature', featureId, featureData),
  deleteFeature: (featureId) => ipcRenderer.invoke('delete-feature', featureId),

  // 项目操作
  getProjects: () => ipcRenderer.invoke('get-projects'),
  addProject: (projectData) => ipcRenderer.invoke('add-project', projectData),
  updateProject: (projectId, projectData) => ipcRenderer.invoke('update-project', projectId, projectData),
  deleteProject: (projectId) => ipcRenderer.invoke('delete-project', projectId),

  // 项目任务操作
  getProjectTasks: (projectId) => ipcRenderer.invoke('get-project-tasks', projectId),
  addProjectTask: (taskData) => ipcRenderer.invoke('add-project-task', taskData),
  updateProjectTask: (taskId, taskData) => ipcRenderer.invoke('update-project-task', taskId, taskData),
  deleteProjectTask: (taskId) => ipcRenderer.invoke('delete-project-task', taskId),

  // 工时记录操作
  getTimesheets: (projectId) => ipcRenderer.invoke('get-timesheets', projectId),
  addTimesheet: (timesheetData) => ipcRenderer.invoke('add-timesheet', timesheetData),
  updateTimesheet: (timesheetId, timesheetData) => ipcRenderer.invoke('update-timesheet', timesheetId, timesheetData),
  deleteTimesheet: (timesheetId) => ipcRenderer.invoke('delete-timesheet', timesheetId),

  // 报价操作
  getQuotes: (leadId = null) => ipcRenderer.invoke('get-quotes', leadId),
  getQuoteItems: (quoteId) => ipcRenderer.invoke('get-quote-items', quoteId),
  createQuote: (quoteData) => ipcRenderer.invoke('create-quote', quoteData),
  createQuoteItem: (itemData) => ipcRenderer.invoke('create-quote-item', itemData),
  updateQuote: (quoteId, quoteData) => ipcRenderer.invoke('update-quote', quoteId, quoteData),
  deleteQuote: (quoteId) => ipcRenderer.invoke('delete-quote', quoteId),
  calculateQuote: (leadId, basePrice = 0, hourlyRate = 500) => ipcRenderer.invoke('calculate-quote', leadId, basePrice, hourlyRate),

  // 应用配置操作
  getAppSettings: () => ipcRenderer.invoke('get-app-settings'),
  updateAppSettings: (settingsData) => ipcRenderer.invoke('update-app-settings', settingsData),
  getComplexityFactors: () => ipcRenderer.invoke('get-complexity-factors')
});