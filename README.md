# Fabri-Lab Proje Yönetim Yazılımı

Fabri-Lab Proje Yönetim Yazılımı is a local-first Electron desktop app for developers who want a fast, reliable overview of all projects inside selected workspace folders.

## Core capabilities

- Multi-root workspace management
- Project discovery from local folders
- Git status snapshots
- README preview and version detection
- Per-project notes
- Per-project todos with status tracking
- Per-project issues/problem tracking
- Dark-first bilingual UI (Turkish / English)

## Local-only data model

- The application runs locally on the user's machine.
- Project metadata, notes, tasks, and problem records are stored locally in SQLite.
- The app does not send project data to a remote service.
- The app does not automatically export or sync your data to an external platform.
- Repository scanning reads local folders and local Git state only.

## Tech stack

- Electron
- React + TypeScript + Vite
- SQLite (`better-sqlite3`)

## Getting started

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run dist
```

## Product direction

The app is designed for solo developers who need one place to:

- see project health quickly
- track local work without depending on cloud tools
- keep notes, todos, and issue context next to each project
- move faster with keyboard-friendly workflows
- keep all working data local to their own machine

## Current scope

This repository includes the first implementation of:

- secure Electron preload API
- local SQLite persistence
- workspace scanning and git metadata extraction
- dashboard, projects, settings, notes, todos, and issues UI
