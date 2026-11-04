import { useState } from 'react';
import type { TaskActions } from '../lib/actions';
import type { DayTask } from '../lib/stats';
import { subjectOf } from '../seed/subjects';
import { IconPencil, IconTrash } from './icons';
import { Check } from './ui';

/** 할 일 한 줄. size='lg' 는 주간 보드용 큰 카드 */
export function TaskRow({ t, date, a, size = 'md', meta = true }: { t: DayTask; date: string; a: TaskActions; size?: 'md' | 'lg'; meta?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(t.title);
  const save = () => {
    const v = text.trim();
    if (v && v !== t.title) a.rename(t, date, v);
    setEditing(false);
  };
  const sc = a.scoreByTask[t.id];
  const lg = size === 'lg';

  return (
    <li className={`group relative flex items-start gap-3 ${lg ? 'rounded-2xl bg-white px-3.5 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:bg-zinc-900' : 'px-4 py-3'}`}>
      {lg && <span className="absolute inset-y-3 left-0 w-[3px] rounded-full" style={{ background: subjectOf(t.subject).color }} />}
      <Check checked={t.done} onChange={() => a.toggle(t, date)} label={t.title} />
      <div className="min-w-0 flex-1">
        {editing ? (
          <input autoFocus className="input" value={text} onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()} onBlur={save} />
        ) : (
          <div className={`${lg ? 'text-base' : 'text-[15px]'} leading-snug transition-colors duration-300 ${t.done ? 'muted line-through decoration-zinc-400/60' : ''}`}>
            {t.kind === 'mock' && <span className="mr-1.5 rounded-md bg-zinc-100 px-1.5 py-px align-[1px] text-[10px] dark:bg-zinc-800">모고</span>}
            {t.custom && lg && <span className="mr-1.5 rounded-md bg-zinc-900 px-1.5 py-px align-[1px] text-[10px] text-white dark:bg-zinc-100 dark:text-zinc-900">내 할 일</span>}
            {t.title}
          </div>
        )}
        {meta && (
          <div className="mt-0.5 text-xs muted">
            {lg ? subjectOf(t.subject).name : t.custom ? '직접 추가' : t.plan?.trackTitle}
            {t.plan?.estMin ? ` · 약 ${t.plan.estMin}분` : ''}
            {!lg && t.plan?.tentative ? ' · 미확정' : ''}
          </div>
        )}
        {t.kind === 'mock' && t.done && (
          <button className="press mt-1 text-xs underline underline-offset-2" onClick={() => a.openScore(t)}>
            {sc ? `점수 ${sc.subjects[t.subject]?.raw ?? '-'}점 · 수정` : '점수 입력'}
          </button>
        )}
      </div>
      <div className={`-mr-2 flex transition-opacity group-hover:opacity-100 ${lg ? 'opacity-40' : 'opacity-60'}`}>
        <button className="icon-btn h-8 w-8" onClick={() => { setText(t.title); setEditing(true); }} aria-label="수정"><IconPencil size={16} /></button>
        <button className="icon-btn h-8 w-8" onClick={() => a.postpone(t, date)} aria-label="미루기"><IconTrash size={16} /></button>
      </div>
    </li>
  );
}
