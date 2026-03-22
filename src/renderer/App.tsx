import { useEffect, useMemo, useState } from 'react';
import type {
  AppSettings,
  DashboardStats,
  IssueCreateInput,
  IssueRecord,
  IssueStatus,
  Locale,
  ProjectDetail,
  ProjectSummary,
  ThemeMode,
  TodoBoardItem,
  TodoCreateInput,
  TodoItem,
  TodoStatus,
  WorkspaceRoot
} from '../shared/contracts';

type ViewMode = 'dashboard' | 'settings' | 'project';
type DetailTab = 'overview' | 'readme' | 'notes' | 'todos' | 'issues';
type DashboardFilter = 'all' | 'dirty' | 'todos' | 'issues';

const translations: Record<Locale, Record<string, string>> = {
  en: {
    appTitle: 'Fabri-Lab Project Management Software',
    dashboard: 'Dashboard',
    settings: 'Settings',
    projects: 'Projects',
    refreshAll: 'Refresh all',
    commandPalette: 'Command palette',
    workspaceRoots: 'Workspace roots',
    addFolder: 'Add folder',
    scanOnStartup: 'Scan on startup',
    watchMode: 'Watch mode',
    scanInterval: 'Scan interval (min)',
    theme: 'Theme',
    language: 'Language',
    totalProjects: 'Total projects',
    dirtyProjects: 'Repos with changes',
    openTodos: 'Pending tasks',
    openIssues: 'Active problems',
    recentProjects: 'Recent projects',
    noProjects: 'No projects discovered yet.',
    pickProject: 'Pick a project to inspect its details.',
    overview: 'Overview',
    readme: 'README',
    notes: 'Notes',
    todos: 'Tasks',
    issues: 'Problems',
    taskBoard: 'Task board',
    backlog: 'Backlog',
    inProgress: 'In progress',
    projectPath: 'Project path',
    stack: 'Stack',
    version: 'Version',
    branch: 'Branch',
    gitStatus: 'Git status',
    clean: 'No changes',
    dirty: 'Changed',
    addNote: 'Add note',
    addTodo: 'Add task',
    addIssue: 'Add problem',
    title: 'Title',
    content: 'Content',
    description: 'Description',
    priority: 'Priority',
    create: 'Create',
    delete: 'Delete',
    moveToTodo: 'Move to backlog',
    moveToDoing: 'Start',
    complete: 'Done',
    done: 'Done',
    todo: 'Backlog',
    doing: 'In progress',
    blocked: 'Blocked',
    resolved: 'Resolved',
    closed: 'Closed',
    open: 'Open',
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    critical: 'Critical',
    pin: 'Pin',
    pinned: 'Pinned',
    searchPlaceholder: 'Search name, path, stack\u2026',
    noReadme: 'README not found.',
    quickActions: 'Quick actions',
    refreshProject: 'Refresh project',
    filterDirtyOnly: 'Only changed repos',
    allRoots: 'All roots',
    commandHint: 'Press Ctrl/Cmd + K',
    keyboardShortcuts: 'Keyboard shortcuts',
    close: 'Close',
    system: 'System',
    dark: 'Dark',
    light: 'Light',
    saveSettings: 'Settings are saved instantly.',
    lastSeen: 'Last scan',
    aheadBehind: 'Ahead / Behind',
    staged: 'Staged',
    unstaged: 'Unstaged',
    untracked: 'Untracked',
    noNotes: 'No notes yet.',
    noTodos: 'No pending tasks.',
    noIssues: 'No problems yet.',
    noOpenTasks: 'No open tasks.',
    addFirstRoot: 'Add at least one workspace root from Settings to start scanning.',
    projectHealth: 'Overview',
    issueArchive: 'Resolved / Closed',
    noResults: 'No matching projects.',
    remove: 'Remove',
    enabled: 'Enabled',
    disabled: 'Disabled',
    loadingShell: 'Loading workspace shell\u2026'
  },
  tr: {
    appTitle: 'Fabri-Lab Proje Y\u00f6netim Yaz\u0131l\u0131m\u0131',
    dashboard: 'Panel',
    settings: 'Ayarlar',
    projects: 'Projeler',
    refreshAll: 'T\u00fcm\u00fcn\u00fc yenile',
    commandPalette: 'Komut paleti',
    workspaceRoots: '\u00c7al\u0131\u015fma klas\u00f6rleri',
    addFolder: 'Klas\u00f6r ekle',
    scanOnStartup: 'A\u00e7\u0131l\u0131\u015fta tara',
    watchMode: '\u0130zleme modu',
    scanInterval: 'Tarama aral\u0131\u011f\u0131 (dk)',
    theme: 'Tema',
    language: 'Dil',
    totalProjects: 'Toplam proje',
    dirtyProjects: 'De\u011fi\u015fiklik olan projeler',
    openTodos: 'Bekleyen g\u00f6revler',
    openIssues: 'Aktif sorunlar',
    recentProjects: 'Son projeler',
    noProjects: 'Hen\u00fcz proje bulunamad\u0131.',
    pickProject: 'Detaylar\u0131n\u0131 g\u00f6rmek i\u00e7in bir proje se\u00e7.',
    overview: 'Genel bak\u0131\u015f',
    readme: 'README',
    notes: 'Notlar',
    todos: 'G\u00f6revler',
    issues: 'Sorunlar',
    taskBoard: 'G\u00f6rev panosu',
    backlog: 'S\u0131radaki',
    inProgress: 'Devam eden',
    projectPath: 'Proje yolu',
    stack: 'Teknoloji',
    version: 'S\u00fcr\u00fcm',
    branch: 'Dal',
    gitStatus: 'Git durumu',
    clean: 'De\u011fi\u015fiklik yok',
    dirty: 'De\u011fi\u015fiklik var',
    addNote: 'Not ekle',
    addTodo: 'G\u00f6rev ekle',
    addIssue: 'Sorun ekle',
    title: 'Ba\u015fl\u0131k',
    content: '\u0130\u00e7erik',
    description: 'A\u00e7\u0131klama',
    priority: '\u00d6ncelik',
    create: 'Olu\u015ftur',
    delete: 'Sil',
    moveToTodo: 'S\u0131raya al',
    moveToDoing: 'Ba\u015flat',
    complete: 'Tamamland\u0131',
    done: 'Tamamland\u0131',
    todo: 'S\u0131rada',
    doing: 'Devam ediyor',
    blocked: 'Engelde',
    resolved: '\u00c7\u00f6z\u00fcld\u00fc',
    closed: 'Kapat\u0131ld\u0131',
    open: 'A\u00e7\u0131k',
    low: 'D\u00fc\u015f\u00fck',
    medium: 'Orta',
    high: 'Y\u00fcksek',
    critical: 'Kritik',
    pin: 'Sabitle',
    pinned: 'Sabit',
    searchPlaceholder: '\u0130sim, yol, teknoloji ara\u2026',
    noReadme: 'README bulunamad\u0131.',
    quickActions: 'H\u0131zl\u0131 i\u015flemler',
    refreshProject: 'Projeyi yenile',
    filterDirtyOnly: 'Sadece de\u011fi\u015fiklik olanlar',
    allRoots: 'T\u00fcm k\u00f6kler',
    commandHint: 'Ctrl/Cmd + K',
    keyboardShortcuts: 'Klavye kısayolları',
    close: 'Kapat',
    system: 'Sistem',
    dark: 'Koyu',
    light: 'A\u00e7\u0131k',
    saveSettings: 'Ayarlar an\u0131nda kaydedilir.',
    lastSeen: 'Son tarama',
    aheadBehind: '\u0130leri / Geri',
    staged: 'Haz\u0131r',
    unstaged: 'Haz\u0131r de\u011fil',
    untracked: 'Takipsiz',
    noNotes: 'Hen\u00fcz not yok.',
    noTodos: 'Bekleyen g\u00f6rev yok.',
    noIssues: 'Hen\u00fcz sorun yok.',
    noOpenTasks: 'A\u00e7\u0131k g\u00f6rev yok.',
    addFirstRoot: 'Taramaya ba\u015flamak i\u00e7in Ayarlar b\u00f6l\u00fcm\u00fcnden en az bir k\u00f6k klas\u00f6r ekle.',
    projectHealth: 'Genel durum',
    issueArchive: '\u00c7\u00f6z\u00fclen / kapanan',
    noResults: 'E\u015fle\u015fen proje yok.',
    remove: 'Kald\u0131r',
    enabled: 'A\u00e7\u0131k',
    disabled: 'Kapal\u0131',
    loadingShell: '\u00c7al\u0131\u015fma alan\u0131 haz\u0131rlan\u0131yor\u2026'
  }
};

