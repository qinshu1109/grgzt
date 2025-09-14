const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// 创建主窗口
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'GRGZT App'
  });

  // 加载React应用
  mainWindow.loadFile('index.html');

  // 开发环境下打开开发者工具
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

// 应用准备就绪时创建窗口
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 当所有窗口关闭时退出应用
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC处理：创建数据库表
ipcMain.handle('create-tables', async () => {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(app.getPath('userData'), 'app.db');
  const db = new sqlite3.Database(dbPath);

  try {
    // 创建用户表
    await new Promise((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // 创建任务表
    await new Promise((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT,
          status TEXT DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    return { success: true, message: 'Tables created successfully' };
  } catch (error) {
    return { success: false, message: error.message };
  } finally {
    db.close();
  }
});

// IPC处理：获取用户列表
ipcMain.handle('get-users', async () => {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(app.getPath('userData'), 'app.db');
  const db = new sqlite3.Database(dbPath);

  try {
    const users = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM users ORDER BY created_at DESC', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    return { success: true, data: users };
  } catch (error) {
    return { success: false, message: error.message };
  } finally {
    db.close();
  }
});

// IPC处理：添加用户
ipcMain.handle('add-user', async (event, userData) => {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(app.getPath('userData'), 'app.db');
  const db = new sqlite3.Database(dbPath);

  try {
    const result = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO users (name, email) VALUES (?, ?)',
        [userData.name, userData.email],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    });

    return { success: true, data: result };
  } catch (error) {
    return { success: false, message: error.message };
  } finally {
    db.close();
  }
});

// IPC处理：获取任务列表
ipcMain.handle('get-tasks', async () => {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(app.getPath('userData'), 'app.db');
  const db = new sqlite3.Database(dbPath);

  try {
    const tasks = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM tasks ORDER BY created_at DESC', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    return { success: true, data: tasks };
  } catch (error) {
    return { success: false, message: error.message };
  } finally {
    db.close();
  }
});

// IPC处理：添加任务
ipcMain.handle('add-task', async (event, taskData) => {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(app.getPath('userData'), 'app.db');
  const db = new sqlite3.Database(dbPath);

  try {
    const result = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO tasks (title, description, status) VALUES (?, ?, ?)',
        [taskData.title, taskData.description || '', taskData.status || 'pending'],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    });

    return { success: true, data: result };
  } catch (error) {
    return { success: false, message: error.message };
  } finally {
    db.close();
  }
});

// IPC处理：更新任务状态
ipcMain.handle('update-task-status', async (event, taskId, status) => {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(app.getPath('userData'), 'app.db');
  const db = new sqlite3.Database(dbPath);

  try {
    const result = await new Promise((resolve, reject) => {
      db.run(
        'UPDATE tasks SET status = ? WHERE id = ?',
        [status, taskId],
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });

    return { success: true, data: result };
  } catch (error) {
    return { success: false, message: error.message };
  } finally {
    db.close();
  }
});