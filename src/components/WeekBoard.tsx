import { useEffect, useRef, useState } from 'react';
import { useTaskActions } from '../lib/actions';
import { fmtMin, uid, wdName, weekday } from '../lib/date';
import { dayMinutes, tasksOf } from '../lib/stats';
import { useStore } from '../lib/store';
import { SUBJECTS } from '../seed/subjects';
import { IconPlus } from './icons';
import { TaskRow } from './TaskRow';
import { SubjectSelect } from './ui';

const ORDER = Object.fromEntries(SUBJECTS.map((s, i) => [s.id, i]));

/** 요일별 칸에 커리 할 일 + 내가 추가한 할 일을 크게 표시. 모바일은 좌우로 넘김 */
export function WeekBoard({ days, today, onOpen }: { days: string[]; today: string; onOpen: (d: string) => void }) {
  const { plan, day } = useStore();
  const a = useTaskActions();
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scroller.current?.querySelector<HTMLElement>(`[data-day="${today}"]`) ?? scroller.current?.querySelector<HTMLElement>('[data-day]');
    if (el && scroller.current) scroller.current.scrollTo({ left: el.offsetLeft - 16, behavior: 'smooth' });
  }, [days[0], today]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div ref={scroller} className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-4 pb-4 [scrollbar-width:none] md:-mx-0 md:px-0">
        {days.map((d) => {
          const rec = day(d);
          const tasks = tasksOf(plan, d, rec).sort((x, y) => Number(x.done) - Number(y.done) || (ORDER[x.subject] ?? 99) - (ORDER[y.subject] ?? 99));
          const done = tasks.filter((t) => t.done).length;
          const off = plan.off.get(d);
          const isToday = d === today;
          const red = weekday(d) === 0 || plan.holidays.has(d);
          return (
            <section key={d} data-day={d}
              className={`flex w-[86vw] max-w-[22rem] shrink-0 snap-start flex-col rounded-[22px] p-2.5 sm:w-[19rem] ${isToday ? 'bg-zinc-200/70 dark:bg-zinc-800/70' : 'bg-zinc-100/80 dark:bg-zinc-900/60'}`}>
              <button className="press mb-2 flex items-end gap-2 rounded-2xl px-2 py-1.5 text-left" onClick={() => onOpen(d)}>
                <span className={`text-3xl leading-none ${red ? 'text-rose-400' : ''}`}>{wdName(d)}</span>
                <span className="pb-0.5 text-sm muted">{Number(d.slice(5, 7))}/{Number(d.slice(8))}</span>
                {isToday && <span className="mb-0.5 rounded-full bg-zinc-900 px-2 py-px text-[11px] text-white dark:bg-zinc-100 dark:text-zinc-900">오늘</span>}
                <span className="ml-auto text-right text-xs leading-tight muted">
                  <span className="block text-sm tabular-nums text-zinc-900 dark:text-zinc-100">{fmtMin(dayMinutes(rec))}</span>
                  {tasks.length ? `${done}/${tasks.length}` : ''}
                </span>
              </button>
              {tasks.length > 0 && (
                <div className="mx-2 mb-2 h-1 overflow-hidden rounded-full bg-zinc-300/50 dark:bg-zinc-700/50">
                  <div className="h-full rounded-full bg-zinc-900 transition-[width] duration-500 dark:bg-zinc-100" style={{ width: `${(done / tasks.length) * 100}%` }} />
                </div>
              )}
              {off && <p className="px-2 pb-2 text-sm muted">휴 · {off}</p>}
              <ul className="flex flex-col gap-2">
                {tasks.map((t) => <TaskRow key={t.id} t={t} date={d} a={a} size="lg" />)}
              </ul>
              <QuickAdd date={d} />
            </section>
          );
        })}
      </div>
      {a.scoreModal}
    </>
  );
}

function QuickAdd({ date }: { date: string }) {
  const { updateDay } = useStore();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('etc');
  const add = () => {
    if (!title.trim()) return;
    updateDay(date, (d) => ({ ...d, custom: [...d.custom, { id: `c-${uid()}`, subject, title: title.trim(), kind: 'study' }] }));
    setTitle('');
  };
  if (!open)
    return (
      <button className="press mt-2 flex items-center gap-1.5 rounded-2xl px-3 py-2.5 text-sm muted hover:bg-white/60 dark:hover:bg-zinc-800" onClick={() => setOpen(true)}>
        <IconPlus size={16} />할 일 추가
      </button>
    );
  return (
    <div className="mt-2 space-y-1.5 rounded-2xl bg-white p-2 dark:bg-zinc-900">
      <input autoFocus className="input" placeholder="할 일" value={title} onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') add(); if (e.key === 'Escape') setOpen(false); }} />
      <div className="flex gap-1.5">
        <SubjectSelect value={subject} onChange={setSubject} className="min-w-0 flex-1 py-1.5" />
        <button className="btn-ghost px-3 py-1.5" onClick={() => setOpen(false)}>닫기</button>
        <button className="btn-primary px-3 py-1.5" onClick={add}>추가</button>
      </div>
    </div>
  );
}
