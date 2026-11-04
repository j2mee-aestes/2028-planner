import { addDays, monthKey, startOfWeek } from './date';
import type { Plan } from './plan';
import type { AppData, DayRecord, PlanTask, SubjectId, TaskKind } from './types';

export interface DayTask {
  id: string;
  subject: SubjectId;
  title: string;
  kind: TaskKind;
  custom: boolean;
  done: boolean;
  plan?: PlanTask;
}

/** 해당 날짜의 최종 체크리스트 (커리 + 수정/삭제 반영 + 직접 추가) */
export function tasksOf(plan: Plan, date: string, day: DayRecord): DayTask[] {
  const out: DayTask[] = [];
  for (const t of plan.byDate[date] ?? []) {
    const e = day.edits[t.id];
    if (e?.deleted) continue;
    out.push({ id: t.id, subject: t.subject, title: e?.title ?? t.title, kind: t.kind, custom: false, done: !!day.checks[t.id], plan: t });
  }
  for (const c of day.custom)
    out.push({ id: c.id, subject: c.subject, title: c.title, kind: c.kind, custom: true, done: !!day.checks[c.id] });
  return out;
}

export const dayMinutes = (d?: DayRecord) => (d?.logs ?? []).reduce((a, l) => a + l.min, 0);

export function minutesBySubject(days: Record<string, DayRecord>, from: string, to: string) {
  const r: Record<string, number> = {};
  for (const [date, d] of Object.entries(days)) {
    if (date < from || date > to) continue;
    for (const l of d.logs ?? []) r[l.subject] = (r[l.subject] ?? 0) + l.min;
  }
  return r;
}

/** 월별 모의고사 완료 수 (체크한 날짜 기준) */
export function mockCountByMonth(data: AppData, plan: Plan) {
  const r: Record<string, Record<string, number>> = {};
  for (const [date, d] of Object.entries(data.days)) {
    const customKind = Object.fromEntries((d.custom ?? []).map((c) => [c.id, c]));
    for (const [id, checkedOn] of Object.entries(d.checks ?? {})) {
      const t = plan.byId[id];
      const c = customKind[id];
      const kind = t?.kind ?? c?.kind;
      const subject = t?.subject ?? c?.subject;
      if (kind !== 'mock' || !subject || d.edits?.[id]?.deleted) continue;
      const m = monthKey(checkedOn || date);
      (r[m] ??= {})[subject] = (r[m][subject] ?? 0) + 1;
    }
  }
  return r;
}

/** 지나간 날의 미완료 커리 항목 */
export function overdue(plan: Plan, data: AppData, today: string, lookback = 14) {
  const out: (DayTask & { date: string })[] = [];
  for (let i = lookback; i >= 1; i--) {
    const d = addDays(today, -i);
    const rec = data.days[d] ?? { checks: {}, edits: {}, custom: [], logs: [] };
    for (const t of tasksOf(plan, d, rec)) if (!t.done && !t.custom) out.push({ ...t, date: d });
  }
  return out;
}

export const weekRange = (d: string) => {
  const s = startOfWeek(d);
  return [s, addDays(s, 6)] as const;
};
