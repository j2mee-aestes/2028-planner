import { kstToday } from './date';
import type { AppData } from './types';

export function exportJSON(data: AppData) {
  const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), ...data }, null, 2)], {
    type: 'application/json',
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `planner-backup-${kstToday()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export async function readBackup(file: File): Promise<AppData> {
  const j = JSON.parse(await file.text());
  if (!j || typeof j !== 'object' || !j.days || !j.settings) throw new Error('백업 파일 형식이 아닙니다');
  return { settings: j.settings, days: j.days, scores: j.scores ?? {}, wrongs: j.wrongs ?? {} };
}
