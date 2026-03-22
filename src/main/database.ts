import Database from 'better-sqlite3';
import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import {
  AppSettings,
  DashboardStats,
  GitSnapshot,
  IssueCreateInput,
  IssueRecord,
  IssueUpdateInput,
  NoteCreateInput,
  NoteUpdateInput,
  ProjectDetail,
  ProjectNote,
  ProjectSummary,
  SettingsUpdateInput,
  TodoBoardItem,
  TodoCreateInput,
  TodoItem,
  TodoStatus,
  TodoUpdateInput,
  WorkspaceRoot
} from '../shared/contracts';
import { createId, nowIso } from './utils';

type BetterDb = any;

let db: BetterDb | null = null;

const defaultSettings = {
  locale: 'en',
  theme: 'dark',
  scanOnStartup: 1,
  watchMode: 0,
  scanIntervalMinutes: 10
};

const ensureDb = (): BetterDb => {
  if (db) return db;

  const dbDir = path.join(app.getPath('userData'), 'data');
  fs.mkdirSync(dbDir, { recursive: true });
  const dbPath = path.join(dbDir, 'local-project-managment.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  migrate(db);
  seedSettings(db);
  return db;
};

const migrate = (database: BetterDb) => {
  database.exec(`
    CREATE TABLE IF NOT EXISTS workspace_roots (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      path TEXT NOT NULL UNIQUE,
      is_enabled INTEGER NOT NULL DEFAULT 1,
      last_scanned_at TEXT
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      workspace_root_id TEXT NOT NULL,
      name TEXT NOT NULL,
      path TEXT NOT NULL UNIQUE,
      stack_type TEXT NOT NULL,
      version TEXT NOT NULL,
      readme_path TEXT,
      readme_preview TEXT,
      last_seen_at TEXT,
      FOREIGN KEY (workspace_root_id) REFERENCES workspace_roots(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS git_snapshots (
      project_id TEXT PRIMARY KEY,
      branch TEXT,
      is_repo INTEGER NOT NULL DEFAULT 0,
      is_dirty INTEGER NOT NULL DEFAULT 0,
      ahead INTEGER NOT NULL DEFAULT 0,
      behind INTEGER NOT NULL DEFAULT 0,
      staged_count INTEGER NOT NULL DEFAULT 0,
      unstaged_count INTEGER NOT NULL DEFAULT 0,
      untracked_count INTEGER NOT NULL DEFAULT 0,
      git_available INTEGER NOT NULL DEFAULT 1,
      last_checked_at TEXT,
      last_commit_at TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS project_notes (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      is_pinned INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS todo_items (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL,
      priority TEXT NOT NULL,
      due_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS issues (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL,
      severity TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      resolved_at TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      locale TEXT NOT NULL,
      theme TEXT NOT NULL,
      scan_on_startup INTEGER NOT NULL DEFAULT 1,
      watch_mode INTEGER NOT NULL DEFAULT 0,
      scan_interval_minutes INTEGER NOT NULL DEFAULT 10
    );
  `);

  const gitSnapshotColumns = (database.prepare('PRAGMA table_info(git_snapshots)').all() as Array<{ name: string }>).map(
    (column) => column.name
  );
  if (!gitSnapshotColumns.includes('last_commit_at')) {
    database.exec('ALTER TABLE git_snapshots ADD COLUMN last_commit_at TEXT;');
  }
};

const seedSettings = (database: BetterDb) => {
  const existing = database.prepare('SELECT id FROM app_settings WHERE id = 1').get();
  if (!existing) {
    database
      .prepare(
        `INSERT INTO app_settings
         (id, locale, theme, scan_on_startup, watch_mode, scan_interval_minutes)
         VALUES (1, @locale, @theme, @scanOnStartup, @watchMode, @scanIntervalMinutes)`
      )
      .run(defaultSettings);
  }
};

const mapRoot = (row: Record<string, unknown>): WorkspaceRoot => ({
  id: String(row.id),
  name: String(row.name),
  path: String(row.path),
  isEnabled: Boolean(row.is_enabled),
  lastScannedAt: row.last_scanned_at ? String(row.last_scanned_at) : null
});

const mapProjectSummary = (row: Record<string, unknown>): ProjectSummary => ({
  id: String(row.id),
  workspaceRootId: String(row.workspace_root_id),
  name: String(row.name),
  path: String(row.path),
  stackType: String(row.stack_type),
  version: String(row.version),
  readmePath: row.readme_path ? String(row.readme_path) : null,
  readmePreview: row.readme_preview ? String(row.readme_preview) : null,
  lastSeenAt: row.last_seen_at ? String(row.last_seen_at) : null,
  git: {
    projectId: String(row.id),
    branch: row.branch ? String(row.branch) : null,
    isRepo: Boolean(row.is_repo),
    isDirty: Boolean(row.is_dirty),
    ahead: Number(row.ahead ?? 0),
    behind: Number(row.behind ?? 0),
    stagedCount: Number(row.staged_count ?? 0),
    unstagedCount: Number(row.unstaged_count ?? 0),
    untrackedCount: Number(row.untracked_count ?? 0),
    gitAvailable: Boolean(row.git_available ?? 1),
    lastCheckedAt: row.last_checked_at ? String(row.last_checked_at) : null,
    lastCommitAt: row.last_commit_at ? String(row.last_commit_at) : null
  },
  counts: {
    notes: Number(row.note_count ?? 0),
    openTodos: Number(row.open_todo_count ?? 0),
    openIssues: Number(row.open_issue_count ?? 0)
  }
});

const mapNote = (row: Record<string, unknown>): ProjectNote => ({
  id: String(row.id),
  projectId: String(row.project_id),
  title: String(row.title),
  content: String(row.content),
  isPinned: Boolean(row.is_pinned),
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at)
});

