import { CURRICULUM } from '../seed/curriculum';
import { EVENTS, HOLIDAYS, PERSONAL_OFF, PLAN_END, PLAN_START } from '../seed/calendar';
import { addDays, eachDay, fmtHM, isWeekend, weekday } from './date';
import type { Holiday, PhaseId, PlanTask, SchoolCalendar, Settings, Track, WrongNote } from './types';

/** 단계 이름 (12/15 이전은 연습 기간) */
export const phaseLabel = (d: string, ph: PhaseId) => (d < PLAN_START ? '연습 기간' : PHASE_LABEL[ph]);

export const PHASE_LABEL: Record<PhaseId, string> = {
  winter: '겨울방학',
  sem1: '1학기',
  exam: '내신기간',
  summer: '여름방학',
  sem2: '2학기',
};

export function holidayMap(extra: Holiday[] = []) {
  const m = new Map<string, string>();
  for (const h of [...HOLIDAYS, ...extra]) m.set(h.date, m.has(h.date) ? `${m.get(h.date)}·${h.name}` : h.name);
  return m;
}

/**
 * 공부 금지일 계산
 * - 휴일(공휴일)·주말이 이어진 블록 중 공휴일이 하나 이상 포함된 것을 연휴 후보로 본다.
 * - 토·일 두 날만으로 된 블록은 연휴가 아님 → 그 안의 공휴일 당일만 금지.
 * - 그 외 2일 이상 블록(금토일, 토일월, 설 연휴 등)은 첫날만 금지, 1일짜리 공휴일은 당일 금지.
 * - 개인 금지일·추가 금지일은 항상 금지, 강제 공부일은 제외.
 */
export function computeOffDays(settings: Pick<Settings, 'extraHolidays' | 'extraOff' | 'extraStudy'>) {
  const hol = holidayMap(settings.extraHolidays);
  const off = new Map<string, string>();
  const from = addDays(PLAN_START, -7);
  const to = addDays(PLAN_END, 7);
  let block: string[] = [];
  const flush = () => {
    if (block.length && block.some((d) => hol.has(d))) {
      const onlyWeekend = block.length <= 2 && block.every(isWeekend);
      if (onlyWeekend || block.length === 1) {
        for (const d of block) if (hol.has(d)) off.set(d, hol.get(d)!);
      } else {
        off.set(block[0], `연휴 첫날 (${hol.get(block.find((d) => hol.has(d))!)})`);
      }
    }
    block = [];
  };
  for (const d of eachDay(from, to)) {
    if (hol.has(d) || isWeekend(d)) block.push(d);
    else flush();
  }
  flush();
  for (const p of PERSONAL_OFF) off.set(p.date, p.name);
  for (const d of settings.extraOff) off.set(d, '추가 휴무');
  for (const d of settings.extraStudy) off.delete(d);
  return off;
}

export function phaseOf(d: string, s: SchoolCalendar): PhaseId {
  for (const e of s.exams) if (d >= addDays(e.start, -s.examLeadDays) && d <= e.end) return 'exam';
  if (d <= s.winterEnd) return 'winter';
  if (d < s.summerStart) return 'sem1';
  if (d <= s.summerEnd) return 'summer';
  return 'sem2';
}

export interface TrackStat {
  track: Track;
  total: number;
  assigned: number;
  first?: string;
  last?: string;
}

export interface Plan {
  byDate: Record<string, PlanTask[]>;
  byId: Record<string, PlanTask>;
  off: Map<string, string>;
  holidays: Map<string, string>;
  phase: (d: string) => PhaseId;
  events: Record<string, { title: string; tentative?: boolean }[]>;
  stats: TrackStat[];
}

