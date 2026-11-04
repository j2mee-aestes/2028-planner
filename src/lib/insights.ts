import { addDays, diffDays, eachDay } from './date';
import type { Plan } from './plan';
import { dayMinutes, tasksOf } from './stats';
import type { AppData, PlanTask } from './types';
import { statsStart } from '../seed/calendar';

/** 연속 공부일: 공부 금지일은 건너뜀(끊기지도, 세지도 않음). 오늘은 아직 0분이어도 끊지 않음 */
export function streaks(data: AppData, plan: Plan, today: string) {
  let best = 0, run = 0, studied = 0, studyDays = 0;
  const from = statsStart(today);
  for (const d of eachDay(from, today)) {
    if (d > today) break;
    if (plan.off.has(d)) continue;
    const m = dayMinutes(data.days[d]);
    if (d !== today) studyDays++;
    if (m > 0) { run++; studied++; best = Math.max(best, run); }
    else if (d !== today) run = 0;
  }
  return { current: run, best, studied, studyDays };
}

/** 할 일 완료 집합: 체크된 id + 옮겨간 항목이 체크되면 원래 id 도 완료로 */
export function doneIds(data: AppData) {
  const s = new Set<string>();
  for (const d of Object.values(data.days)) {
    for (const id of Object.keys(d.checks ?? {})) s.add(id);
    for (const c of d.custom ?? []) if (c.from && d.checks?.[c.id]) s.add(c.from);
  }
  return s;
}

export interface TrackProgress {
  id: string;
  title: string;
  subject: string;
  total: number;
  done: number;
  first?: string;
  last?: string;
  /** 예상 완료일 (밀린 만큼 뒤로) */
  projected?: string;
  late: number;
  status: 'done' | 'active' | 'upcoming';
}

export function trackProgress(data: AppData, plan: Plan, today: string): TrackProgress[] {
  const done = doneIds(data);
  const byTrack: Record<string, PlanTask[]> = {};
  for (const t of Object.values(plan.byId)) (byTrack[t.trackId] ??= []).push(t);
  const out: TrackProgress[] = [];
  for (const st of plan.stats) {
    const t = st.track;
    if (t.blocks) continue;
    const tasks = byTrack[t.id] ?? [];
    const removed = (x: PlanTask) => !!data.days[x.date]?.edits?.[x.id]?.deleted;
    const live = tasks.filter((x) => !removed(x));
    const n = live.filter((x) => done.has(x.id)).length;
    const late = live.filter((x) => x.date < today && !done.has(x.id)).length;
    let projected = st.last;
    if (late && st.first && st.last && st.assigned) {
      const perUnit = (diffDays(st.first, st.last) + 1) / st.assigned;
      const base = st.last > today ? st.last : today;
      projected = addDays(base, Math.ceil(late * perUnit));
    }
    out.push({
      id: t.id, title: t.title, subject: t.subject, total: live.length, done: n, first: st.first, last: st.last, projected, late,
      status: n >= live.length && live.length ? 'done' : st.first && st.first <= today ? 'active' : 'upcoming',
    });
  }
  return out;
}

/** 주간 요약 (일~토) */
export function weekSummary(data: AppData, plan: Plan, ws: string) {
  const days = [...eachDay(ws, addDays(ws, 6))];
  const bySubject: Record<string, { min: number; n: number; done: number }> = {};
  let min = 0, target = 0, n = 0, dn = 0;
  for (const d of days) {
    const rec = data.days[d] ?? { checks: {}, edits: {}, custom: [], logs: [] };
    for (const l of rec.logs ?? []) { min += l.min; (bySubject[l.subject] ??= { min: 0, n: 0, done: 0 }).min += l.min; }
    for (const t of tasksOf(plan, d, rec)) {
      const b = (bySubject[t.subject] ??= { min: 0, n: 0, done: 0 });
      b.n++; n++;
      if (t.done) { b.done++; dn++; }
    }
    if (!plan.off.has(d)) target += [0, 6].includes(new Date(d).getUTCDay()) ? data.settings.targets.weekend : data.settings.targets.weekday;
  }
  return { days, min, target, n, done: dn, bySubject };
}