const mapTodo = (row: Record<string, unknown>): TodoItem => ({
  id: String(row.id),
  projectId: String(row.project_id),
  title: String(row.title),
  description: String(row.description),
  status: row.status as TodoStatus,
  priority: row.priority as TodoItem['priority'],
  dueAt: row.due_at ? String(row.due_at) : null,
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
  completedAt: row.completed_at ? String(row.completed_at) : null
});

const mapTodoBoardItem = (row: Record<string, unknown>): TodoBoardItem => ({
  id: String(row.id),
  projectId: String(row.project_id),
  projectName: String(row.project_name),
  projectPath: String(row.project_path),
  projectStackType: String(row.project_stack_type),
  title: String(row.title),
  description: String(row.description),
  status: row.status as TodoStatus,
  priority: row.priority as TodoItem['priority'],
  dueAt: row.due_at ? String(row.due_at) : null,
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
  completedAt: row.completed_at ? String(row.completed_at) : null
});

const deriveTodoTitle = (title?: string | null, description?: string | null) => {
  const normalizedTitle = (title ?? '').trim();
  if (normalizedTitle) {
    return normalizedTitle;
  }

  const normalizedDescription = (description ?? '').trim();
  if (!normalizedDescription) {
    return 'Untitled task';
  }

  const firstLine = normalizedDescription.split(/\r?\n/)[0].trim();
  return firstLine.slice(0, 80) || 'Untitled task';
};

const deriveIssueTitle = (title?: string | null, description?: string | null) => {
  const normalizedTitle = (title ?? '').trim();
  if (normalizedTitle) {
    return normalizedTitle;
  }

  const normalizedDescription = (description ?? '').trim();
  if (!normalizedDescription) {
    return 'Untitled issue';
  }

  const firstLine = normalizedDescription.split(/\r?\n/)[0].trim();
  return firstLine.slice(0, 80) || 'Untitled issue';
};

const mapIssue = (row: Record<string, unknown>): IssueRecord => ({
  id: String(row.id),
  projectId: String(row.project_id),
  title: String(row.title),
  description: String(row.description),
  status: row.status as IssueRecord['status'],
  severity: row.severity as IssueRecord['severity'],
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
  resolvedAt: row.resolved_at ? String(row.resolved_at) : null
});

export const getSettings = (): AppSettings => {
  const database = ensureDb();
  const settingsRow = database.prepare('SELECT * FROM app_settings WHERE id = 1').get() as Record<string, unknown>;
  const roots = database.prepare('SELECT * FROM workspace_roots ORDER BY name COLLATE NOCASE').all() as Record<string, unknown>[];
  return {
    locale: settingsRow.locale as AppSettings['locale'],
    theme: settingsRow.theme as AppSettings['theme'],
    scanOnStartup: Boolean(settingsRow.scan_on_startup),
    watchMode: Boolean(settingsRow.watch_mode),
    scanIntervalMinutes: Number(settingsRow.scan_interval_minutes),
    workspaceRoots: roots.map(mapRoot)
  };
};

