import { useMemo, useState } from 'react';
import { useTaskActions } from '../lib/actions';
import { fmtHM, fmtMin, isWeekend, kstToday, prettyDate, uid, weekday } from '../lib/date';
import { PHASE_LABEL } from '../lib/plan';
import { dayMinutes, overdue, tasksOf } from '../lib/stats';
import { useStore } from '../lib/store';
import type { TaskKind } from '../lib/types';
import { SUBJECTS, subjectOf } from '../seed/subjects';
import { PostponedSheet, usePostponed } from './PostponedSheet';
import { TaskRow } from './TaskRow';
import { Timer } from './Timer';
import { IconChevronRight, IconClose, IconPin, IconPlus, IconTimer } from './icons';
import { Check, Disclosure, Dot, inkVars, SubjectSelect } from './ui';

export function DayDetail({ date }: { date: string }) {
  const { plan, data, day, updateDay } = useStore();
  const rec = day(date);
  const today = kstToday();
  const tasks = tasksOf(plan, date, rec);
  const total = dayMinutes(rec);
  const target = isWeekend(date) ? data.settings.targets.weekend : data.settings.targets.weekday;
  const off = plan.off.get(date);
  const hol = plan.holidays.get(date);
  const late = useMemo(() => (date === today ? overdue(plan, data, today) : []), [date, today, plan, data]);
  const a = useTaskActions();
  const postponed = usePostponed();
  const [showPostponed, setShowPostponed] = useState(false);

  // 직접 추가
  const [nSub, setNSub] = useState('kor');
  const [nTitle, setNTitle] = useState('');
  const [nKind, setNKind] = useState<TaskKind>('study');
  const addTask = () => {
    if (!nTitle.trim()) return;
    updateDay(date, (d) => ({ ...d, custom: [...d.custom, { id: `c-${uid()}`, subject: nSub, title: nTitle.trim(), kind: nKind }] }));
    setNTitle('');
  };

  // 시간 직접 입력
  const [mSub, setMSub] = useState('math');
  const [mH, setMH] = useState('');
  const [mM, setMM] = useState('');
  const addLog = () => {
    const min = (Number(mH) || 0) * 60 + (Number(mM) || 0);
    if (min <= 0) return;
    updateDay(date, (d) => ({ ...d, logs: [...d.logs, { id: uid(), subject: mSub, min, src: 'manual' }] }));
    setMH('');
    setMM('');
  };

  const bySubject: Record<string, number> = {};
  for (const l of rec.logs) bySubject[l.subject] = (bySubject[l.subject] ?? 0) + l.min;
  const groups = SUBJECTS.map((s) => ({ s, items: tasks.filter((t) => t.subject === s.id) })).filter((g) => g.items.length);
  const others = tasks.filter((t) => !SUBJECTS.some((s) => s.id === t.subject));
  if (others.length) groups.push({ s: subjectOf(others[0].subject), items: others });
  const doneN = tasks.filter((t) => t.done).length;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg">{prettyDate(date)}</h2>
          <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs dark:bg-zinc-800">{PHASE_LABEL[plan.phase(date)]}</span>
          {hol && <span className="text-xs text-red-500">{hol}</span>}
          {date === today && <span className="rounded bg-zinc-900 px-1.5 py-0.5 text-xs text-white dark:bg-zinc-100 dark:text-zinc-900">오늘</span>}
        </div>
        {plan.events[date]?.map((e) => (
          <div key={e.title} className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800"><IconPin size={13} />{e.title}</div>
        ))}
        {off && <div className="mt-1 text-sm muted">공부 금지일 · {off}</div>}
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl tabular-nums">{fmtMin(total)}</span>
          <span className="text-sm muted">/ 목표 {fmtMin(target)}</span>
          <span className="ml-auto text-sm muted">할 일 {doneN}/{tasks.length}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-200/70 dark:bg-zinc-800">
          <div className="h-full rounded-full bg-zinc-900 transition-[width] duration-700 dark:bg-zinc-100" style={{ transitionTimingFunction: 'var(--ease-spring)', width: `${Math.min(100, (total / target) * 100)}%` }} />
        </div>
      </div>

      <section className="card space-y-3 p-4">
        <Timer />
        <div className="flex items-center gap-1.5">
          <SubjectSelect value={mSub} onChange={setMSub} className="!w-24 shrink-0" />
          <input className="input !w-16 min-w-0 px-1.5" inputMode="numeric" placeholder="시간" value={mH} onChange={(e) => setMH(e.target.value)} />
          <input className="input !w-16 min-w-0 px-1.5" inputMode="numeric" placeholder="분" value={mM} onChange={(e) => setMM(e.target.value)} />
          <button className="btn-outline ml-auto px-3" onClick={addLog}><IconPlus size={15} />기록</button>
        </div>
        {rec.logs.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {rec.logs.map((l) => (
              <span key={l.id} className="inline-flex items-center gap-1 rounded-full bg-zinc-100 py-0.5 pl-2 pr-1 text-xs dark:bg-zinc-800">
                <Dot subject={l.subject} /> {subjectOf(l.subject).name} {fmtHM(l.min)}{l.src === 'timer' && <IconTimer size={13} className="muted" />}
                <button className="press rounded-full p-0.5 muted" onClick={() => updateDay(date, (d) => ({ ...d, logs: d.logs.filter((x) => x.id !== l.id) }))} aria-label="삭제"><IconClose size={13} /></button>
              </span>
            ))}
          </div>
        )}
      </section>

      {postponed.length > 0 && date === today && (
        <button onClick={() => setShowPostponed(true)}
          className={`press flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left ${weekday(today) === 6
            ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'card'}`}>
          <span className="flex-1 text-sm">
            {weekday(today) === 6 ? `토요일 정리 시간 · 미룬 할 일 ${postponed.length}개를 처리하세요` : `미룬 할 일 ${postponed.length}개`}
          </span>
          <IconChevronRight size={18} />
        </button>
      )}

      {late.length > 0 && (
        <Disclosure className="card px-4 py-3"
          title={<span className="text-sm text-amber-600 dark:text-amber-400">밀린 항목 {late.length}개 · 최근 2주</span>}>
          <ul className="mt-2 space-y-2">
            {late.map((t) => (
              <li key={t.id} className="flex items-center gap-2.5 text-sm">
                <Check checked={false} onChange={() => a.toggle(t, t.date)} label={t.title} />
                <Dot subject={t.subject} />
                <span className="flex-1">{t.title}</span>
                <span className="text-xs muted">{prettyDate(t.date)}</span>
                <button className="press text-xs muted underline underline-offset-2" onClick={() => a.postpone(t, t.date)}>미루기</button>
              </li>
            ))}
          </ul>
        </Disclosure>
      )}

      <section className="space-y-3">
        {groups.length === 0 && <p className="text-sm muted">{off ? '쉬는 날입니다.' : '배정된 할 일이 없습니다.'}</p>}
        {groups.map(({ s, items }) => (
          <div key={s.id}>
            <div className="subj-ink mb-1 flex items-center gap-1.5 text-sm" style={inkVars(s.id)}>
              <Dot subject={s.id} /> {s.name}
              {bySubject[s.id] ? <span className="font-normal muted">· {fmtHM(bySubject[s.id])}</span> : null}
            </div>
            <ul className="card divide-y divide-zinc-100 dark:divide-zinc-800">
              {items.map((t) => <TaskRow key={t.id} t={t} date={date} a={a} />)}
            </ul>
          </div>
        ))}
      </section>

      <section className="card space-y-2.5 p-4">
        <div className="label">할 일 추가</div>
        <div className="flex gap-1.5">
          <SubjectSelect value={nSub} onChange={setNSub} className="!w-24 shrink-0" />
          <input className="input min-w-0 flex-1" placeholder="할 일" value={nTitle} onChange={(e) => setNTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTask()} />
        </div>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm">
            <Check checked={nKind === 'mock'} onChange={() => setNKind(nKind === 'mock' ? 'study' : 'mock')} label="모의고사" /> 모의고사
          </label>
          <button className="btn-primary" onClick={addTask}><IconPlus size={15} />추가</button>
        </div>
      </section>

      <textarea className="input" rows={2} placeholder="메모" value={rec.memo ?? ''} onChange={(e) => updateDay(date, (d) => ({ ...d, memo: e.target.value }))} />

      {a.scoreModal}
      <PostponedSheet open={showPostponed} onClose={() => setShowPostponed(false)} saturday={weekday(today) === 6} />
    </div>
  );
}