export function generatePlan(settings: Settings, tracks: Track[] = CURRICULUM): Plan {
  const off = computeOffDays(settings);
  const holidays = holidayMap(settings.extraHolidays);
  const phase = (d: string) => phaseOf(d, settings.school);
  const byDate: Record<string, PlanTask[]> = {};
  const byId: Record<string, PlanTask> = {};
  const lastOf: Record<string, string | undefined> = {};
  const stats: TrackStat[] = [];

  const days = [...eachDay(PLAN_START, PLAN_END)].filter((d) => !off.has(d));
  const phases = new Map(days.map((d) => [d, phase(d)]));

  for (const t of tracks) {
    const remaining = [...t.units];
    let start = t.startDate ?? PLAN_START;
    if (t.after) {
      const prev = lastOf[t.after];
      if (prev && addDays(prev, 1) > start) start = addDays(prev, 1);
    }
    let end = t.endDate ?? PLAN_END;
    if (t.endAfterExams && settings.school.exams.length)
      end = settings.school.exams.map((e) => e.end).reduce((a, b) => (a > b ? a : b));
    let examCount = 0;
    let blockCount = 0;
    let first: string | undefined;
    let last: string | undefined;
    for (const d of days) {
      if (!remaining.length && !t.blocks) break;
      if (d < start || d > end) continue;
      const ph = phases.get(d)!;
      if (!t.phases.includes(ph)) continue;
      const wd = weekday(d);
      if (ph === 'exam') {
        const mode = t.examMode ?? 'same';
        if (mode === 'skip') continue;
        if (mode === 'half' && examCount++ % 2 === 1) continue;
        if (typeof mode === 'object') {
          if (!mode.weekdays.includes(wd)) continue;
        } else if (t.weekdays && !t.weekdays.includes(wd)) continue;
      } else if (t.weekdays && !t.weekdays.includes(wd)) continue;

      if (t.blocks) {
        const min = t.blocks[wd];
        if (!min) continue;
        const task: PlanTask = {
          id: `${t.id}:${d}`, trackId: t.id, subject: t.subject, title: `${t.title} ${fmtHM(min)}`,
          trackTitle: t.title, kind: t.kind, date: d, estMin: min, tentative: t.tentative,
        };
        (byDate[d] ??= []).push(task);
        byId[task.id] = task;
        first ??= d;
        last = d;
        blockCount++;
        continue;
      }

      const n = isWeekend(d) ? (t.weekendPerDay ?? t.perDay ?? 1) : (t.perDay ?? 1);
      for (let k = 0; k < n; k++) {
        const idx = remaining.findIndex((u) => !u.availableFrom || u.availableFrom <= d);
        if (idx < 0) break;
        const [u] = remaining.splice(idx, 1);
        const task: PlanTask = {
          id: `${t.id}:${u.id}`,
          trackId: t.id,
          subject: t.subject,
          title: u.title,
          trackTitle: t.title,
          kind: t.kind,
          date: d,
          estMin: u.estMin ?? (n > 1 ? Math.round((t.estMin ?? 60) / n) : t.estMin),
          org: u.org,
          tentative: u.tentative ?? t.tentative,
        };
        (byDate[d] ??= []).push(task);
        byId[task.id] = task;
        first ??= d;
        last = d;
      }
    }
    lastOf[t.id] = last;
    stats.push(t.blocks
      ? { track: t, total: blockCount, assigned: blockCount, first, last }
      : { track: t, total: t.units.length, assigned: t.units.length - remaining.length, first, last });
  }

  const events: Plan['events'] = {};
  for (const e of EVENTS) (events[e.date] ??= []).push(e);
  return { byDate, byId, off, holidays, phase, events, stats };
}

/** 재풀이 날짜가 쉬는 날이면 다음 공부일로 */
export function nextStudyDay(plan: Plan, d: string) {
  let x = d;
  for (let i = 0; i < 14 && plan.off.has(x); i++) x = addDays(x, 1);
  return x;
}

/** 오답노트 재풀이 일정을 할 일로 합침 (트랙 id: wrong-review) */
export function withReviews(plan: Plan, wrongs: Record<string, WrongNote>): Plan {
  const list = Object.values(wrongs);
  if (!list.length) return plan;
  const byDate = { ...plan.byDate };
  const byId = { ...plan.byId };
  for (const w of list)
    w.reviews.forEach((due, i) => {
      const d = nextStudyDay(plan, due);
      const t: PlanTask = {
        id: `wrong-review:${w.id}-${i}`, trackId: 'wrong-review', subject: w.subject, kind: 'study', date: d,
        title: `오답 재풀이 ${i === 0 ? '1차' : i === 1 ? '2차' : `${i + 1}차`} · ${w.exam} ${w.no}번`, trackTitle: '오답노트', estMin: 10,
      };
      byDate[d] = [...(byDate[d] ?? []), t];
      byId[t.id] = t;
    });
  return { ...plan, byDate, byId };
}
