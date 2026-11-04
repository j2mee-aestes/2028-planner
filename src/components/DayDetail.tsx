import { useMemo, useState } from 'react';
import { fmtHM, fmtMin, isWeekend, kstToday, prettyDate, uid } from '../lib/date';
import { PHASE_LABEL } from '../lib/plan';
import { dayMinutes, overdue, tasksOf, type DayTask } from '../lib/stats';
import { useStore } from '../lib/store';
import type { Score, TaskKind } from '../lib/types';
import { SUBJECTS, subjectOf } from '../seed/subjects';
import { ScoreModal } from './ScoreModal';
import { Timer } from './Timer';
import { Dot, inkVars, SubjectSelect } from './ui';

export function DayDetail({ date }: { date: string }) {
  const { plan, data, day, updateDay } = useStore();
  const rec = day(date);
  const today = kstToday();
  const tasks = tasksOf(plan, date, rec);
  const total = dayMinutes(rec);
  const target = isWeekend(date) ? data.settings.targets.weekend : data.settings.targets.weekday;
  const off = plan.off.get(date);
  const hol = plan.holidays.get(date);
  const [score, setScore] = useState<Partial<Score> | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const late = useMemo(() => (date === today ? overdue(plan, data, today) : []), [date, today, plan, data]);

  const scoreByTask = useMemo(() => {
    const m: Record<string, Score> = {};
    for (const s of Object.values(data.scores)) if (s.taskId) m[s.taskId] = s;
    return m;
  }, [data.scores]);

  const toggle = (t: DayTask, onDate = date) => {
    const wasDone = !!day(onDate).checks[t.id];
    updateDay(onDate, (d) => {
      const checks = { ...d.checks };
      if (wasDone) delete checks[t.id];
      else checks[t.id] = today;
      return { ...d, checks };
    });
    if (!wasDone && t.kind === 'mock' && !scoreByTask[t.id] && ['kor', 'eng', 'math', 'soc', 'sci', 'hist'].includes(t.subject))
      setScore({ type: 'self', org: t.plan?.org === '사설' ? '사설' : (t.plan?.org ?? '사설'), name: t.title, date: today, taskId: t.id, subjects: { [t.subject]: { wrong: [] } } });
  };

  const saveEdit = (t: DayTask) => {
    const title = editText.trim();
    if (!title) return setEditing(null);
    updateDay(date, (d) =>
      t.custom
        ? { ...d, custom: d.custom.map((c) => (c.id === t.id ? { ...c, title } : c)) }
        : { ...d, edits: { ...d.edits, [t.id]: { ...d.edits[t.id], title } } },
    );
    setEditing(null);
  };
  const remove = (t: DayTask) =>
    updateDay(date, (d) =>
      t.custom
        ? { ...d, custom: d.custom.filter((c) => c.id !== t.id) }
        : { ...d, edits: { ...d.edits, [t.id]: { ...d.edits[t.id], deleted: true } } },
    );
  const deletedCount = Object.entries(rec.edits).filter(([id, e]) => e.deleted && plan.byDate[date]?.some((t) => t.id === id)).length;
  const restore = () =>
    updateDay(date, (d) => ({ ...d, edits: Object.fromEntries(Object.entries(d.edits).map(([k, v]) => [k, { ...v, deleted: false }])) }));

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
          <h2 className="text-lg font-bold">{prettyDate(date)}</h2>
          <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs dark:bg-zinc-800">{PHASE_LABEL[plan.phase(date)]}</span>
          {hol && <span className="text-xs font-medium text-red-500">{hol}</span>}
          {date === today && <span className="rounded bg-zinc-900 px-1.5 py-0.5 text-xs text-white dark:bg-zinc-100 dark:text-zinc-900">오늘</span>}
        </div>
        {plan.events[date]?.map((e) => (
          <div key={e.title} className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400">📌 {e.title}</div>
        ))}
        {off && <div className="mt-1 text-sm muted">공부 금지일 · {off}</div>}
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold tabular-nums">{fmtMin(total)}</span>
          <span className="text-sm muted">/ 목표 {fmtMin(target)}</span>
          <span className="ml-auto text-sm muted">할 일 {doneN}/{tasks.length}</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div className="h-full bg-zinc-900 dark:bg-zinc-100" style={{ width: `${Math.min(100, (total / target) * 100)}%` }} />
        </div>
      </div>

      <section className="card space-y-3 p-3">
        <Timer />
        <div className="flex items-center gap-1.5">
          <SubjectSelect value={mSub} onChange={setMSub} className="!w-24 shrink-0" />
          <input className="input !w-16 min-w-0 px-1.5" inputMode="numeric" placeholder="시간" value={mH} onChange={(e) => setMH(e.target.value)} />
          <input className="input !w-16 min-w-0 px-1.5" inputMode="numeric" placeholder="분" value={mM} onChange={(e) => setMM(e.target.value)} />
          <button className="btn-outline ml-auto" onClick={addLog}>+ 기록</button>
        </div>
        {rec.logs.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {rec.logs.map((l) => (
              <span key={l.id} className="inline-flex items-center gap-1 rounded-full bg-zinc-100 py-0.5 pl-2 pr-1 text-xs dark:bg-zinc-800">
                <Dot subject={l.subject} /> {subjectOf(l.subject).name} {fmtHM(l.min)}{l.src === 'timer' ? ' ⏱' : ''}
                <button className="px-1 muted" onClick={() => updateDay(date, (d) => ({ ...d, logs: d.logs.filter((x) => x.id !== l.id) }))} aria-label="삭제">✕</button>
              </span>
            ))}
          </div>
        )}
      </section>

      {late.length > 0 && (
        <details className="card p-3">
          <summary className="cursor-pointer text-sm font-semibold text-amber-600 dark:text-amber-400">밀린 항목 {late.length}개 (최근 2주)</summary>
          <ul className="mt-2 space-y-1">
            {late.map((t) => (
              <li key={t.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4" checked={false} onChange={() => toggle(t, t.date)} />
                <Dot subject={t.subject} />
                <span className="flex-1">{t.title}</span>
                <span className="text-xs muted">{prettyDate(t.date)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <section className="space-y-3">
        {groups.length === 0 && <p className="text-sm muted">{off ? '쉬는 날입니다.' : '배정된 할 일이 없습니다.'}</p>}
        {groups.map(({ s, items }) => (
          <div key={s.id}>
            <div className="subj-ink mb-1 flex items-center gap-1.5 text-sm font-bold" style={inkVars(s.id)}>
              <Dot subject={s.id} /> {s.name}
              {bySubject[s.id] ? <span className="font-normal muted">· {fmtHM(bySubject[s.id])}</span> : null}
            </div>
            <ul className="card divide-y divide-zinc-100 dark:divide-zinc-800">
              {items.map((t) => (
                <li key={t.id} className="flex items-start gap-2.5 px-3 py-2">
                  <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-zinc-900 dark:accent-zinc-200" checked={t.done} onChange={() => toggle(t)} />
                  <div className="min-w-0 flex-1">
                    {editing === t.id ? (
                      <input autoFocus className="input" value={editText} onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && saveEdit(t)} onBlur={() => saveEdit(t)} />
                    ) : (
                      <div className={`text-sm ${t.done ? 'line-through muted' : ''}`}>
                        {t.kind === 'mock' && <span className="mr-1 rounded bg-zinc-100 px-1 text-[10px] font-bold dark:bg-zinc-800">모고</span>}
                        {t.title}
                      </div>
                    )}
                    <div className="text-xs muted">
                      {t.custom ? '직접 추가' : t.plan?.trackTitle}
                      {t.plan?.estMin ? ` · 약 ${t.plan.estMin}분` : ''}
                      {t.plan?.tentative ? ' · 미확정' : ''}
                    </div>
                    {t.kind === 'mock' && t.done && (
                      <button className="mt-1 text-xs font-medium text-zinc-900 underline underline-offset-2 dark:text-zinc-100"
                        onClick={() => setScore(scoreByTask[t.id] ?? { type: 'self', name: t.title, taskId: t.id, org: t.plan?.org, subjects: { [t.subject]: { wrong: [] } } })}>
                        {scoreByTask[t.id] ? `점수 ${scoreByTask[t.id].subjects[t.subject]?.raw ?? '-'}점 · 수정` : '점수 입력'}
                      </button>
                    )}
                  </div>
                  <button className="px-1 text-xs muted" onClick={() => { setEditing(t.id); setEditText(t.title); }}>수정</button>
                  <button className="px-1 text-xs muted" onClick={() => remove(t)}>삭제</button>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {deletedCount > 0 && <button className="text-xs muted underline" onClick={restore}>삭제한 커리 항목 {deletedCount}개 복원</button>}
      </section>

      <section className="card space-y-2 p-3">
        <div className="label">할 일 추가</div>
        <div className="flex gap-1.5">
          <SubjectSelect value={nSub} onChange={setNSub} className="!w-24 shrink-0" />
          <input className="input min-w-0 flex-1" placeholder="할 일" value={nTitle} onChange={(e) => setNTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTask()} />
        </div>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-sm">
            <input type="checkbox" checked={nKind === 'mock'} onChange={(e) => setNKind(e.target.checked ? 'mock' : 'study')} /> 모의고사
          </label>
          <button className="btn-primary" onClick={addTask}>추가</button>
        </div>
      </section>

      <textarea className="input" rows={2} placeholder="메모" value={rec.memo ?? ''} onChange={(e) => updateDay(date, (d) => ({ ...d, memo: e.target.value }))} />

      {score && <ScoreModal initial={score} onClose={() => setScore(null)} />}
    </div>
  );
}
