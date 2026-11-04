import { useEffect, useState } from 'react';
import { fmtHM, kstToday } from '../lib/date';
import type { DayTask } from '../lib/stats';
import { useStore } from '../lib/store';
import { subjectOf } from '../seed/subjects';
import { IconClose } from './icons';

const START = 6; // 06:00
const END = 25; // 다음날 01:00
const ROW = 52; // 1시간 높이(px)
const KST = 9 * 3600e3;
const kstMin = (ms: number) => Math.floor(((ms + KST) % 86400e3) / 60000);
const toMin = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const y = (min: number) => ((min - START * 60) / 60) * ROW;

interface Block { key: string; top: number; h: number; lane: number; lanes: number }
function layout<T>(items: T[], span: (x: T) => [number, number], key: (x: T) => string): (Block & { item: T })[] {
  const sorted = [...items].sort((a, b) => span(a)[0] - span(b)[0]);
  const ends: number[] = [];
  const placed = sorted.map((it) => {
    const [s, e] = span(it);
    let lane = ends.findIndex((x) => x <= s);
    if (lane < 0) { lane = ends.length; ends.push(e); } else ends[lane] = e;
    return { key: key(it), top: y(s), h: Math.max(18, y(e) - y(s)), lane, lanes: 0, item: it };
  });
  return placed.map((p) => ({ ...p, lanes: ends.length }));
}

/** 하루 시간표: 왼쪽 = 계획(할 일에 시작 시각 지정), 오른쪽 = 실제(타이머 기록) */
export function Timeline({ date, tasks }: { date: string; tasks: DayTask[] }) {
  const { day, updateDay, data } = useStore();
  const rec = day(date);
  const slots = rec.slots ?? {};
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(t); }, []);

  const setSlot = (id: string, v?: string) =>
    updateDay(date, (d) => { const s = { ...(d.slots ?? {}) }; if (v) s[id] = v; else delete s[id]; return { ...d, slots: s }; });

  const planned = tasks.filter((t) => slots[t.id]);
  const loose = tasks.filter((t) => !slots[t.id]);
  const dur = (t: DayTask) => t.plan?.estMin ?? 30;
  const pBlocks = layout(planned, (t) => [toMin(slots[t.id]), toMin(slots[t.id]) + dur(t)], (t) => t.id);

  const run = data.settings.runningTimer;
  const logs = [
    ...rec.logs.filter((l) => l.start && l.end).map((l) => ({ id: l.id, subject: l.subject, s: kstMin(l.start!), e: kstMin(l.start!) + l.min, live: false })),
    ...(run && date === kstToday() ? [{ id: 'live', subject: run.subject, s: kstMin(run.startedAt), e: kstMin(run.startedAt) + Math.max(1, Math.round((now - run.startedAt) / 60000)), live: true }] : []),
  ].map((l) => ({ ...l, s: l.s < START * 60 && l.s < 120 ? l.s + 1440 : l.s, e: l.s < START * 60 && l.s < 120 ? l.e + 1440 : l.e }));
  const aBlocks = layout(logs, (l) => [l.s, l.e], (l) => l.id);
  const untimed = rec.logs.filter((l) => !l.start).reduce((a, l) => a + l.min, 0);
  const nowMin = date === kstToday() ? kstMin(now) : null;

  return (
    <div className="card p-4">
      {loose.length > 0 && (
        <div className="mb-3">
          <div className="label mb-1.5">시간 미정 · 눌러서 시작 시각 지정</div>
          <div className="flex flex-wrap gap-1.5">
            {loose.map((t) => (
              <label key={t.id} className={`press relative cursor-pointer rounded-full py-1 pl-2 pr-2.5 text-xs ${t.done ? 'opacity-50 line-through' : ''}`}
                style={{ background: `${subjectOf(t.subject).color}55` }}>
                {t.title}
                <input type="time" step={600} className="absolute inset-0 cursor-pointer opacity-0" aria-label={`${t.title} 시작 시각`}
                  onChange={(e) => e.target.value && setSlot(t.id, e.target.value)} />
              </label>
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-[2.25rem_1fr_4.5rem] text-[11px] muted"><span /><span className="pl-1">계획</span><span className="pl-1">실제</span></div>
      <div className="relative grid grid-cols-[2.25rem_1fr_4.5rem]" style={{ height: (END - START) * ROW }}>
        {Array.from({ length: END - START + 1 }, (_, i) => (
          <div key={i} className="pointer-events-none absolute inset-x-0 flex items-start" style={{ top: i * ROW }}>
            <span className="w-9 -translate-y-1.5 text-[10px] tabular-nums muted">{String((START + i) % 24).padStart(2, '0')}</span>
            <span className="h-px flex-1 bg-zinc-200/70 dark:bg-zinc-800" />
          </div>
        ))}
        <span />
        <div className="relative mr-1.5">
          {pBlocks.map(({ key, top, h, lane, lanes, item: t }) => {
            const c = subjectOf(t.subject);
            return (
              <div key={key} className="absolute overflow-hidden rounded-xl px-2 py-1 text-xs shadow-[0_1px_2px_rgba(0,0,0,0.06)] transition-[top] duration-300"
                style={{ top, height: h, left: `${(lane / lanes) * 100}%`, width: `calc(${100 / lanes}% - 3px)`, background: `${c.color}${t.done ? '55' : 'cc'}`, color: '#18181b' }}>
                <div className={`truncate pr-4 ${t.done ? 'line-through opacity-60' : ''}`}>{t.title}</div>
                <div className="text-[10px] opacity-60">{slots[t.id]} · {fmtHM(dur(t))}</div>
                <input type="time" step={600} value={slots[t.id]} className="absolute inset-0 cursor-pointer opacity-0" aria-label="시각 변경"
                  onChange={(e) => e.target.value && setSlot(t.id, e.target.value)} />
                <button className="absolute right-1 top-1 rounded-full bg-white/60 p-0.5" onClick={() => setSlot(t.id)} aria-label="시간 지정 해제"><IconClose size={11} /></button>
              </div>
            );
          })}
        </div>
        <div className="relative">
          {aBlocks.map(({ key, top, h, lane, lanes, item: l }) => (
            <div key={key} title={`${subjectOf(l.subject).name} ${fmtHM(l.e - l.s)}`}
              className={`absolute rounded-lg ${l.live ? 'animate-pulse' : ''}`}
              style={{ top, height: h, left: `${(lane / lanes) * 100}%`, width: `calc(${100 / lanes}% - 2px)`, background: subjectOf(l.subject).color }} />
          ))}
        </div>
        {nowMin !== null && nowMin >= START * 60 && (
          <div className="pointer-events-none absolute inset-x-0 flex items-center" style={{ top: y(nowMin) }}>
            <span className="h-2 w-2 translate-x-8 rounded-full bg-zinc-900 dark:bg-zinc-100" />
            <span className="ml-8 h-px flex-1 bg-zinc-900 dark:bg-zinc-100" />
          </div>
        )}
      </div>
      {untimed > 0 && <div className="mt-2 text-xs muted">시각 없는 직접 입력 기록 {fmtHM(untimed)}</div>}
    </div>
  );
}
