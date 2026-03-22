import type { ProjectManagerApi } from './contracts';

declare global {
  interface Window {
    projectManager: ProjectManagerApi;
  }
}

export {};
