import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { getWorkspaceRoots, markWorkspaceScanned, pruneProjectsForRoot, upsertDiscoveredProject } from './database';
import { nowIso } from './utils';

const readTextIfExists = (filePath: string): string | null => {
  try {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return fs.readFileSync(filePath, 'utf-8');
    }
  } catch {
    return null;
  }
  return null;
};

const ignoredDirectoryNames = new Set([
  '.git',
  'node_modules',
  '.next',
  '.nuxt',
  '.turbo',
  '.vercel',
  'dist',
  'build',
  'out',
  'coverage',
  'vendor',
  'target',
  'bin',
  'obj'
]);

const hasGitDirectory = (candidatePath: string) => fs.existsSync(path.join(candidatePath, '.git'));

const runGit = (projectPath: string, args: string[]) => {
  const safeDirectory = projectPath.replace(/\\/g, '/');
  return execFileSync('git', ['-c', `safe.directory=${safeDirectory}`, ...args], {
    cwd: projectPath,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  }).trim();
};

const findReadme = (projectPath: string): string | null => {
  for (const candidate of ['README.md', 'readme.md', 'README']) {
    const target = path.join(projectPath, candidate);
    if (fs.existsSync(target)) return target;
  }
  return null;
};

const getReadmePreview = (projectPath: string) => {
  const readmePath = findReadme(projectPath);
  if (!readmePath) return { readmePath: null, readmePreview: null };

  const content = readTextIfExists(readmePath);
  const readmePreview = content
    ? content
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 10)
        .join('\n')
        .slice(0, 1000)
    : null;

  return { readmePath, readmePreview };
};

const detectVersionAndStack = (projectPath: string): { version: string; stackType: string } => {
  const packageJson = readTextIfExists(path.join(projectPath, 'package.json'));
  if (packageJson) {
    try {
      const parsed = JSON.parse(packageJson) as { version?: string };
      return { version: parsed.version ?? 'unknown', stackType: 'Node.js' };
    } catch {
      return { version: 'unknown', stackType: 'Node.js' };
    }
  }

  const pyproject = readTextIfExists(path.join(projectPath, 'pyproject.toml'));
  if (pyproject) {
    return { version: pyproject.match(/version\s*=\s*["']([^"']+)["']/)?.[1] ?? 'unknown', stackType: 'Python' };
  }

  const cargo = readTextIfExists(path.join(projectPath, 'Cargo.toml'));
  if (cargo) {
    return { version: cargo.match(/version\s*=\s*["']([^"']+)["']/)?.[1] ?? 'unknown', stackType: 'Rust' };
  }

  const csproj = fs.readdirSync(projectPath).find((entry) => entry.toLowerCase().endsWith('.csproj'));
  if (csproj) {
    const content = readTextIfExists(path.join(projectPath, csproj));
    return { version: content?.match(/<Version>([^<]+)<\/Version>/i)?.[1] ?? 'unknown', stackType: '.NET' };
  }

  return { version: 'unknown', stackType: 'Generic' };
};

const detectGitSnapshot = (projectPath: string) => {
  if (!hasGitDirectory(projectPath)) {
    return {
      branch: null,
      isRepo: false,
      isDirty: false,
      ahead: 0,
      behind: 0,
      stagedCount: 0,
      unstagedCount: 0,
      untrackedCount: 0,
      gitAvailable: true,
      lastCheckedAt: nowIso(),
      lastCommitAt: null
    };
  }

  try {
    const branch = runGit(projectPath, ['rev-parse', '--abbrev-ref', 'HEAD']);
    const porcelain = runGit(projectPath, ['status', '--porcelain=2', '--branch']);
    const lastCommitAt = runGit(projectPath, ['log', '-1', '--format=%cI']) || null;

    let ahead = 0;
    let behind = 0;
    let stagedCount = 0;
    let unstagedCount = 0;
    let untrackedCount = 0;

    for (const line of porcelain.split(/\r?\n/)) {
      if (line.startsWith('# branch.ab')) {
        ahead = Number(line.match(/\+(\d+)/)?.[1] ?? 0);
        behind = Number(line.match(/\-(\d+)/)?.[1] ?? 0);
      } else if (line.startsWith('1 ') || line.startsWith('2 ')) {
        const x = line.charAt(2);
        const y = line.charAt(3);
        if (x !== '.') stagedCount += 1;
        if (y !== '.') unstagedCount += 1;
      } else if (line.startsWith('? ')) {
        untrackedCount += 1;
      }
    }

    return {
      branch,
      isRepo: true,
      isDirty: stagedCount + unstagedCount + untrackedCount > 0,
      ahead,
      behind,
      stagedCount,
      unstagedCount,
      untrackedCount,
      gitAvailable: true,
      lastCheckedAt: nowIso(),
      lastCommitAt
    };
  } catch {
    return {
      branch: null,
      isRepo: true,
      isDirty: false,
      ahead: 0,
      behind: 0,
      stagedCount: 0,
      unstagedCount: 0,
      untrackedCount: 0,
      gitAvailable: false,
      lastCheckedAt: nowIso(),
      lastCommitAt: null
    };
  }
};

const isProjectDirectory = (candidatePath: string): boolean => {
  try {
    if (!fs.statSync(candidatePath).isDirectory()) return false;
    return hasGitDirectory(candidatePath) && Boolean(findReadme(candidatePath));
  } catch {
    return false;
  }
};

const shouldSkipDirectory = (entryName: string) =>
  entryName.startsWith('.') || ignoredDirectoryNames.has(entryName.toLowerCase());

const collectCandidates = (rootPath: string): string[] => {
  const results = new Set<string>();
  const queue = [rootPath];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const currentPath = queue.pop()!;

    let realPath: string;
    try {
      realPath = fs.realpathSync(currentPath);
    } catch {
      continue;
    }

    if (visited.has(realPath)) continue;
    visited.add(realPath);

    if (isProjectDirectory(currentPath)) {
      results.add(currentPath);
    }

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(currentPath, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.isSymbolicLink() || shouldSkipDirectory(entry.name)) continue;
      queue.push(path.join(currentPath, entry.name));
    }
  }

  return [...results];
};

export const scanWorkspaceRoots = () => {
  const roots = getWorkspaceRoots().filter((root) => root.isEnabled && fs.existsSync(root.path));
  for (const root of roots) {
    const candidatePaths = collectCandidates(root.path);

    for (const candidatePath of candidatePaths) {
      const { version, stackType } = detectVersionAndStack(candidatePath);
      const { readmePath, readmePreview } = getReadmePreview(candidatePath);
      const git = detectGitSnapshot(candidatePath);

      upsertDiscoveredProject({
        rootId: root.id,
        path: candidatePath,
        name: path.basename(candidatePath),
        stackType,
        version,
        readmePath,
        readmePreview,
        git
      });
    }

    pruneProjectsForRoot(root.id, candidatePaths);
    markWorkspaceScanned(root.id);
  }
};

export const rescanProject = (projectPath: string, rootId: string) => {
  if (!fs.existsSync(projectPath)) return;
  const { version, stackType } = detectVersionAndStack(projectPath);
  const { readmePath, readmePreview } = getReadmePreview(projectPath);
  const git = detectGitSnapshot(projectPath);

  upsertDiscoveredProject({
    rootId,
    path: projectPath,
    name: path.basename(projectPath),
    stackType,
    version,
    readmePath,
    readmePreview,
    git
  });
};
