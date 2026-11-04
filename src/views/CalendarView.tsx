import { useEffect, useState } from 'react';
import { DayDetail } from '../components/DayDetail';
import { Dot, Segmented, Sheet } from '../components/ui';
import { addDays, addMonths, eachDay, endOfMonth, fmtMin, isWeekend, kstToday, prettyDate, startOfMonth, startOfWeek, weekday } from '../lib/date';
import { PHASE_LABEL } from '../lib/plan';
import { dayMinutes, tasksOf } from '../lib/stats';
import { useStore } from '../lib/store';
import { SUBJECTS } from '../seed/subjects';

type Mode = 'month' | 'week' | 'day';
const WD = ['일', '월', '화', '수', '목', '금', '토'];

const useWide = () => {
  const q = '(min-width: 1024px)';
  const [w, setW] = useState(() => matchMedia(q).matches);
  useEffect(() => {
    const m = matchMedia(q);
    const f = () => setW(m.matches);
    m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, []);
  return w;
};

function useDaySummary() {
  const { plan, day } = useStore();
  return (d: string) => {
    const rec = day(d);
    const tasks = tasksOf(plan, d, rec);
    const subj = SUBJECTS.map((s) => {
      const ts = tasks.filter((t) => t.subject === s.id);
      return { id: s.id, n: ts.length, done: ts.filter((t) => t.done).length };
    }).filter((x) => x.n);
    return { tasks, subj, min: dayMinutes(rec), off: plan.off.get(d), hol: plan.holidays.get(d) };
  };
}

export function CalendarView() {
  const today = kstToday();
  const [mode, setMode] = useState<Mode>('month');
  const [cursor, setCursor] = useState(today);
  const [selected, setSelected] = useState(today);
  const [sheet, setSheet] = useState(false);
  const wide = useWide();
  const { plan, data } = useStore();
  const sum = useDaySummary();

  const pick = (d: string) => {
    setSelected(d);
    if (!wide && mode !== 'day') setSheet(true);
  };
  const move = (n: number) =>
    setCursor((c) => (mode === 'month' ? addMonths(c, n) : addDays(c, mode === 'week' ? 7 * n : n)));
  useEffect(() => { if (mode === 'day') setSelected(cursor); }, [cursor, mode]);

  const title =
    mode === 'month'
      ? `${cursor.slice(0, 4)}년 ${Number(cursor.slice(5, 7))}월`
      : mode === 'week'
        ? `${prettyDate(startOfWeek(cursor))} – ${prettyDate(addDays(startOfWeek(cursor), 6))}`
        : prettyDate(cursor);

  const header = (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <button className="btn-ghost px-2" onClick={() => move(-1)} aria-label="이전">‹</button>
      <h1 className="min-w-[9rem] text-center text-lg font-bold">{title}</h1>
      <button className="btn-ghost px-2" onClick={() => move(1)} aria-label="다음">›</button>
      <button className="btn-outline" onClick={() => { setCursor(today); setSelected(today); }}>오늘</button>
      <div className="ml-auto">
        <Segmented value={mode} onChange={setMode} options={[['month', '월'], ['week', '주'], ['day', '일']]} />
      </div>
    </div>
  );

  let body;
  if (mode === 'month') {
    const first = startOfWeek(startOfMonth(cursor));
    const last = addDays(startOfWeek(endOfMonth(cursor)), 6);
    const m = cursor.slice(0, 7);
    body = (
      <div>
        <div className="grid grid-cols-7 text-center text-xs muted">
          {WD.map((w, i) => <div key={w} className={`py-1 ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : ''}`}>{w}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 dark:border-slate-800 dark:bg-slate-800">
          {[...eachDay(first, last)].map((d) => {
            const s = sum(d);
            const out = d.slice(0, 7) !== m;
            const red = weekday(d) === 0 || !!s.hol;
            return (
              <button
                key={d}
                onClick={() => pick(d)}
                className={`flex min-h-[4.6rem] flex-col items-start gap-1 p-1 text-left sm:min-h-[5.5rem] sm:p-1.5 ${
                  s.off ? 'bg-slate-100 dark:bg-slate-900/60' : 'bg-white dark:bg-slate-900'
                } ${out ? 'opacity-40' : ''} ${selected === d && wide ? 'ring-2 ring-inset ring-blue-500' : ''}`}
              >
                <div className="flex w-full items-center gap-1">
                  <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-semibold ${
                    d === today ? 'bg-blue-600 text-white' : red ? 'text-red-500' : weekday(d) === 6 ? 'text-blue-500' : ''}`}>
                    {Number(d.slice(8))}
                  </span>
                  {s.off && <span className="text-[10px] font-bold muted">휴</span>}
                  {plan.events[d] && <span className="text-[10px]">📌</span>}
                </div>
                <div className="flex flex-wrap gap-0.5">
                  {s.subj.map((x) => <Dot key={x.id} subject={x.id} filled={x.done === x.n} size={7} />)}
                </div>
                {s.min > 0 && <span className="mt-auto text-[10px] font-medium tabular-nums muted sm:text-xs">{fmtMin(s.min)}</span>}
              </button>
            );
          })}
        </div>
        <Legend />
      </div>
    );
  } else if (mode === 'week') {
    const ws = startOfWeek(cursor);
    const ds = [...eachDay(ws, addDays(ws, 6))];
    const total = ds.reduce((a, d) => a + sum(d).min, 0);
    const target = ds.reduce((a, d) => a + (plan.off.has(d) ? 0 : isWeekend(d) ? data.settings.targets.weekend : data.settings.targets.weekday), 0);
    body = (
      <div className="space-y-2">
        <div className="card flex items-baseline gap-2 p-3">
          <span className="label">주간 합계</span>
          <span className="text-xl font-bold tabular-nums">{fmtMin(total)}</span>
          <span className="text-sm muted">/ 목표 {fmtMin(target)} ({target ? Math.round((total / target) * 100) : 0}%)</span>
        </div>
        {ds.map((d) => {
          const s = sum(d);
          const done = s.tasks.filter((t) => t.done).length;
          return (
            <button key={d} onClick={() => pick(d)}
              className={`card flex w-full items-center gap-3 p-3 text-left ${selected === d && wide ? 'ring-2 ring-blue-500' : ''} ${s.off ? 'opacity-60' : ''}`}>
              <div className={`w-16 text-sm font-semibold ${d === today ? 'text-blue-600' : weekday(d) === 0 || s.hol ? 'text-red-500' : ''}`}>
                {prettyDate(d)}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex flex-wrap gap-2 text-xs">
                  {s.off ? <span className="muted">휴 · {s.off}</span> : s.subj.map((x) => (
                    <span key={x.id} className="inline-flex items-center gap-1"><Dot subject={x.id} filled={x.done === x.n} />{x.done}/{x.n}</span>
                  ))}
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full bg-blue-600" style={{ width: `${s.tasks.length ? (done / s.tasks.length) * 100 : 0}%` }} />
                </div>
              </div>
              <div className="w-12 text-right text-sm font-medium tabular-nums">{fmtMin(s.min)}</div>
            </button>
          );
        })}
      </div>
    );
  } else {
    body = <DayDetail date={cursor} />;
  }

  return (
    <div className="lg:flex lg:gap-6">
      <div className="min-w-0 flex-1">
        {header}
        <PhaseBar d={mode === 'day' ? cursor : selected} />
        {body}
      </div>
      {wide && mode !== 'day' && (
        <aside className="w-[26rem] shrink-0">
          <div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto pr-1"><DayDetail date={selected} /></div>
        </aside>
      )}
      {!wide && (
        <Sheet open={sheet} onClose={() => setSheet(false)} title=" ">
          <DayDetail date={selected} />
        </Sheet>
      )}
    </div>
  );
}

function PhaseBar({ d }: { d: string }) {
  const { plan, data } = useStore();
  const ph = plan.phase(d);
  const exam = data.settings.school.exams.find((e) => d >= addDays(e.start, -data.settings.school.examLeadDays) && d <= e.end);
  return (
    <div className="mb-2 text-xs muted">
      {PHASE_LABEL[ph]}
      {exam && ` · ${exam.name} 대비 (시험 ${prettyDate(exam.start)}~${prettyDate(exam.end)})`}
    </div>
  );
}

function Legend() {
  return (
    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs muted">
      {SUBJECTS.filter((s) => s.id !== 'etc').map((s) => (
        <span key={s.id} className="inline-flex items-center gap-1"><Dot subject={s.id} />{s.name}</span>
      ))}
      <span className="inline-flex items-center gap-1"><Dot subject="etc" filled={false} />미완료</span>
    </div>
  );
}
