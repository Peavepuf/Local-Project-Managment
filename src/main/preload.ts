import { contextBridge, ipcRenderer } from 'electron';
import type { ProjectManagerApi } from '../shared/contracts';

const api: ProjectManagerApi = {
  settings: {
    selectFolder: () => ipcRenderer.invoke('settings:selectFolder'),
    get: () => ipcRenderer.invoke('settings:get'),
    update: (input) => ipcRenderer.invoke('settings:update', input)
  },
  dashboard: {
    get: () => ipcRenderer.invoke('dashboard:get')
  },
  projects: {
    list: (filters) => ipcRenderer.invoke('projects:list', filters),
    getById: (projectId) => ipcRenderer.invoke('projects:getById', projectId),
    refreshAll: () => ipcRenderer.invoke('projects:refreshAll'),
    refreshOne: (projectId) => ipcRenderer.invoke('projects:refreshOne', projectId)
  },
  notes: {
    create: (input) => ipcRenderer.invoke('notes:create', input),
    update: (input) => ipcRenderer.invoke('notes:update', input),
    delete: (id) => ipcRenderer.invoke('notes:delete', id),
    listByProject: (projectId) => ipcRenderer.invoke('notes:listByProject', projectId)
  },
  todos: {
    create: (input) => ipcRenderer.invoke('todos:create', input),
    update: (input) => ipcRenderer.invoke('todos:update', input),
    updateStatus: (id, status) => ipcRenderer.invoke('todos:updateStatus', id, status),
    delete: (id) => ipcRenderer.invoke('todos:delete', id),
    listByProject: (projectId) => ipcRenderer.invoke('todos:listByProject', projectId)
  },
  issues: {
    create: (input) => ipcRenderer.invoke('issues:create', input),
    update: (input) => ipcRenderer.invoke('issues:update', input),
    delete: (id) => ipcRenderer.invoke('issues:delete', id),
    listByProject: (projectId) => ipcRenderer.invoke('issues:listByProject', projectId)
  }
};

contextBridge.exposeInMainWorld('projectManager', api);