export const updateSettings = (input: SettingsUpdateInput): AppSettings => {
  const database = ensureDb();
  const current = getSettings();
  const next = { ...current, ...input, workspaceRoots: input.workspaceRoots ?? current.workspaceRoots };

  database
    .prepare(
      `UPDATE app_settings
       SET locale = @locale, theme = @theme, scan_on_startup = @scanOnStartup, watch_mode = @watchMode, scan_interval_minutes = @scanIntervalMinutes
       WHERE id = 1`
    )
    .run({
      locale: next.locale,
      theme: next.theme,
      scanOnStartup: next.scanOnStartup ? 1 : 0,
      watchMode: next.watchMode ? 1 : 0,
      scanIntervalMinutes: next.scanIntervalMinutes
    });

  const syncRoots = database.transaction((roots: WorkspaceRoot[]) => {
    const existingIds = new Set(
      (database.prepare('SELECT id FROM workspace_roots').all() as Array<{ id: string }>).map((row) => row.id)
    );
    const incomingIds = new Set(roots.map((root) => root.id));
    const upsert = database.prepare(
      `INSERT INTO workspace_roots (id, name, path, is_enabled, last_scanned_at)
       VALUES (@id, @name, @path, @isEnabled, @lastScannedAt)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         path = excluded.path,
         is_enabled = excluded.is_enabled,
         last_scanned_at = excluded.last_scanned_at`
    );
    const remove = database.prepare('DELETE FROM workspace_roots WHERE id = ?');

    for (const root of roots) {
      upsert.run({
        id: root.id,
        name: root.name,
        path: root.path,
        isEnabled: root.isEnabled ? 1 : 0,
        lastScannedAt: root.lastScannedAt
      });
    }

    for (const existingId of existingIds) {
      if (!incomingIds.has(existingId)) {
        remove.run(existingId);
      }
    }
  });

  if (input.workspaceRoots !== undefined) {
    syncRoots(next.workspaceRoots);
  }

  return getSettings();
};

export const getWorkspaceRoots = (): WorkspaceRoot[] => getSettings().workspaceRoots;

export const listProjectSummaries = (filters?: { query?: string; rootId?: string; dirtyOnly?: boolean }): ProjectSummary[] => {
  const database = ensureDb();
  const clauses = ['1 = 1'];
  const params: Record<string, unknown> = {};

  if (filters?.query) {
    clauses.push('(p.name LIKE @query OR p.path LIKE @query OR p.stack_type LIKE @query)');
    params.query = `%${filters.query}%`;
  }
  if (filters?.rootId) {
    clauses.push('p.workspace_root_id = @rootId');
    params.rootId = filters.rootId;
  }
  if (filters?.dirtyOnly) {
    clauses.push('COALESCE(g.is_dirty, 0) = 1');
  }

  const rows = database
    .prepare(
      `SELECT
        p.*,
        g.branch, g.is_repo, g.is_dirty, g.ahead, g.behind, g.staged_count, g.unstaged_count, g.untracked_count, g.git_available, g.last_checked_at, g.last_commit_at,
        (SELECT COUNT(*) FROM project_notes pn WHERE pn.project_id = p.id) AS note_count,
        (SELECT COUNT(*) FROM todo_items t WHERE t.project_id = p.id AND t.status != 'done') AS open_todo_count,
        (SELECT COUNT(*) FROM issues i WHERE i.project_id = p.id AND i.status NOT IN ('resolved', 'closed')) AS open_issue_count
       FROM projects p
       LEFT JOIN git_snapshots g ON g.project_id = p.id
       WHERE ${clauses.join(' AND ')}
       ORDER BY COALESCE(g.is_dirty, 0) DESC, p.name COLLATE NOCASE`
    )
    .all(params) as Record<string, unknown>[];

  return rows.map(mapProjectSummary);
};

