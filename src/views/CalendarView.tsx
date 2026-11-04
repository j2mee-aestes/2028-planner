import { useEffect, useState } from 'react';
import { DayDetail } from '../components/DayDetail';
import { IconChevronLeft, IconChevronRight } from '../components/icons';
import { Dot, Segmented, Sheet } from '../components/ui';
import { addDays, addMonths, eachDay, endOfMonth, fmtMin, isWeekend, kstToday, prettyDate, startOfMonth, startOfWeek, weekday } from '../lib/date';
import { PHASE_LABEL } from '../lib/plan';
import { dayMinutes, tasksOf } from '../lib/stats';
import { useStore } from '../lib/store';
import { SUBJECTS, subjectOf } from '../seed/subjects';

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
      <button className="icon-btn" onClick={() => move(-1)} aria-label="이전"><IconChevronLeft /></button>
      <h1 className="min-w-[9rem] text-center">
        {mode === 'month' ? (
          <><span className="text-2xl">{Number(cursor.slice(5, 7))}월</span> <span className="text-sm muted">{cursor.slice(0, 4)}</span></>
        ) : <span className="text-lg">{title}</span>}
      </h1>
      <button className="icon-btn" onClick={() => move(1)} aria-label="다음"><IconChevronRight /></button>
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
    const all = [...eachDay(first, last)];
    const weeks = Array.from({ length: all.length / 7 }, (_, i) => all.slice(i * 7, i * 7 + 7));
    const monthMin = all.filter((d) => d.slice(0, 7) === m).reduce((a, d) => a + sum(d).min, 0);
    body = (
      <div>
        <div className="mb-3 text-sm muted">
          이번 달 <span className="text-zinc-900 tabular-nums dark:text-zinc-100">{fmtMin(monthMin)}</span>
        </div>
        <div className="grid grid-cols-7 pb-1 text-center text-xs muted sm:grid-cols-[repeat(7,minmax(0,1fr))_3.5rem]">
          {WD.map((w, i) => <div key={w} className={i === 0 ? 'text-rose-400' : ''}>{w}</div>)}
          <div className="hidden sm:block">주간</div>
        </div>
        {weeks.map((wk) => (
          <div key={wk[0]} className="grid grid-cols-7 border-t border-zinc-200/60 dark:border-zinc-800/80 sm:grid-cols-[repeat(7,minmax(0,1fr))_3.5rem]">
            {wk.map((d) => {
              const s = sum(d);
              const out = d.slice(0, 7) !== m;
              const red = weekday(d) === 0 || !!s.hol;
              const isSel = selected === d && wide;
              return (
                <button
                  key={d}
                  onClick={() => pick(d)}
                  className={`press group m-0.5 flex min-h-[4.75rem] flex-col gap-1 rounded-2xl p-1.5 text-left sm:min-h-[6rem] sm:p-2 ${
                    isSel ? 'bg-white shadow-[0_2px_10px_rgba(0,0,0,0.07)] dark:bg-zinc-800' : 'hover:bg-white/70 dark:hover:bg-zinc-900'
                  } ${out ? 'opacity-30' : ''}`}
                >
                  <div className="flex items-center gap-1">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-sm ${
                      d === today ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : red ? 'text-rose-400' : ''}`}>
                      {Number(d.slice(8))}
                    </span>
                    {s.off && <span className="text-[10px] muted">휴</span>}
                  </div>
                  {plan.events[d] && (
                    <span className="truncate rounded bg-zinc-100 px-1 text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                      {plan.events[d][0].title.split(' (')[0].split(' ·')[0]}
                    </span>
                  )}
                  {!s.off && s.subj.length > 0 && (
                    <div className="flex w-full gap-[2px]">
                      {s.subj.map((x) => (
                        <span key={x.id} title={`${subjectOf(x.id).name} ${x.done}/${x.n}`} className="h-2 flex-1 rounded-full"
                          style={x.done === x.n ? { background: subjectOf(x.id).color } : { boxShadow: `inset 0 0 0 1.5px ${subjectOf(x.id).color}`, background: x.done ? `${subjectOf(x.id).color}80` : 'transparent' }} />
                      ))}
                    </div>
                  )}
                  <span className="mt-auto self-end text-[11px] tabular-nums muted sm:text-xs">{s.min > 0 ? fmtMin(s.min) : ''}</span>
                </button>
              );
            })}
            <div className="hidden items-end justify-center pb-2 text-xs tabular-nums sm:flex">
              {(() => { const t = wk.reduce((a, d) => a + sum(d).min, 0); return t ? fmtMin(t) : <span className="font-normal muted">–</span>; })()}
            </div>
          </div>
        ))}
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
          <span className="text-xl tabular-nums">{fmtMin(total)}</span>
          <span className="text-sm muted">/ 목표 {fmtMin(target)} ({target ? Math.round((total / target) * 100) : 0}%)</span>
        </div>
        {ds.map((d) => {
          const s = sum(d);
          const done = s.tasks.filter((t) => t.done).length;
          return (
            <button key={d} onClick={() => pick(d)}
              className={`card press flex w-full items-center gap-3 p-3.5 text-left ${selected === d && wide ? 'ring-2 ring-zinc-900 dark:ring-zinc-100' : ''} ${s.off ? 'opacity-60' : ''}`}>
              <div className={`w-16 text-sm ${d === today ? 'underline underline-offset-4' : weekday(d) === 0 || s.hol ? 'text-rose-400' : ''}`}>
                {prettyDate(d)}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex flex-wrap gap-2 text-xs">
                  {s.off ? <span className="muted">휴 · {s.off}</span> : s.subj.map((x) => (
                    <span key={x.id} className="inline-flex items-center gap-1"><Dot subject={x.id} filled={x.done === x.n} />{x.done}/{x.n}</span>
                  ))}
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div className="h-full bg-zinc-900 dark:bg-zinc-100" style={{ width: `${s.tasks.length ? (done / s.tasks.length) * 100 : 0}%` }} />
                </div>
              </div>
              <div className="w-12 text-right text-sm tabular-nums">{fmtMin(s.min)}</div>
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
        <Sheet open={sheet} onClose={() => setSheet(false)} title="">
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
    <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs muted">
      {SUBJECTS.filter((s) => s.id !== 'etc').map((s) => (
        <span key={s.id} className="inline-flex items-center gap-1">
          <span className="h-2 w-3 rounded-full" style={{ background: s.color }} />{s.name}
        </span>
      ))}
      <span className="ml-auto">채움 = 완료 · 테두리 = 남음</span>
    </div>
  );
}
