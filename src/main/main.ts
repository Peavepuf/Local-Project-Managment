import { app, BrowserWindow, Menu, dialog, ipcMain } from 'electron';
import path from 'node:path';
import {
  createIssue,
  createNote,
  createTodo,
  deleteIssue,
  deleteNote,
  deleteTodo,
  getDashboardStats,
  getProjectDetail,
  getSettings,
  listIssuesByProject,
  listNotesByProject,
  listProjectSummaries,
  listTodosByProject,
  updateIssue,
  updateNote,
  updateSettings,
  updateTodo,
  updateTodoStatus
} from './database';
import { scanWorkspaceRoots, rescanProject } from './scanner';
import { configureWatchers } from './watchers';

const devServerUrl = process.env.VITE_DEV_SERVER_URL;
const rendererEntryPath = path.join(app.getAppPath(), 'dist/renderer/index.html');

const createWindow = async () => {
  const win = new BrowserWindow({
    width: 1600,
    height: 980,
    minWidth: 1200,
    minHeight: 760,
    backgroundColor: '#08111f',
    titleBarStyle: 'hiddenInset',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  win.setMenuBarVisibility(false);

  try {
    if (devServerUrl) {
      await win.loadURL(devServerUrl);
      win.webContents.openDevTools({ mode: 'detach' });
      return;
    }
  } catch {
    // Fall back to built renderer for safer local start behavior.
  }

  await win.loadFile(rendererEntryPath);
};

const registerIpc = () => {
  ipcMain.handle('settings:selectFolder', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0];
  });

  ipcMain.handle('settings:get', () => getSettings());
  ipcMain.handle('settings:update', (_event, payload) => {
    const next = updateSettings(payload);
    configureWatchers();
    return next;
  });

  ipcMain.handle('dashboard:get', () => getDashboardStats());

  ipcMain.handle('projects:list', (_event, filters) => listProjectSummaries(filters));
  ipcMain.handle('projects:getById', (_event, projectId: string) => getProjectDetail(projectId));
  ipcMain.handle('projects:refreshAll', () => {
    scanWorkspaceRoots();
    return listProjectSummaries();
  });
  ipcMain.handle('projects:refreshOne', (_event, projectId: string) => {
    const detail = getProjectDetail(projectId);
    if (!detail) return null;
    rescanProject(detail.project.path, detail.project.workspaceRootId);
    return getProjectDetail(projectId);
  });

  ipcMain.handle('notes:create', (_event, input) => createNote(input));
  ipcMain.handle('notes:update', (_event, input) => updateNote(input));
  ipcMain.handle('notes:delete', (_event, id: string) => deleteNote(id));
  ipcMain.handle('notes:listByProject', (_event, projectId: string) => listNotesByProject(projectId));

  ipcMain.handle('todos:create', (_event, input) => createTodo(input));
  ipcMain.handle('todos:update', (_event, input) => updateTodo(input));
  ipcMain.handle('todos:updateStatus', (_event, id: string, status) => updateTodoStatus(id, status));
  ipcMain.handle('todos:delete', (_event, id: string) => deleteTodo(id));
  ipcMain.handle('todos:listByProject', (_event, projectId: string) => listTodosByProject(projectId));

  ipcMain.handle('issues:create', (_event, input) => createIssue(input));
  ipcMain.handle('issues:update', (_event, input) => updateIssue(input));
  ipcMain.handle('issues:delete', (_event, id: string) => deleteIssue(id));
  ipcMain.handle('issues:listByProject', (_event, projectId: string) => listIssuesByProject(projectId));
};

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  registerIpc();
  const settings = getSettings();
  configureWatchers();

  if (settings.scanOnStartup) {
    scanWorkspaceRoots();
  }

  await createWindow();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) await createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