const tFactory = (locale: Locale) => (key: string) => translations[locale][key] ?? key;
const EMPTY_VALUE = '\u2014';
const defaultLocale: Locale = navigator.language.toLowerCase().startsWith('tr') ? 'tr' : 'en';
const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleString() : EMPTY_VALUE);


const rootNameFromPath = (folderPath: string) => folderPath.split(/[/\\]/).filter(Boolean).pop() ?? folderPath;
const translateStackType = (stackType: string, locale: Locale) => {
  if (locale !== 'tr') return stackType;

  switch (stackType) {
    case 'Generic':
      return 'Genel';
    case 'Node.js':
      return 'Node.js';
    case 'Python':
      return 'Python';
    case 'Rust':
      return 'Rust';
    case '.NET':
      return '.NET';
    default:
      return stackType;
  }
};

const App = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [dashboard, setDashboard] = useState<DashboardStats | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [view, setView] = useState<ViewMode>('dashboard');
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [rootFilter, setRootFilter] = useState('');
  const [dirtyOnly, setDirtyOnly] = useState(false);
  const [dashboardFilter, setDashboardFilter] = useState<DashboardFilter>('all');
  const [loading, setLoading] = useState(true);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [todoDescription, setTodoDescription] = useState('');
  const [todoPriority, setTodoPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [issueDescription, setIssueDescription] = useState('');
  const [issueSeverity, setIssueSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');

  const locale = settings?.locale ?? 'en';
  const theme = settings?.theme ?? 'dark';
  const t = useMemo(() => tFactory(locale), [locale]);

  const refreshShellData = async (keepSelection = true) => {
    const [nextSettings, nextDashboard, nextProjects] = await Promise.all([
      window.projectManager.settings.get(),
      window.projectManager.dashboard.get(),
      window.projectManager.projects.list({
        query: searchQuery || undefined,
        rootId: rootFilter || undefined,
        dirtyOnly
      })
    ]);

    setSettings(nextSettings);
    setDashboard(nextDashboard);
    setProjects(nextProjects);

    if (!keepSelection && nextProjects.length > 0) {
      setSelectedProjectId(nextProjects[0].id);
    }
  };

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      await refreshShellData(false);
      setLoading(false);
    };
    void run();
  }, []);

  useEffect(() => {
    if (!settings) return;
    document.documentElement.dataset.theme =
      theme === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : theme;
    document.documentElement.lang = locale;
    document.title = t('appTitle');
  }, [settings, theme, locale]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((current) => !current);
      }
      if (event.key === 'Escape') {
        setPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    const run = async () => {
      if (!loading) {
        await refreshShellData(true);
      }
    };
    void run();
  }, [searchQuery, rootFilter, dirtyOnly]);

  useEffect(() => {
    const run = async () => {
      if (!selectedProjectId) {
        setDetail(null);
        return;
      }
      setDetail(await window.projectManager.projects.getById(selectedProjectId));
    };
    void run();
  }, [selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  const openProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setView('project');
  };

  const openProjectTodos = (projectId: string) => {
    setSelectedProjectId(projectId);
    setDetailTab('todos');
    setView('project');
  };

  const updateSettingsState = async (patch: Partial<AppSettings>) => {
    const next = await window.projectManager.settings.update({
      ...(patch.locale !== undefined ? { locale: patch.locale } : {}),
      ...(patch.theme !== undefined ? { theme: patch.theme } : {}),
      ...(patch.scanOnStartup !== undefined ? { scanOnStartup: patch.scanOnStartup } : {}),
      ...(patch.watchMode !== undefined ? { watchMode: patch.watchMode } : {}),
      ...(patch.scanIntervalMinutes !== undefined ? { scanIntervalMinutes: patch.scanIntervalMinutes } : {}),
      ...(patch.workspaceRoots !== undefined ? { workspaceRoots: patch.workspaceRoots } : {})
    });
    setSettings(next);
    setDashboard(await window.projectManager.dashboard.get());
  };

  const addWorkspaceRoot = async () => {
    if (!settings) return;
    const folder = await window.projectManager.settings.selectFolder();
    if (!folder || settings.workspaceRoots.some((root) => root.path === folder)) return;

    await updateSettingsState({
      workspaceRoots: [
        ...settings.workspaceRoots,
        {
          id: crypto.randomUUID(),
          name: rootNameFromPath(folder),
          path: folder,
          isEnabled: true,
          lastScannedAt: null
        }
      ]
    });
    await handleRefreshAll();
  };

  const removeWorkspaceRoot = async (rootId: string) => {
    if (!settings) return;
    await updateSettingsState({
      workspaceRoots: settings.workspaceRoots.filter((root) => root.id !== rootId)
    });
    await refreshShellData(true);
  };

  const toggleWorkspaceRoot = async (rootId: string) => {
    if (!settings) return;
    await updateSettingsState({
      workspaceRoots: settings.workspaceRoots.map((root) =>
        root.id === rootId ? { ...root, isEnabled: !root.isEnabled } : root
      )
    });
  };

  const handleRefreshAll = async () => {
    const nextProjects = await window.projectManager.projects.refreshAll();
    setProjects(nextProjects);
    setDashboard(await window.projectManager.dashboard.get());
    if (selectedProjectId) {
      setDetail(await window.projectManager.projects.getById(selectedProjectId));
    }
  };

  const handleRefreshProject = async () => {
    if (!selectedProjectId) return;
    setDetail(await window.projectManager.projects.refreshOne(selectedProjectId));
    setProjects(
      await window.projectManager.projects.list({
        query: searchQuery || undefined,
        rootId: rootFilter || undefined,
        dirtyOnly
      })
    );
    setDashboard(await window.projectManager.dashboard.get());
  };

  const createNote = async () => {
    if (!detail || !noteTitle.trim()) return;
    await window.projectManager.notes.create({
      projectId: detail.project.id,
      title: noteTitle.trim(),
      content: noteContent.trim()
    });
    setNoteTitle('');
    setNoteContent('');
    setDetail(await window.projectManager.projects.getById(detail.project.id));
  };

  const createTodo = async () => {
    if (!detail || !todoDescription.trim()) return;
    const payload: TodoCreateInput = {
      projectId: detail.project.id,
      description: todoDescription.trim(),
      priority: todoPriority
    };
    await window.projectManager.todos.create(payload);
    setTodoDescription('');
    setTodoPriority('medium');
    setDetail(await window.projectManager.projects.getById(detail.project.id));
    setDashboard(await window.projectManager.dashboard.get());
  };

  const createIssue = async () => {
    if (!detail || !issueDescription.trim()) return;
    const payload: IssueCreateInput = {
      projectId: detail.project.id,
      description: issueDescription.trim(),
      severity: issueSeverity
    };
    await window.projectManager.issues.create(payload);
    setIssueDescription('');
    setIssueSeverity('medium');
    setDetail(await window.projectManager.projects.getById(detail.project.id));
    setDashboard(await window.projectManager.dashboard.get());
  };

  const updateNotePinned = async (noteId: string) => {
    if (!detail) return;
    const note = detail.notes.find((item) => item.id === noteId);
    if (!note) return;
    await window.projectManager.notes.update({
      id: note.id,
      title: note.title,
      content: note.content,
      isPinned: !note.isPinned
    });
    setDetail(await window.projectManager.projects.getById(detail.project.id));
  };

  const removeNote = async (noteId: string) => {
    if (!detail) return;
    await window.projectManager.notes.delete(noteId);
    setDetail(await window.projectManager.projects.getById(detail.project.id));
  };

  const updateTodoStatus = async (todoId: string, status: TodoStatus) => {
    if (!detail) return;
    await window.projectManager.todos.updateStatus(todoId, status);
    setDetail(await window.projectManager.projects.getById(detail.project.id));
    setDashboard(await window.projectManager.dashboard.get());
  };

  const removeTodo = async (todoId: string) => {
    if (!detail) return;
    await window.projectManager.todos.delete(todoId);
    setDetail(await window.projectManager.projects.getById(detail.project.id));
    setDashboard(await window.projectManager.dashboard.get());
  };

  const updateIssueStatus = async (issueId: string, status: IssueStatus) => {
    if (!detail) return;
    const issue = detail.issues.find((item) => item.id === issueId);
    if (!issue) return;
    await window.projectManager.issues.update({
      id: issue.id,
      title: issue.title,
      description: issue.description,
      severity: issue.severity,
      status
    });
    setDetail(await window.projectManager.projects.getById(detail.project.id));
    setDashboard(await window.projectManager.dashboard.get());
  };

  const removeIssue = async (issueId: string) => {
    if (!detail) return;
    await window.projectManager.issues.delete(issueId);
    setDetail(await window.projectManager.projects.getById(detail.project.id));
    setDashboard(await window.projectManager.dashboard.get());
  };

  const filteredPaletteProjects = projects.filter((project) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return project.name.toLowerCase().includes(q) || project.path.toLowerCase().includes(q);
  });

  const visibleProjects = projects.filter((project) => {
    switch (dashboardFilter) {
      case 'dirty':
        return project.git.isDirty;
      case 'todos':
        return project.counts.openTodos > 0;
      case 'issues':
        return project.counts.openIssues > 0;
      default:
        return true;
    }
  });

  const activeProject = detail?.project ?? null;

  if (loading || !settings || !dashboard) {
    return <div className="app-loading">{translations[defaultLocale].loadingShell}</div>;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="header-copy">
            <p className="eyebrow">{t('projects')}</p>
            <h1>{t('appTitle')}</h1>
          </div>
        </div>

        <div className="sidebar-actions">
          <button className={view === 'dashboard' ? 'nav-button active' : 'nav-button'} onClick={() => setView('dashboard')}>
            {t('dashboard')}
          </button>
          <button className={view === 'settings' ? 'nav-button active' : 'nav-button'} onClick={() => setView('settings')}>
            {t('settings')}
          </button>
        </div>

        <div className="filters">
          <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder={t('searchPlaceholder')} />
          <select value={rootFilter} onChange={(event) => setRootFilter(event.target.value)}>
            <option value="">{t('allRoots')}</option>
            {settings.workspaceRoots.map((root) => (
              <option key={root.id} value={root.id}>
                {root.name}
              </option>
            ))}
          </select>
          <label className="checkbox-row">
            <input type="checkbox" checked={dirtyOnly} onChange={(event) => setDirtyOnly(event.target.checked)} />
            <span>{t('filterDirtyOnly')}</span>
          </label>
        </div>

        <div className="project-list">
          {visibleProjects.length === 0 ? (
            <div className="empty-state compact">{settings.workspaceRoots.length === 0 ? t('addFirstRoot') : t('noResults')}</div>
          ) : (
            visibleProjects.map((project) => (
              <button
                key={project.id}
                className={selectedProjectId === project.id && view === 'project' ? 'project-card active' : 'project-card'}
                onClick={() => openProject(project.id)}
              >
                <div className="project-card-top">
                  <strong className="project-title">{project.name}</strong>
                </div>
                <div className="project-card-status">
                  <span className={project.git.isDirty ? 'badge danger' : 'badge success'}>
                    {project.git.isDirty ? t('dirty') : t('clean')}
                  </span>
                </div>
                <p className="stack-line">{translateStackType(project.stackType, locale)}</p>
                <div className="project-card-meta">
                  <span>v{project.version}</span>
                  <span>{project.counts.openTodos} T</span>
                  <span>{project.counts.openIssues} I</span>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      <main className="content">
        {view === 'dashboard' && (
          <section className="page">
            <div className="page-header">
              <div className="header-copy">
                <p className="eyebrow">{t('dashboard')}</p>
                <h2>{t('projectHealth')}</h2>
              </div>
            </div>

            <div className="stats-grid">
              <StatCard label={t('totalProjects')} value={dashboard.totalProjects} active={dashboardFilter === 'all'} onClick={() => setDashboardFilter('all')} />
              <StatCard label={t('dirtyProjects')} value={dashboard.dirtyProjects} accent="danger" active={dashboardFilter === 'dirty'} onClick={() => setDashboardFilter('dirty')} />
              <StatCard label={t('openTodos')} value={dashboard.openTodos} active={dashboardFilter === 'todos'} onClick={() => setDashboardFilter('todos')} />
              <StatCard label={t('openIssues')} value={dashboard.openIssues} accent="warning" active={dashboardFilter === 'issues'} onClick={() => setDashboardFilter('issues')} />
            </div>

            <section className="panel">
              <div className="panel-header">
                <h3>{t('recentProjects')}</h3>
              </div>
              <div className="recent-grid">
                {dashboard.recentProjects.length === 0 ? (
                  <div className="empty-state">{t('noProjects')}</div>
                ) : (
                  dashboard.recentProjects.map((project) => (
                    <button key={project.id} className="recent-card" onClick={() => openProject(project.id)}>
                      <div className="recent-card-top">
                        <strong>{project.name}</strong>
                        <span className="mono">{project.git.branch ?? EMPTY_VALUE}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </section>

            <section className="panel">
              <div className="panel-header">
                <h3>{t('taskBoard')}</h3>
                <span className="subtle">{dashboard.openTaskItems.length}</span>
              </div>
              <div className="task-feed">
                {dashboard.openTaskItems.length === 0 ? (
                  <div className="empty-state">{t('noOpenTasks')}</div>
                ) : (
                  dashboard.openTaskItems.map((task) => (
                    <DashboardTaskCard
                      key={task.id}
                      task={task}
                      t={t}
                      locale={locale}
                      onOpen={() => openProjectTodos(task.projectId)}
                    />
                  ))
                )}
              </div>
            </section>
          </section>
        )}

        {view === 'settings' && (
          <section className="page">
            <div className="page-header">
              <div className="header-copy">
                <p className="eyebrow">{t('settings')}</p>
                <h2>{t('workspaceRoots')}</h2>
              </div>
              <button className="primary-button" onClick={() => void addWorkspaceRoot()}>
                {t('addFolder')}
              </button>
            </div>

            <div className="settings-grid">
              <section className="panel">
                <div className="panel-header">
                  <h3>{t('workspaceRoots')}</h3>
                  <span className="subtle">{settings.workspaceRoots.length}</span>
                </div>
                <div className="stack-list">
                  {settings.workspaceRoots.map((root) => (
                    <div className="list-row" key={root.id}>
                      <div className="row-copy">
                        <strong>{root.name}</strong>
                        <p className="path-text">{root.path}</p>
                        <small>
                          {t('lastSeen')}: {formatDate(root.lastScannedAt)}
                        </small>
                      </div>
                      <div className="row-actions inline-actions">
                        <button className="ghost-button" onClick={() => void toggleWorkspaceRoot(root.id)}>
                          {root.isEnabled ? t('enabled') : t('disabled')}
                        </button>
                        <button className="ghost-button danger-text" onClick={() => void removeWorkspaceRoot(root.id)}>
                          {t('remove')}
                        </button>
                      </div>
                    </div>
                  ))}
                  {settings.workspaceRoots.length === 0 && <div className="empty-state">{t('addFirstRoot')}</div>}
                </div>
              </section>

              <section className="panel">
                <div className="panel-header">
                  <h3>{t('settings')}</h3>
                </div>
                <div className="form-grid">
                  <label>
                    <span>{t('language')}</span>
                    <select value={settings.locale} onChange={(event) => void updateSettingsState({ locale: event.target.value as Locale })}>
                      <option value="en">English</option>
                      <option value="tr">{'T\u00fcrk\u00e7e'}</option>
                    </select>
                  </label>
                  <label>
                    <span>{t('theme')}</span>
                    <select value={settings.theme} onChange={(event) => void updateSettingsState({ theme: event.target.value as ThemeMode })}>
                      <option value="dark">{t('dark')}</option>
                      <option value="light">{t('light')}</option>
                      <option value="system">{t('system')}</option>
                    </select>
                  </label>
                  <label className="checkbox-row">
                    <input type="checkbox" checked={settings.scanOnStartup} onChange={(event) => void updateSettingsState({ scanOnStartup: event.target.checked })} />
                    <span>{t('scanOnStartup')}</span>
                  </label>
                  <label className="checkbox-row">
                    <input type="checkbox" checked={settings.watchMode} onChange={(event) => void updateSettingsState({ watchMode: event.target.checked })} />
                    <span>{t('watchMode')}</span>
                  </label>
                  <label>
                    <span>{t('scanInterval')}</span>
                    <input type="number" min={1} max={120} value={settings.scanIntervalMinutes} onChange={(event) => void updateSettingsState({ scanIntervalMinutes: Number(event.target.value) || 10 })} />
                  </label>
                  <p className="subtle">{t('saveSettings')}</p>
                </div>
                <div className="settings-shortcuts">
                  <div className="panel-header">
                    <h3>{t('keyboardShortcuts')}</h3>
                  </div>
                  <div className="metric-list">
                    <Metric label={t('commandPalette')} value={t('commandHint')} />
                  </div>
                </div>
              </section>
            </div>
          </section>
        )}

        {view === 'project' && activeProject && detail && (
          <section className="page">
            <div className="page-header">
              <div className="header-copy">
                <p className="eyebrow">{translateStackType(activeProject.stackType, locale)}</p>
                <h2>{activeProject.name}</h2>
                <p className="subtle path-text">{activeProject.path}</p>
              </div>
              <button className="primary-button" onClick={() => void handleRefreshProject()}>
                {t('refreshProject')}
              </button>
            </div>

            <div className="tab-row">
              {(['overview', 'readme', 'notes', 'todos', 'issues'] as DetailTab[]).map((tab) => (
                <button key={tab} className={detailTab === tab ? 'tab-button active' : 'tab-button'} onClick={() => setDetailTab(tab)}>
                  {t(tab)}
                </button>
              ))}
            </div>

            {detailTab === 'overview' && <OverviewPanel detail={detail} t={t} locale={locale} />}

            {detailTab === 'readme' && (
              <section className="panel readme-panel">
                <div className="panel-header">
                  <h3>{t('readme')}</h3>
                </div>
                <pre>{detail.readmeContent ?? t('noReadme')}</pre>
              </section>
            )}

            {detailTab === 'notes' && (
              <section className="panel">
                <div className="panel-header">
                  <h3>{t('notes')}</h3>
                </div>
                <div className="composer-grid composer-grid-wide">
                  <input value={noteTitle} onChange={(event) => setNoteTitle(event.target.value)} placeholder={t('title')} />
                  <textarea value={noteContent} onChange={(event) => setNoteContent(event.target.value)} placeholder={t('content')} />
                  <button className="primary-button" onClick={() => void createNote()}>{t('create')}</button>
                </div>
                <div className="stack-list">
                  {detail.notes.map((note) => (
                    <div className="item-card" key={note.id}>
                      <div className="item-card-top">
                        <strong>{note.title}</strong>
                        <div className="row-actions card-actions">
                          <button className="ghost-button" onClick={() => void updateNotePinned(note.id)}>{note.isPinned ? t('pinned') : t('pin')}</button>
                          <button className="ghost-button danger-text" onClick={() => void removeNote(note.id)}>{t('delete')}</button>
                        </div>
                      </div>
                      <p>{note.content}</p>
                    </div>
                  ))}
                  {detail.notes.length === 0 && <div className="empty-state">{t('noNotes')}</div>}
                </div>
              </section>
            )}

            {detailTab === 'todos' && (
              <section className="panel">
                <div className="panel-header">
                  <h3>{t('todos')}</h3>
                  <span className="subtle">{detail.todos.filter((item) => item.status !== 'done').length}</span>
                </div>
                <div className="composer-grid composer-grid-wide">
                  <textarea value={todoDescription} onChange={(event) => setTodoDescription(event.target.value)} placeholder={t('description')} />
                  <select value={todoPriority} onChange={(event) => setTodoPriority(event.target.value as 'low' | 'medium' | 'high')}>
                    <option value="low">{t('low')}</option>
                    <option value="medium">{t('medium')}</option>
                    <option value="high">{t('high')}</option>
                  </select>
                  <button className="primary-button" onClick={() => void createTodo()}>{t('create')}</button>
                </div>
                <div className="todo-board">
                  <TodoColumn
                    title={t('backlog')}
                    todos={detail.todos.filter((todo) => todo.status === 'todo')}
                    t={t}
                    onStatusChange={updateTodoStatus}
                    onDelete={removeTodo}
                  />
                  <TodoColumn
                    title={t('inProgress')}
                    todos={detail.todos.filter((todo) => todo.status === 'doing')}
                    t={t}
                    onStatusChange={updateTodoStatus}
                    onDelete={removeTodo}
                  />
                </div>
                {detail.todos.filter((todo) => todo.status === 'done').length > 0 && (
                  <section className="completed-tasks">
                    <div className="panel-header">
                      <h3>{t('done')}</h3>
                      <span className="subtle">{detail.todos.filter((todo) => todo.status === 'done').length}</span>
                    </div>
                    <div className="completed-list">
                      {detail.todos
                        .filter((todo) => todo.status === 'done')
                        .map((todo) => (
                          <TodoCard key={todo.id} todo={todo} t={t} onStatusChange={updateTodoStatus} onDelete={removeTodo} />
                        ))}
                    </div>
                  </section>
                )}
                {detail.todos.filter((todo) => todo.status !== 'done').length === 0 && <div className="empty-state">{t('noTodos')}</div>}
              </section>
            )}

            {detailTab === 'issues' && (
              <section className="panel">
                <div className="panel-header">
                  <h3>{t('issues')}</h3>
                  <span className="subtle">{detail.issues.filter((item) => !['resolved', 'closed'].includes(item.status)).length}</span>
                </div>
                <div className="composer-grid composer-grid-wide">
                  <textarea value={issueDescription} onChange={(event) => setIssueDescription(event.target.value)} placeholder={t('description')} />
                  <select value={issueSeverity} onChange={(event) => setIssueSeverity(event.target.value as 'low' | 'medium' | 'high' | 'critical')}>
                    <option value="low">{t('low')}</option>
                    <option value="medium">{t('medium')}</option>
                    <option value="high">{t('high')}</option>
                    <option value="critical">{t('critical')}</option>
                  </select>
                  <button className="primary-button" onClick={() => void createIssue()}>{t('create')}</button>
                </div>
                <div className="todo-board">
                  <IssueColumn
                    title={t('open')}
                    issues={detail.issues.filter((issue) => issue.status === 'open')}
                    t={t}
                    onStatusChange={updateIssueStatus}
                    onDelete={removeIssue}
                  />
                  <IssueColumn
                    title={t('blocked')}
                    issues={detail.issues.filter((issue) => issue.status === 'blocked')}
                    t={t}
                    onStatusChange={updateIssueStatus}
                    onDelete={removeIssue}
                  />
                </div>
                {detail.issues.filter((issue) => ['resolved', 'closed'].includes(issue.status)).length > 0 && (
                  <section className="completed-tasks">
                    <div className="panel-header">
                      <h3>{t('issueArchive')}</h3>
                      <span className="subtle">{detail.issues.filter((issue) => ['resolved', 'closed'].includes(issue.status)).length}</span>
                    </div>
                    <div className="completed-list">
                      {detail.issues
                        .filter((issue) => ['resolved', 'closed'].includes(issue.status))
                        .map((issue) => (
                          <IssueCard key={issue.id} issue={issue} t={t} onStatusChange={updateIssueStatus} onDelete={removeIssue} />
                        ))}
                    </div>
                  </section>
                )}
                {detail.issues.length === 0 && <div className="empty-state">{t('noIssues')}</div>}
              </section>
            )}
          </section>
        )}

        {view === 'project' && !activeProject && (
          <section className="page">
            <div className="empty-state large">{t('pickProject')}</div>
          </section>
        )}
      </main>

      <aside className="context-rail">
        <div className="panel sticky">
          <div className="panel-header">
            <h3>{t('quickActions')}</h3>
          </div>
          {activeProject && (
            <>
              <button className="ghost-button full" onClick={() => void handleRefreshProject()}>{t('refreshProject')}</button>
              <div className="metric-list">
                <Metric label={t('branch')} value={activeProject.git.branch ?? EMPTY_VALUE} />
                <Metric label={t('aheadBehind')} value={`${activeProject.git.ahead} / ${activeProject.git.behind}`} />
                <Metric label={t('staged')} value={activeProject.git.stagedCount} />
                <Metric label={t('unstaged')} value={activeProject.git.unstagedCount} />
                <Metric label={t('untracked')} value={activeProject.git.untrackedCount} />
                <Metric label={t('lastSeen')} value={formatDate(activeProject.lastSeenAt)} />
              </div>
            </>
          )}
        </div>
      </aside>

      {paletteOpen && (
        <div className="palette-overlay" onClick={() => setPaletteOpen(false)}>
          <div className="palette" onClick={(event) => event.stopPropagation()}>
            <div className="panel-header">
              <h3>{t('commandPalette')}</h3>
              <button className="ghost-button" onClick={() => setPaletteOpen(false)}>{t('close')}</button>
            </div>
            <input autoFocus value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder={t('searchPlaceholder')} />
            <div className="palette-section">
              <button className="palette-item" onClick={() => { setView('dashboard'); setPaletteOpen(false); }}>{t('dashboard')}</button>
              <button className="palette-item" onClick={() => { setView('settings'); setPaletteOpen(false); }}>{t('settings')}</button>
              <button className="palette-item" onClick={() => { void handleRefreshAll(); setPaletteOpen(false); }}>{t('refreshAll')}</button>
              {filteredPaletteProjects
                .filter((project) => visibleProjects.some((visibleProject) => visibleProject.id === project.id))
                .slice(0, 12)
                .map((project) => (
                <button key={project.id} className="palette-item" onClick={() => { openProject(project.id); setPaletteOpen(false); }}>
                  <div className="row-copy">
                    <strong>{project.name}</strong>
                    <p className="path-text">{project.path}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({
  label,
  value,
  accent,
  active,
  onClick
}: {
  label: string;
  value: number;
  accent?: 'danger' | 'warning';
  active?: boolean;
  onClick?: () => void;
}) => (
  <button type="button" className={`stat-card ${accent ?? ''} ${active ? 'active' : ''}`} onClick={onClick}>
    <span>{label}</span>
    <strong>{value}</strong>
  </button>
);

const Metric = ({ label, value }: { label: string; value: string | number }) => (
  <div className="metric-row">
    <span>{label}</span>
    <strong className="metric-value">{value}</strong>
  </div>
);

const OverviewPanel = ({ detail, t, locale }: { detail: ProjectDetail; t: (key: string) => string; locale: Locale }) => (
  <div className="overview-grid">
    <section className="panel">
      <div className="panel-header">
        <h3>{t('overview')}</h3>
      </div>
      <div className="metric-list">
        <Metric label={t('projectPath')} value={detail.project.path} />
        <Metric label={t('stack')} value={translateStackType(detail.project.stackType, locale)} />
        <Metric label={t('version')} value={detail.project.version} />
        <Metric label={t('branch')} value={detail.project.git.branch ?? EMPTY_VALUE} />
        <Metric label={t('gitStatus')} value={detail.project.git.isDirty ? t('dirty') : t('clean')} />
      </div>
    </section>
    <section className="panel">
      <div className="panel-header">
        <h3>{t('projectHealth')}</h3>
      </div>
      <div className="metric-list">
        <Metric label={t('notes')} value={detail.notes.length} />
        <Metric label={t('todos')} value={detail.todos.length} />
        <Metric label={t('issues')} value={detail.issues.length} />
        <Metric label={t('lastSeen')} value={formatDate(detail.project.lastSeenAt)} />
      </div>
    </section>
  </div>
);

const DashboardTaskCard = ({
  task,
  t,
  locale,
  onOpen
}: {
  task: TodoBoardItem;
  t: (key: string) => string;
  locale: Locale;
  onOpen: () => void;
}) => {
  const taskText = task.description.trim() || task.title.trim() || EMPTY_VALUE;

  return (
    <button className="task-feed-card" onClick={onOpen} type="button">
      <div className="item-card-top">
        <span className={`badge priority-${task.priority}`}>{t(task.priority)}</span>
      </div>
      <p>{taskText}</p>
      <div className="task-feed-meta">
        <span>{task.projectName}</span>
        <span>{translateStackType(task.projectStackType, locale)}</span>
        <span>{t(task.status === 'doing' ? 'inProgress' : 'backlog')}</span>
      </div>
    </button>
  );
};

const TodoColumn = ({
  title,
  todos,
  t,
  onStatusChange,
  onDelete
}: {
  title: string;
  todos: TodoItem[];
  t: (key: string) => string;
  onStatusChange: (id: string, status: TodoStatus) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) => (
  <section className="todo-column">
    <div className="todo-column-header">
      <h4>{title}</h4>
      <span className="subtle">{todos.length}</span>
    </div>
    <div className="todo-column-body">
      {todos.length === 0 ? (
        <div className="empty-state compact">{title}</div>
      ) : (
        todos.map((todo) => (
          <TodoCard key={todo.id} todo={todo} t={t} onStatusChange={onStatusChange} onDelete={onDelete} />
        ))
      )}
    </div>
  </section>
);

const IssueColumn = ({
  title,
  issues,
  t,
  onStatusChange,
  onDelete
}: {
  title: string;
  issues: IssueRecord[];
  t: (key: string) => string;
  onStatusChange: (id: string, status: IssueStatus) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) => (
  <section className="todo-column">
    <div className="todo-column-header">
      <h4>{title}</h4>
      <span className="subtle">{issues.length}</span>
    </div>
    <div className="todo-column-body">
      {issues.length === 0 ? (
        <div className="empty-state compact">{title}</div>
      ) : (
        issues.map((issue) => (
          <IssueCard key={issue.id} issue={issue} t={t} onStatusChange={onStatusChange} onDelete={onDelete} />
        ))
      )}
    </div>
  </section>
);

const TodoCard = ({
  todo,
  t,
  onStatusChange,
  onDelete
}: {
  todo: TodoItem;
  t: (key: string) => string;
  onStatusChange: (id: string, status: TodoStatus) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) => {
  const taskText = todo.description.trim() || todo.title.trim() || EMPTY_VALUE;

  return (
    <div className={todo.status === 'done' ? 'item-card completed-card' : 'item-card'}>
      <div className="item-card-top">
        <div className="row-actions compact-actions card-actions">
          <span className={`badge priority-${todo.priority}`}>{t(todo.priority)}</span>
        </div>
      </div>
      <p>{taskText}</p>
      <div className="row-actions compact-actions card-actions">
        {todo.status !== 'todo' && todo.status !== 'done' && (
          <button className="ghost-button" onClick={() => void onStatusChange(todo.id, 'todo')}>
            {t('moveToTodo')}
          </button>
        )}
        {todo.status !== 'doing' && todo.status !== 'done' && (
          <button className="ghost-button" onClick={() => void onStatusChange(todo.id, 'doing')}>
            {t('moveToDoing')}
          </button>
        )}
        {todo.status !== 'done' ? (
          <button className="ghost-button success-text" onClick={() => void onStatusChange(todo.id, 'done')}>
            {t('complete')}
          </button>
        ) : (
          <button className="ghost-button" onClick={() => void onStatusChange(todo.id, 'todo')}>
            {t('moveToTodo')}
          </button>
        )}
        <button className="ghost-button danger-text" onClick={() => void onDelete(todo.id)}>
          {t('delete')}
        </button>
      </div>
    </div>
  );
};

const IssueCard = ({
  issue,
  t,
  onStatusChange,
  onDelete
}: {
  issue: IssueRecord;
  t: (key: string) => string;
  onStatusChange: (id: string, status: IssueStatus) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) => (
  <div className={issue.status === 'resolved' || issue.status === 'closed' ? 'item-card completed-card' : 'item-card'}>
    <div className="item-card-top">
      <strong>{issue.title}</strong>
      <div className="row-actions compact-actions card-actions">
        <span className={`badge severity-${issue.severity}`}>{t(issue.severity)}</span>
        <span className="badge">{t(issue.status)}</span>
      </div>
    </div>
    <p>{issue.description || EMPTY_VALUE}</p>
    <div className="row-actions compact-actions card-actions">
      {issue.status !== 'open' && (
        <button className="ghost-button" onClick={() => void onStatusChange(issue.id, 'open')}>
          {t('open')}
        </button>
      )}
      {issue.status !== 'blocked' && issue.status !== 'resolved' && issue.status !== 'closed' && (
        <button className="ghost-button" onClick={() => void onStatusChange(issue.id, 'blocked')}>
          {t('blocked')}
        </button>
      )}
      {issue.status !== 'resolved' && (
        <button className="ghost-button success-text" onClick={() => void onStatusChange(issue.id, 'resolved')}>
          {t('resolved')}
        </button>
      )}
      {issue.status !== 'closed' && (
        <button className="ghost-button" onClick={() => void onStatusChange(issue.id, 'closed')}>
          {t('closed')}
        </button>
      )}
      <button className="ghost-button danger-text" onClick={() => void onDelete(issue.id)}>
        {t('delete')}
      </button>
    </div>
  </div>
);

export default App;
