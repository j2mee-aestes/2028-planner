import { useMemo } from 'react';
import { useTaskActions } from '../lib/actions';
import { kstToday, prettyDate } from '../lib/date';
import { postponedList } from '../lib/stats';
import { useStore } from '../lib/store';
import { subjectOf } from '../seed/subjects';
import { IconCalendar, IconTrash, IconUndo } from './icons';
import { Dot, Sheet } from './ui';

export function usePostponed() {
  const { plan, data } = useStore();
  return useMemo(() => postponedList(plan, data), [plan, data]);
}

export function PostponedSheet({ open, onClose, saturday }: { open: boolean; onClose: () => void; saturday?: boolean }) {
  const list = usePostponed();
  const a = useTaskActions();
  const today = kstToday();

  return (
    <Sheet open={open} onClose={onClose} title={`미룬 할 일 ${list.length}개`}>
      {saturday && list.length > 0 && (
        <div className="mb-3 rounded-2xl bg-zinc-900 px-4 py-3 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900">
          토요일이에요. 이번 주에 미룬 할 일을 정리해 볼까요?
          <div className="mt-0.5 text-xs opacity-70">오늘 하기 · 원래 날짜로 되돌리기 · 다른 날로 옮기기 · 휴지통(완전 삭제)</div>
        </div>
      )}
      {list.length === 0 ? (
        <p className="py-8 text-center text-sm muted">미룬 할 일이 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {list.map((p) => (
            <li key={`${p.date}:${p.id}`} className="rounded-2xl bg-zinc-50 px-4 py-3 dark:bg-zinc-800/50">
              <div className="flex items-start gap-2">
                <span className="mt-1.5"><Dot subject={p.subject} /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] leading-snug">
                    {p.kind === 'mock' && <span className="mr-1.5 rounded-md bg-white px-1.5 py-px align-[1px] text-[10px] dark:bg-zinc-700">모고</span>}
                    {p.title}
                  </div>
                  <div className="mt-0.5 text-xs muted">{subjectOf(p.subject).name} · 원래 {prettyDate(p.date)} · {prettyDate(p.at)}에 미룸</div>
                </div>
                <button className="icon-btn h-8 w-8 text-red-500 dark:text-red-400" onClick={() => a.purge(p)} aria-label="완전 삭제"><IconTrash size={17} /></button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5 pl-4">
                <button className="btn-primary px-3 py-1.5 text-xs" onClick={() => a.moveTo(p, today)}>오늘 하기</button>
                <button className="btn-outline px-3 py-1.5 text-xs" onClick={() => a.restore(p)}><IconUndo size={14} />되돌리기</button>
                <label className="btn-outline relative cursor-pointer px-3 py-1.5 text-xs">
                  <IconCalendar size={14} />다른 날로
                  <input type="date" className="absolute inset-0 cursor-pointer opacity-0" min={today}
                    onChange={(e) => e.target.value && a.moveTo(p, e.target.value)} aria-label="옮길 날짜" />
                </label>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}