export const getProjectDetail = (projectId: string): ProjectDetail | null => {
  const database = ensureDb();
  const row = database
    .prepare(
      `SELECT
        p.*,
        g.branch, g.is_repo, g.is_dirty, g.ahead, g.behind, g.staged_count, g.unstaged_count, g.untracked_count, g.git_available, g.last_checked_at, g.last_commit_at,
        (SELECT COUNT(*) FROM project_notes pn WHERE pn.project_id = p.id) AS note_count,
        (SELECT COUNT(*) FROM todo_items t WHERE t.project_id = p.id AND t.status != 'done') AS open_todo_count,
        (SELECT COUNT(*) FROM issues i WHERE i.project_id = p.id AND i.status NOT IN ('resolved', 'closed')) AS open_issue_count
       FROM projects p
       LEFT JOIN git_snapshots g ON g.project_id = p.id
       WHERE p.id = ?`
    )
    .get(projectId) as Record<string, unknown> | undefined;
  if (!row) return null;

  const project = mapProjectSummary(row);
  const notes = listNotesByProject(projectId);
  const todos = listTodosByProject(projectId);
  const issues = listIssuesByProject(projectId);
  const readmeContent = project.readmePath && fs.existsSync(project.readmePath)
    ? fs.readFileSync(project.readmePath, 'utf-8')
    : null;

  return { project, notes, todos, issues, readmeContent };
};

export const getDashboardStats = (): DashboardStats => {
  const database = ensureDb();
  const projectCounts = database
    .prepare(
      `SELECT COUNT(*) AS total_projects, SUM(CASE WHEN COALESCE(g.is_dirty, 0) = 1 THEN 1 ELSE 0 END) AS dirty_projects
       FROM projects p LEFT JOIN git_snapshots g ON g.project_id = p.id`
    )
    .get() as Record<string, unknown>;
  const todos = database.prepare("SELECT COUNT(*) AS total FROM todo_items WHERE status != 'done'").get() as Record<string, unknown>;
  const issues = database.prepare("SELECT COUNT(*) AS total FROM issues WHERE status NOT IN ('resolved', 'closed')").get() as Record<string, unknown>;
  const openTaskItems = (database
    .prepare(
      `SELECT
         t.*,
         p.name AS project_name,
         p.path AS project_path,
         p.stack_type AS project_stack_type
       FROM todo_items t
       INNER JOIN projects p ON p.id = t.project_id
       WHERE t.status != 'done'
       ORDER BY
         CASE t.status WHEN 'doing' THEN 0 WHEN 'todo' THEN 1 ELSE 2 END,
         CASE t.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
         t.updated_at DESC
       LIMIT 24`
    )
    .all() as Record<string, unknown>[]).map(mapTodoBoardItem);
  const recentProjects = (database
    .prepare(
      `SELECT
         p.*,
         g.branch, g.is_repo, g.is_dirty, g.ahead, g.behind, g.staged_count, g.unstaged_count, g.untracked_count, g.git_available, g.last_checked_at, g.last_commit_at,
         (SELECT COUNT(*) FROM project_notes pn WHERE pn.project_id = p.id) AS note_count,
         (SELECT COUNT(*) FROM todo_items t WHERE t.project_id = p.id AND t.status != 'done') AS open_todo_count,
         (SELECT COUNT(*) FROM issues i WHERE i.project_id = p.id AND i.status NOT IN ('resolved', 'closed')) AS open_issue_count
       FROM projects p
       LEFT JOIN git_snapshots g ON g.project_id = p.id
       ORDER BY COALESCE(g.last_commit_at, p.last_seen_at) DESC, p.name COLLATE NOCASE
       LIMIT 6`
    )
    .all() as Record<string, unknown>[]).map(mapProjectSummary);

  return {
    totalProjects: Number(projectCounts.total_projects ?? 0),
    dirtyProjects: Number(projectCounts.dirty_projects ?? 0),
    openTodos: Number(todos.total ?? 0),
    openIssues: Number(issues.total ?? 0),
    recentProjects,
    openTaskItems
  };
};

