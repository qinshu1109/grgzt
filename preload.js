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
  updateTaskStatus: (taskId, status) => ipcRenderer.invoke('update-task-status', taskId, status)
});