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
    if (e?.deleted || e?.postponed || e?.movedTo) continue;
    out.push({ id: t.id, subject: t.subject, title: e?.title ?? t.title, kind: t.kind, custom: false, done: !!day.checks[t.id], plan: t });
  }
  for (const c of day.custom)
    if (!c.postponed) out.push({ id: c.id, subject: c.subject, title: c.title, kind: c.kind, custom: true, done: !!day.checks[c.id] });
  return out;
}

export interface PostponedItem {
  id: string;
  date: string; // 원래 날짜
  at: string; // 미룬 날
  title: string;
  subject: SubjectId;
  kind: TaskKind;
  custom: boolean;
}

/** 미룬 할 일 전체 (미룬 날짜 오래된 순) */
export function postponedList(plan: Plan, data: AppData): PostponedItem[] {
  const out: PostponedItem[] = [];
  for (const [date, d] of Object.entries(data.days)) {
    for (const [id, e] of Object.entries(d.edits ?? {})) {
      if (!e.postponed || e.deleted || e.movedTo) continue;
      const t = plan.byId[id];
      const snap = e.snap ?? (t && { title: t.title, subject: t.subject, kind: t.kind });
      if (!snap) continue;
      out.push({ id, date, at: e.postponed, title: e.title ?? snap.title, subject: snap.subject, kind: snap.kind, custom: false });
    }
    for (const c of d.custom ?? [])
      if (c.postponed) out.push({ id: c.id, date, at: c.postponed, title: c.title, subject: c.subject, kind: c.kind, custom: true });
  }
  return out.sort((a, b) => a.at.localeCompare(b.at) || a.date.localeCompare(b.date));
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
export function mockCountByMonth(data: AppData, plan: Plan, from = '0000') {
  const r: Record<string, Record<string, number>> = {};
  for (const [date, d] of Object.entries(data.days)) {
    const customKind = Object.fromEntries((d.custom ?? []).map((c) => [c.id, c]));
    for (const [id, checkedOn] of Object.entries(d.checks ?? {})) {
      const t = plan.byId[id];
      const c = customKind[id];
      const kind = t?.kind ?? c?.kind;
      const subject = t?.subject ?? c?.subject;
      if (kind !== 'mock' || !subject || d.edits?.[id]?.deleted) continue;
      if ((checkedOn || date) < from) continue; // 연습 기간 기록 제외
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
