import fs from 'node:fs';
import { getSettings } from './database';
import { scanWorkspaceRoots } from './scanner';

let intervalHandle: NodeJS.Timeout | null = null;
let debounceHandle: NodeJS.Timeout | null = null;
const watchers = new Map<string, fs.FSWatcher>();

const triggerDebouncedScan = () => {
  if (debounceHandle) clearTimeout(debounceHandle);
  debounceHandle = setTimeout(() => {
    scanWorkspaceRoots();
  }, 1200);
};

export const configureWatchers = () => {
  const settings = getSettings();

  for (const watcher of watchers.values()) watcher.close();
  watchers.clear();

  if (intervalHandle) clearInterval(intervalHandle);
  intervalHandle = setInterval(() => {
    scanWorkspaceRoots();
  }, Math.max(1, settings.scanIntervalMinutes) * 60 * 1000);

  if (!settings.watchMode) return;

  for (const root of settings.workspaceRoots.filter((item) => item.isEnabled && fs.existsSync(item.path))) {
    try {
      watchers.set(
        root.id,
        fs.watch(root.path, { recursive: false }, () => {
          triggerDebouncedScan();
        })
      );
    } catch {
      // ignore watcher failures; scheduled scanning still runs
    }
  }
};