export const upsertDiscoveredProject = (input: {
  rootId: string;
  path: string;
  name: string;
  stackType: string;
  version: string;
  readmePath: string | null;
  readmePreview: string | null;
  git: Omit<GitSnapshot, 'projectId'>;
}): string => {
  const database = ensureDb();
  const existing = database.prepare('SELECT id FROM projects WHERE path = ?').get(input.path) as { id: string } | undefined;
  const projectId = existing?.id ?? createId();
  const lastSeenAt = nowIso();

  database
    .prepare(
      `INSERT INTO projects
       (id, workspace_root_id, name, path, stack_type, version, readme_path, readme_preview, last_seen_at)
       VALUES (@id, @workspaceRootId, @name, @path, @stackType, @version, @readmePath, @readmePreview, @lastSeenAt)
       ON CONFLICT(path) DO UPDATE SET
         workspace_root_id = excluded.workspace_root_id,
         name = excluded.name,
         stack_type = excluded.stack_type,
         version = excluded.version,
         readme_path = excluded.readme_path,
         readme_preview = excluded.readme_preview,
         last_seen_at = excluded.last_seen_at`
    )
    .run({
      id: projectId,
      workspaceRootId: input.rootId,
      name: input.name,
      path: input.path,
      stackType: input.stackType,
      version: input.version,
      readmePath: input.readmePath,
      readmePreview: input.readmePreview,
      lastSeenAt
    });

  database
    .prepare(
       `INSERT INTO git_snapshots
        (project_id, branch, is_repo, is_dirty, ahead, behind, staged_count, unstaged_count, untracked_count, git_available, last_checked_at, last_commit_at)
        VALUES (@projectId, @branch, @isRepo, @isDirty, @ahead, @behind, @stagedCount, @unstagedCount, @untrackedCount, @gitAvailable, @lastCheckedAt, @lastCommitAt)
       ON CONFLICT(project_id) DO UPDATE SET
         branch = excluded.branch,
         is_repo = excluded.is_repo,
         is_dirty = excluded.is_dirty,
         ahead = excluded.ahead,
         behind = excluded.behind,
         staged_count = excluded.staged_count,
         unstaged_count = excluded.unstaged_count,
         untracked_count = excluded.untracked_count,
         git_available = excluded.git_available,
         last_checked_at = excluded.last_checked_at,
         last_commit_at = excluded.last_commit_at`
     )
     .run({
      projectId,
      branch: input.git.branch,
      isRepo: input.git.isRepo ? 1 : 0,
      isDirty: input.git.isDirty ? 1 : 0,
      ahead: input.git.ahead,
      behind: input.git.behind,
      stagedCount: input.git.stagedCount,
      unstagedCount: input.git.unstagedCount,
      untrackedCount: input.git.untrackedCount,
      gitAvailable: input.git.gitAvailable ? 1 : 0,
      lastCheckedAt: input.git.lastCheckedAt,
      lastCommitAt: input.git.lastCommitAt
    });

  return projectId;
};

export const markWorkspaceScanned = (rootId: string) => {
  ensureDb().prepare('UPDATE workspace_roots SET last_scanned_at = ? WHERE id = ?').run(nowIso(), rootId);
};

export const pruneProjectsForRoot = (rootId: string, keepPaths: string[]) => {
  const database = ensureDb();

  if (keepPaths.length === 0) {
    database.prepare('DELETE FROM projects WHERE workspace_root_id = ?').run(rootId);
    return;
  }

  const placeholders = keepPaths.map(() => '?').join(', ');
  database
    .prepare(`DELETE FROM projects WHERE workspace_root_id = ? AND path NOT IN (${placeholders})`)
    .run(rootId, ...keepPaths);
};

export const listNotesByProject = (projectId: string): ProjectNote[] =>
  (ensureDb().prepare('SELECT * FROM project_notes WHERE project_id = ? ORDER BY is_pinned DESC, updated_at DESC').all(projectId) as Record<string, unknown>[]).map(mapNote);

