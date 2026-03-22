import { randomUUID } from 'node:crypto';

export const nowIso = () => new Date().toISOString();
export const createId = () => randomUUID();

