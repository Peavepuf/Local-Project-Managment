export type Locale = 'tr' | 'en';
export type ThemeMode = 'dark' | 'light' | 'system';
export type TodoStatus = 'todo' | 'doing' | 'done';
export type TodoPriority = 'low' | 'medium' | 'high';
export type IssueStatus = 'open' | 'blocked' | 'resolved' | 'closed';
export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface WorkspaceRoot {
  id: string;
  name: string;
  path: string;
  isEnabled: boolean;
  lastScannedAt: string | null;
}

export interface GitSnapshot {
  projectId: string;
  branch: string | null;
  isRepo: boolean;
  isDirty: boolean;
  ahead: number;
  behind: number;
  stagedCount: number;
  unstagedCount: number;
  untrackedCount: number;
  gitAvailable: boolean;
  lastCheckedAt: string | null;
  lastCommitAt: string | null;
}

export interface ProjectSummary {
  id: string;
  workspaceRootId: string;
  name: string;
  path: string;
  stackType: string;
  version: string;
  readmePath: string | null;
  readmePreview: string | null;
  lastSeenAt: string | null;
  git: GitSnapshot;
  counts: {
    notes: number;
    openTodos: number;
    openIssues: number;
  };
}

export interface ProjectNote {
  id: string;
  projectId: string;
  title: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TodoItem {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TodoStatus;
  priority: TodoPriority;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface TodoBoardItem extends TodoItem {
  projectName: string;
  projectPath: string;
  projectStackType: string;
}

export interface IssueRecord {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: IssueStatus;
  severity: IssueSeverity;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export interface AppSettings {
  locale: Locale;
  theme: ThemeMode;
  scanOnStartup: boolean;
  watchMode: boolean;
  scanIntervalMinutes: number;
  workspaceRoots: WorkspaceRoot[];
}

export interface DashboardStats {
  totalProjects: number;
  dirtyProjects: number;
  openTodos: number;
  openIssues: number;
  recentProjects: ProjectSummary[];
  openTaskItems: TodoBoardItem[];
}

export interface ProjectDetail {
  project: ProjectSummary;
  notes: ProjectNote[];
  todos: TodoItem[];
  issues: IssueRecord[];
  readmeContent: string | null;
}

export interface SettingsUpdateInput {
  locale?: Locale;
  theme?: ThemeMode;
  scanOnStartup?: boolean;
  watchMode?: boolean;
  scanIntervalMinutes?: number;
  workspaceRoots?: WorkspaceRoot[];
}

export interface NoteCreateInput {
  projectId: string;
  title: string;
  content: string;
  isPinned?: boolean;
}

export interface NoteUpdateInput {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
}

export interface TodoCreateInput {
  projectId: string;
  title?: string;
  description?: string;
  status?: TodoStatus;
  priority?: TodoPriority;
  dueAt?: string | null;
}

export interface TodoUpdateInput {
  id: string;
  title?: string;
  description?: string;
  status?: TodoStatus;
  priority?: TodoPriority;
  dueAt?: string | null;
}

export interface IssueCreateInput {
  projectId: string;
  title?: string;
  description?: string;
  status?: IssueStatus;
  severity?: IssueSeverity;
}

export interface IssueUpdateInput {
  id: string;
  title?: string;
  description?: string;
  status?: IssueStatus;
  severity?: IssueSeverity;
}

export interface ProjectListFilters {
  query?: string;
  rootId?: string;
  dirtyOnly?: boolean;
}

export interface ProjectManagerApi {
  settings: {
    selectFolder: () => Promise<string | null>;
    get: () => Promise<AppSettings>;
    update: (input: SettingsUpdateInput) => Promise<AppSettings>;
  };
  dashboard: {
    get: () => Promise<DashboardStats>;
  };
  projects: {
    list: (filters?: ProjectListFilters) => Promise<ProjectSummary[]>;
    getById: (projectId: string) => Promise<ProjectDetail | null>;
    refreshAll: () => Promise<ProjectSummary[]>;
    refreshOne: (projectId: string) => Promise<ProjectDetail | null>;
  };
  notes: {
    create: (input: NoteCreateInput) => Promise<ProjectNote>;
    update: (input: NoteUpdateInput) => Promise<ProjectNote>;
    delete: (id: string) => Promise<void>;
    listByProject: (projectId: string) => Promise<ProjectNote[]>;
  };
  todos: {
    create: (input: TodoCreateInput) => Promise<TodoItem>;
    update: (input: TodoUpdateInput) => Promise<TodoItem>;
    updateStatus: (id: string, status: TodoStatus) => Promise<TodoItem>;
    delete: (id: string) => Promise<void>;
    listByProject: (projectId: string) => Promise<TodoItem[]>;
  };
  issues: {
    create: (input: IssueCreateInput) => Promise<IssueRecord>;
    update: (input: IssueUpdateInput) => Promise<IssueRecord>;
    delete: (id: string) => Promise<void>;
    listByProject: (projectId: string) => Promise<IssueRecord[]>;
  };
}