export const createNote = (input: NoteCreateInput): ProjectNote => {
  const id = createId();
  const now = nowIso();
  ensureDb().prepare(
    `INSERT INTO project_notes (id, project_id, title, content, is_pinned, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, input.projectId, input.title, input.content, input.isPinned ? 1 : 0, now, now);
  return listNotesByProject(input.projectId).find((item) => item.id === id)!;
};

export const updateNote = (input: NoteUpdateInput): ProjectNote => {
  ensureDb().prepare(
    `UPDATE project_notes SET title = ?, content = ?, is_pinned = ?, updated_at = ? WHERE id = ?`
  ).run(input.title, input.content, input.isPinned ? 1 : 0, nowIso(), input.id);
  return mapNote(ensureDb().prepare('SELECT * FROM project_notes WHERE id = ?').get(input.id) as Record<string, unknown>);
};

export const deleteNote = (id: string) => {
  ensureDb().prepare('DELETE FROM project_notes WHERE id = ?').run(id);
};

export const listTodosByProject = (projectId: string): TodoItem[] =>
  (ensureDb().prepare(
    `SELECT * FROM todo_items
     WHERE project_id = ?
     ORDER BY CASE status WHEN 'doing' THEN 0 WHEN 'todo' THEN 1 ELSE 2 END, updated_at DESC`
  ).all(projectId) as Record<string, unknown>[]).map(mapTodo);

export const createTodo = (input: TodoCreateInput): TodoItem => {
  const id = createId();
  const now = nowIso();
  const status = input.status ?? 'todo';
  const description = input.description ?? '';
  const title = deriveTodoTitle(input.title, description);
  ensureDb().prepare(
    `INSERT INTO todo_items (id, project_id, title, description, status, priority, due_at, created_at, updated_at, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.projectId,
    title,
    description,
    status,
    input.priority ?? 'medium',
    input.dueAt ?? null,
    now,
    now,
    status === 'done' ? now : null
  );
  return listTodosByProject(input.projectId).find((item) => item.id === id)!;
};

export const updateTodo = (input: TodoUpdateInput): TodoItem => {
  const current = ensureDb().prepare('SELECT * FROM todo_items WHERE id = ?').get(input.id) as Record<string, unknown>;
  const nextStatus = (input.status ?? current.status) as TodoStatus;
  const completedAt = nextStatus === 'done' ? nowIso() : null;
  const nextDescription = input.description ?? String(current.description);
  const nextTitle = deriveTodoTitle(input.title ?? String(current.title), nextDescription);
  ensureDb().prepare(
    `UPDATE todo_items
     SET title = ?, description = ?, status = ?, priority = ?, due_at = ?, updated_at = ?, completed_at = ?
     WHERE id = ?`
  ).run(
    nextTitle,
    nextDescription,
    nextStatus,
    input.priority ?? current.priority,
    input.dueAt === undefined ? current.due_at : input.dueAt,
    nowIso(),
    completedAt,
    input.id
  );
  return mapTodo(ensureDb().prepare('SELECT * FROM todo_items WHERE id = ?').get(input.id) as Record<string, unknown>);
};

export const updateTodoStatus = (id: string, status: TodoStatus): TodoItem => updateTodo({ id, status });

export const deleteTodo = (id: string) => {
  ensureDb().prepare('DELETE FROM todo_items WHERE id = ?').run(id);
};

export const listIssuesByProject = (projectId: string): IssueRecord[] =>
  (ensureDb().prepare(
    `SELECT * FROM issues
     WHERE project_id = ?
     ORDER BY CASE status WHEN 'blocked' THEN 0 WHEN 'open' THEN 1 WHEN 'resolved' THEN 2 ELSE 3 END, updated_at DESC`
  ).all(projectId) as Record<string, unknown>[]).map(mapIssue);

export const createIssue = (input: IssueCreateInput): IssueRecord => {
  const id = createId();
  const now = nowIso();
  const status = input.status ?? 'open';
  const description = input.description ?? '';
  const title = deriveIssueTitle(input.title, description);
  ensureDb().prepare(
    `INSERT INTO issues (id, project_id, title, description, status, severity, created_at, updated_at, resolved_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.projectId,
    title,
    description,
    status,
    input.severity ?? 'medium',
    now,
    now,
    status === 'resolved' || status === 'closed' ? now : null
  );
  return listIssuesByProject(input.projectId).find((item) => item.id === id)!;
};

export const updateIssue = (input: IssueUpdateInput): IssueRecord => {
  const current = ensureDb().prepare('SELECT * FROM issues WHERE id = ?').get(input.id) as Record<string, unknown>;
  const status = (input.status ?? current.status) as IssueRecord['status'];
  const nextDescription = input.description ?? String(current.description);
  const nextTitle = deriveIssueTitle(input.title ?? String(current.title), nextDescription);
  ensureDb().prepare(
    `UPDATE issues
     SET title = ?, description = ?, status = ?, severity = ?, updated_at = ?, resolved_at = ?
     WHERE id = ?`
  ).run(
    nextTitle,
    nextDescription,
    status,
    input.severity ?? current.severity,
    nowIso(),
    status === 'resolved' || status === 'closed' ? nowIso() : null,
    input.id
  );
  return mapIssue(ensureDb().prepare('SELECT * FROM issues WHERE id = ?').get(input.id) as Record<string, unknown>);
};

export const deleteIssue = (id: string) => {
  ensureDb().prepare('DELETE FROM issues WHERE id = ?').run(id);
};
