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
    // 启用外键约束
    await new Promise((resolve, reject) => {
      db.run('PRAGMA foreign_keys = ON', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
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

    // 创建线索表
    await new Promise((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS leads (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          client_name TEXT NOT NULL,
          project_name TEXT,
          budget_min INTEGER,
          budget_max INTEGER,
          deadline TEXT,
          notes TEXT,
          status TEXT DEFAULT 'lead',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // 创建功能点表
    await new Promise((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS features (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          lead_id INTEGER NOT NULL,
          feature_name TEXT NOT NULL,
          hours_est INTEGER,
          complexity TEXT,
          in_scope BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (lead_id) REFERENCES leads(id)
        )
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // 创建项目表
    await new Promise((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS projects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          lead_id INTEGER,
          name TEXT NOT NULL,
          status TEXT DEFAULT 'active',
          base_price INTEGER DEFAULT 0,
          hourly_rate INTEGER DEFAULT 500,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (lead_id) REFERENCES leads(id)
        )
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // 创建项目任务表
    await new Promise((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS project_tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          status TEXT DEFAULT 'todo',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          completed_at DATETIME,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // 创建工时记录表
    await new Promise((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS timesheets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER NOT NULL,
          task_id INTEGER,
          description TEXT NOT NULL,
          start_time DATETIME NOT NULL,
          end_time DATETIME,
          duration_minutes INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
          FOREIGN KEY (task_id) REFERENCES project_tasks(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // 创建报价表
    await new Promise((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS quotes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          lead_id INTEGER NOT NULL,
          title TEXT NOT NULL,
          base_price INTEGER DEFAULT 0,
          hourly_rate INTEGER DEFAULT 500,
          total_hours INTEGER DEFAULT 0,
          total_price INTEGER DEFAULT 0,
          status TEXT DEFAULT 'draft',
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // 创建报价明细表
    await new Promise((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS quote_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          quote_id INTEGER NOT NULL,
          feature_id INTEGER,
          item_name TEXT NOT NULL,
          item_description TEXT,
          hours INTEGER DEFAULT 0,
          rate_per_hour INTEGER DEFAULT 500,
          total_price INTEGER DEFAULT 0,
          complexity TEXT DEFAULT 'M',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE,
          FOREIGN KEY (feature_id) REFERENCES features(id) ON DELETE CASCADE
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

// IPC处理：获取线索列表
ipcMain.handle('get-leads', async () => {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(app.getPath('userData'), 'app.db');
  const db = new sqlite3.Database(dbPath);

  try {
    const leads = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM leads ORDER BY created_at DESC', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    return { success: true, data: leads };
  } catch (error) {
    return { success: false, message: error.message };
  } finally {
    db.close();
  }
});

// IPC处理：添加线索
ipcMain.handle('add-lead', async (event, leadData) => {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(app.getPath('userData'), 'app.db');
  const db = new sqlite3.Database(dbPath);

  try {
    const result = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO leads (client_name, project_name, budget_min, budget_max, deadline, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          leadData.client_name,
          leadData.project_name || '',
          leadData.budget_min || null,
          leadData.budget_max || null,
          leadData.deadline || '',
          leadData.notes || '',
          leadData.status || 'lead'
        ],
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

// IPC处理：更新线索
ipcMain.handle('update-lead', async (event, leadId, leadData) => {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(app.getPath('userData'), 'app.db');
  const db = new sqlite3.Database(dbPath);

  try {
    const result = await new Promise((resolve, reject) => {
      db.run(
        'UPDATE leads SET client_name = ?, project_name = ?, budget_min = ?, budget_max = ?, deadline = ?, notes = ?, status = ? WHERE id = ?',
        [
          leadData.client_name,
          leadData.project_name || '',
          leadData.budget_min || null,
          leadData.budget_max || null,
          leadData.deadline || '',
          leadData.notes || '',
          leadData.status || 'lead',
          leadId
        ],
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

// IPC处理：删除线索
ipcMain.handle('delete-lead', async (event, leadId) => {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(app.getPath('userData'), 'app.db');
  const db = new sqlite3.Database(dbPath);

  try {
    // 先删除关联的功能点
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM features WHERE lead_id = ?', [leadId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // 再删除线索
    const result = await new Promise((resolve, reject) => {
      db.run('DELETE FROM leads WHERE id = ?', [leadId], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });

    return { success: true, data: result };
  } catch (error) {
    return { success: false, message: error.message };
  } finally {
    db.close();
  }
});

// IPC处理：获取功能点列表
ipcMain.handle('get-features', async (event, leadId) => {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(app.getPath('userData'), 'app.db');
  const db = new sqlite3.Database(dbPath);

  try {
    const features = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM features WHERE lead_id = ? ORDER BY created_at', [leadId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    return { success: true, data: features };
  } catch (error) {
    return { success: false, message: error.message };
  } finally {
    db.close();
  }
});

// IPC处理：添加功能点
ipcMain.handle('add-feature', async (event, featureData) => {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(app.getPath('userData'), 'app.db');
  const db = new sqlite3.Database(dbPath);

  try {
    const result = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO features (lead_id, feature_name, hours_est, complexity, in_scope) VALUES (?, ?, ?, ?, ?)',
        [
          featureData.lead_id,
          featureData.feature_name,
          featureData.hours_est,
          featureData.complexity || 'M',
          featureData.in_scope !== undefined ? featureData.in_scope : 1
        ],
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

// IPC处理：更新功能点
ipcMain.handle('update-feature', async (event, featureId, featureData) => {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(app.getPath('userData'), 'app.db');
  const db = new sqlite3.Database(dbPath);

  try {
    const result = await new Promise((resolve, reject) => {
      db.run(
        'UPDATE features SET feature_name = ?, hours_est = ?, complexity = ?, in_scope = ? WHERE id = ?',
        [
          featureData.feature_name,
          featureData.hours_est,
          featureData.complexity || 'M',
          featureData.in_scope !== undefined ? featureData.in_scope : 1,
          featureId
        ],
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

// IPC处理：删除功能点
ipcMain.handle('delete-feature', async (event, featureId) => {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(app.getPath('userData'), 'app.db');
  const db = new sqlite3.Database(dbPath);

  try {
    const result = await new Promise((resolve, reject) => {
      db.run('DELETE FROM features WHERE id = ?', [featureId], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });

    return { success: true, data: result };
  } catch (error) {
    return { success: false, message: error.message };
  } finally {
    db.close();
  }
});

// ==================== 项目管理 IPC 处理函数 ====================

// IPC处理：获取项目列表
ipcMain.handle('get-projects', async () => {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(app.getPath('userData'), 'app.db');
  const db = new sqlite3.Database(dbPath);

  try {
    const projects = await new Promise((resolve, reject) => {
      db.all(`
        SELECT p.*, l.client_name as client_name, l.project_name as lead_project_name
        FROM projects p
        LEFT JOIN leads l ON p.lead_id = l.id
        ORDER BY p.created_at DESC
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    return { success: true, data: projects };
  } catch (error) {
    return { success: false, message: error.message };
  } finally {
    db.close();
  }
});

// IPC处理：添加项目
ipcMain.handle('add-project', async (event, projectData) => {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(app.getPath('userData'), 'app.db');
  const db = new sqlite3.Database(dbPath);

  try {
    const result = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO projects (lead_id, name, status, base_price, hourly_rate) VALUES (?, ?, ?, ?, ?)',
        [projectData.lead_id, projectData.name, projectData.status || 'active', projectData.base_price || 0, projectData.hourly_rate || 500],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, changes: this.changes });
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

// IPC处理：更新项目
ipcMain.handle('update-project', async (event, projectId, projectData) => {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(app.getPath('userData'), 'app.db');
  const db = new sqlite3.Database(dbPath);

  try {
    const result = await new Promise((resolve, reject) => {
      const fields = [];
      const values = [];

      if (projectData.name !== undefined) {
        fields.push('name = ?');
        values.push(projectData.name);
      }
      if (projectData.status !== undefined) {
        fields.push('status = ?');
        values.push(projectData.status);
      }
      if (projectData.base_price !== undefined) {
        fields.push('base_price = ?');
        values.push(projectData.base_price);
      }
      if (projectData.hourly_rate !== undefined) {
        fields.push('hourly_rate = ?');
        values.push(projectData.hourly_rate);
      }

      if (fields.length === 0) {
        resolve({ changes: 0 });
        return;
      }

      values.push(projectId);

      db.run(
        `UPDATE projects SET ${fields.join(', ')} WHERE id = ?`,
        values,
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

// IPC处理：删除项目
ipcMain.handle('delete-project', async (event, projectId) => {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(app.getPath('userData'), 'app.db');
  const db = new sqlite3.Database(dbPath);

  try {
    // 启用外键约束
    await new Promise((resolve, reject) => {
      db.run('PRAGMA foreign_keys = ON', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    const result = await new Promise((resolve, reject) => {
      db.run('DELETE FROM projects WHERE id = ?', [projectId], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });

    return { success: true, data: result };
  } catch (error) {
    return { success: false, message: error.message };
  } finally {
    db.close();
  }
});

// IPC处理：获取项目任务
ipcMain.handle('get-project-tasks', async (event, projectId) => {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(app.getPath('userData'), 'app.db');
  const db = new sqlite3.Database(dbPath);

  try {
    const tasks = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM project_tasks WHERE project_id = ? ORDER BY created_at DESC', [projectId], (err, rows) => {
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

// IPC处理：添加项目任务
ipcMain.handle('add-project-task', async (event, taskData) => {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(app.getPath('userData'), 'app.db');
  const db = new sqlite3.Database(dbPath);

  try {
    const result = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO project_tasks (project_id, title, description, status) VALUES (?, ?, ?, ?)',
        [taskData.project_id, taskData.title, taskData.description || '', taskData.status || 'todo'],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, changes: this.changes });
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

// IPC处理：更新项目任务
ipcMain.handle('update-project-task', async (event, taskId, taskData) => {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(app.getPath('userData'), 'app.db');
  const db = new sqlite3.Database(dbPath);

  try {
    const result = await new Promise((resolve, reject) => {
      const fields = [];
      const values = [];

      if (taskData.title !== undefined) {
        fields.push('title = ?');
        values.push(taskData.title);
      }
      if (taskData.description !== undefined) {
        fields.push('description = ?');
        values.push(taskData.description);
      }
      if (taskData.status !== undefined) {
        fields.push('status = ?');
        values.push(taskData.status);
        if (taskData.status === 'done') {
          fields.push('completed_at = CURRENT_TIMESTAMP');
        }
      }

      if (fields.length === 0) {
        resolve({ changes: 0 });
        return;
      }

      values.push(taskId);

      db.run(
        `UPDATE project_tasks SET ${fields.join(', ')} WHERE id = ?`,
        values,
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

// IPC处理：删除项目任务
ipcMain.handle('delete-project-task', async (event, taskId) => {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(app.getPath('userData'), 'app.db');
  const db = new sqlite3.Database(dbPath);

  try {
    const result = await new Promise((resolve, reject) => {
      db.run('DELETE FROM project_tasks WHERE id = ?', [taskId], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });

    return { success: true, data: result };
  } catch (error) {
    return { success: false, message: error.message };
  } finally {
    db.close();
  }
});

// IPC处理：获取工时记录
ipcMain.handle('get-timesheets', async (event, projectId) => {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(app.getPath('userData'), 'app.db');
  const db = new sqlite3.Database(dbPath);

  try {
    const timesheets = await new Promise((resolve, reject) => {
      db.all(`
        SELECT t.*, pt.title as task_title
        FROM timesheets t
        LEFT JOIN project_tasks pt ON t.task_id = pt.id
        WHERE t.project_id = ?
        ORDER BY t.start_time DESC
      `, [projectId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    return { success: true, data: timesheets };
  } catch (error) {
    return { success: false, message: error.message };
  } finally {
    db.close();
  }
});

// IPC处理：添加工时记录
ipcMain.handle('add-timesheet', async (event, timesheetData) => {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(app.getPath('userData'), 'app.db');
  const db = new sqlite3.Database(dbPath);

  try {
    const result = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO timesheets (project_id, task_id, description, start_time, end_time, duration_minutes) VALUES (?, ?, ?, ?, ?, ?)',
        [
          timesheetData.project_id,
          timesheetData.task_id,
          timesheetData.description,
          timesheetData.start_time,
          timesheetData.end_time,
          timesheetData.duration_minutes
        ],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, changes: this.changes });
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

// IPC处理：更新工时记录
ipcMain.handle('update-timesheet', async (event, timesheetId, timesheetData) => {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(app.getPath('userData'), 'app.db');
  const db = new sqlite3.Database(dbPath);

  try {
    const result = await new Promise((resolve, reject) => {
      const fields = [];
      const values = [];

      if (timesheetData.description !== undefined) {
        fields.push('description = ?');
        values.push(timesheetData.description);
      }
      if (timesheetData.start_time !== undefined) {
        fields.push('start_time = ?');
        values.push(timesheetData.start_time);
      }
      if (timesheetData.end_time !== undefined) {
        fields.push('end_time = ?');
        values.push(timesheetData.end_time);
      }
      if (timesheetData.duration_minutes !== undefined) {
        fields.push('duration_minutes = ?');
        values.push(timesheetData.duration_minutes);
      }

      if (fields.length === 0) {
        resolve({ changes: 0 });
        return;
      }

      values.push(timesheetId);

      db.run(
        `UPDATE timesheets SET ${fields.join(', ')} WHERE id = ?`,
        values,
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

// IPC处理：删除工时记录
ipcMain.handle('delete-timesheet', async (event, timesheetId) => {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(app.getPath('userData'), 'app.db');
  const db = new sqlite3.Database(dbPath);

  try {
    const result = await new Promise((resolve, reject) => {
      db.run('DELETE FROM timesheets WHERE id = ?', [timesheetId], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });

    return { success: true, data: result };
  } catch (error) {
    return { success: false, message: error.message };
  } finally {
    db.close();
  }
});

// IPC处理：获取报价列表
ipcMain.handle('get-quotes', async (event, leadId = null) => {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(app.getPath('userData'), 'app.db');
  const db = new sqlite3.Database(dbPath);

  try {
    let query;
    let params = [];

    if (leadId) {
      query = `
        SELECT q.*, l.client_name, l.project_name
        FROM quotes q
        LEFT JOIN leads l ON q.lead_id = l.id
        WHERE q.lead_id = ?
        ORDER BY q.created_at DESC
      `;
      params = [leadId];
    } else {
      query = `
        SELECT q.*, l.client_name, l.project_name
        FROM quotes q
        LEFT JOIN leads l ON q.lead_id = l.id
        ORDER BY q.created_at DESC
      `;
    }

    const quotes = await new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    return { success: true, data: quotes };
  } catch (error) {
    return { success: false, message: error.message };
  } finally {
    db.close();
  }
});

// IPC处理：获取报价明细
ipcMain.handle('get-quote-items', async (event, quoteId) => {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(app.getPath('userData'), 'app.db');
  const db = new sqlite3.Database(dbPath);

  try {
    const items = await new Promise((resolve, reject) => {
      db.all(
        'SELECT qi.*, COALESCE(f.feature_name, f.name) as feature_name, ' +
        'COALESCE(f.hours_est, f.hours, 0) as feature_hours_est ' +
        'FROM quote_items qi ' +
        'LEFT JOIN features f ON qi.feature_id = f.id ' +
        'WHERE qi.quote_id = ? ' +
        'ORDER BY qi.created_at ASC',
        [quoteId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    return { success: true, data: items };
  } catch (error) {
    return { success: false, message: error.message };
  } finally {
    db.close();
  }
});

// IPC处理：创建报价
ipcMain.handle('create-quote', async (event, quoteData) => {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(app.getPath('userData'), 'app.db');
  const db = new sqlite3.Database(dbPath);

  try {
    const result = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO quotes (lead_id, title, base_price, hourly_rate, total_hours, total_price, status, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          quoteData.lead_id,
          quoteData.title || `报价-${new Date().toLocaleDateString()}`,
          quoteData.base_price || 0,
          quoteData.hourly_rate || 500,
          quoteData.total_hours || 0,
          quoteData.total_price || 0,
          quoteData.status || 'draft',
          quoteData.notes || ''
        ],
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

// IPC处理：创建报价明细
ipcMain.handle('create-quote-item', async (event, itemData) => {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(app.getPath('userData'), 'app.db');
  const db = new sqlite3.Database(dbPath);

  try {
    const result = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO quote_items (quote_id, feature_id, item_name, item_description, hours, rate_per_hour, total_price, complexity)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          itemData.quote_id,
          itemData.feature_id || null,
          itemData.item_name,
          itemData.item_description || '',
          itemData.hours || 0,
          itemData.rate_per_hour || 500,
          itemData.total_price || 0,
          itemData.complexity || 'M'
        ],
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

// IPC处理：更新报价
ipcMain.handle('update-quote', async (event, quoteId, quoteData) => {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(app.getPath('userData'), 'app.db');
  const db = new sqlite3.Database(dbPath);

  try {
    const fields = [];
    const values = [];

    if (quoteData.title !== undefined) {
      fields.push('title = ?');
      values.push(quoteData.title);
    }
    if (quoteData.base_price !== undefined) {
      fields.push('base_price = ?');
      values.push(quoteData.base_price);
    }
    if (quoteData.hourly_rate !== undefined) {
      fields.push('hourly_rate = ?');
      values.push(quoteData.hourly_rate);
    }
    if (quoteData.total_hours !== undefined) {
      fields.push('total_hours = ?');
      values.push(quoteData.total_hours);
    }
    if (quoteData.total_price !== undefined) {
      fields.push('total_price = ?');
      values.push(quoteData.total_price);
    }
    if (quoteData.status !== undefined) {
      fields.push('status = ?');
      values.push(quoteData.status);
    }
    if (quoteData.notes !== undefined) {
      fields.push('notes = ?');
      values.push(quoteData.notes);
    }

    if (fields.length === 0) {
      resolve({ changes: 0 });
      return;
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(quoteId);

    const result = await new Promise((resolve, reject) => {
      db.run(
        `UPDATE quotes SET ${fields.join(', ')} WHERE id = ?`,
        values,
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

// IPC处理：删除报价
ipcMain.handle('delete-quote', async (event, quoteId) => {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(app.getPath('userData'), 'app.db');
  const db = new sqlite3.Database(dbPath);

  try {
    const result = await new Promise((resolve, reject) => {
      db.run('DELETE FROM quotes WHERE id = ?', [quoteId], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });

    return { success: true, data: result };
  } catch (error) {
    return { success: false, message: error.message };
  } finally {
    db.close();
  }
});

// IPC处理：计算报价
ipcMain.handle('calculate-quote', async (event, leadId, basePrice = 0, hourlyRate = 500) => {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(app.getPath('userData'), 'app.db');
  const db = new sqlite3.Database(dbPath);

  try {
    // 获取功能点列表（兼容不同字段命名），in_scope 不存在时默认统计
    const features = await new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM features WHERE lead_id = ?',
        [leadId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    // 计算复杂度系数
    const complexityFactors = { 'S': 1.0, 'M': 1.5, 'L': 2.2 };

    let totalHours = 0;
    let totalPrice = 0;
    const quoteItems = [];

    features.forEach(f => {
      // in_scope: 若不存在则默认 true
      const inScope = (typeof f.in_scope === 'undefined') ? true : (f.in_scope === 1 || f.in_scope === true);
      if (!inScope) return;

      const hours = (typeof f.hours_est !== 'undefined') ? Number(f.hours_est) : (typeof f.hours !== 'undefined' ? Number(f.hours) : 0);
      const comp = (f.complexity && String(f.complexity).toUpperCase()) || 'M';
      const factor = complexityFactors[comp] || 1.5;
      const itemPrice = hours * hourlyRate * factor;

      totalHours += hours;
      totalPrice += itemPrice;

      quoteItems.push({
        feature_id: f.id,
        item_name: f.feature_name || f.name || '功能项',
        hours: hours,
        rate_per_hour: hourlyRate,
        complexity: comp,
        total_price: Math.round(itemPrice)
      });
    });

    // 计算三档报价
    const finalPrice = basePrice + totalPrice;
    const basicPrice = Math.round(finalPrice * 0.8);
    const standardPrice = Math.round(finalPrice);
    const premiumPrice = Math.round(finalPrice * 1.25);

    return {
      success: true,
      data: {
        base_price: basePrice,
        hourly_rate: hourlyRate,
        total_hours: totalHours,
        total_price: standardPrice,
        quote_items: quoteItems,
        pricing: {
          basic: basicPrice,
          standard: standardPrice,
          premium: premiumPrice
        }
      }
    };
  } catch (error) {
    return { success: false, message: error.message };
  } finally {
    db.close();
  }
});
