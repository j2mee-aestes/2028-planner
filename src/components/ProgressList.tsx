import { useMemo, useState } from 'react';
import { diffDays, kstToday, prettyDate } from '../lib/date';
import { trackProgress } from '../lib/insights';
import { useStore } from '../lib/store';
import { subjectOf } from '../seed/subjects';
import { Segmented } from './ui';

type F = 'active' | 'upcoming' | 'done';

/** 교재(트랙)별 진도율과 예상 완료일 */
export function ProgressList() {
  const { data, plan } = useStore();
  const today = kstToday();
  const all = useMemo(() => trackProgress(data, plan, today), [data, plan, today]);
  const [f, setF] = useState<F>('active');
  const list = all.filter((t) => t.status === f);
  const behind = all.filter((t) => t.status === 'active' && t.late > 0).length;

  return (
    <section className="card p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="text-sm">교재별 진도</h2>
        {behind > 0 && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">밀림 {behind}개</span>}
        <div className="ml-auto">
          <Segmented value={f} onChange={setF} options={[['active', `진행 ${all.filter((t) => t.status === 'active').length}`], ['upcoming', '예정'], ['done', '완료']]} />
        </div>
      </div>
      {list.length === 0 && <p className="py-4 text-center text-sm muted">해당 교재가 없습니다.</p>}
      <ul className="space-y-3.5">
        {list.map((t) => {
          const pct = t.total ? Math.round((t.done / t.total) * 100) : 0;
          const slip = t.projected && t.last ? diffDays(t.last, t.projected) : 0;
          return (
            <li key={t.id}>
              <div className="flex items-baseline gap-2 text-sm">
                <span className="h-2 w-2 shrink-0 translate-y-[-1px] rounded-full" style={{ background: subjectOf(t.subject).color }} />
                <span className="min-w-0 flex-1 truncate">{t.title}</span>
                <span className="tabular-nums">{pct}%</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${pct}%`, background: subjectOf(t.subject).color, transitionTimingFunction: 'var(--ease-spring)' }} />
              </div>
              <div className="mt-1 flex gap-2 text-[11px] muted">
                <span className="tabular-nums">{t.done}/{t.total}</span>
                {t.status === 'upcoming' && t.first && <span>{prettyDate(t.first)} 시작</span>}
                {t.status === 'active' && t.last && (
                  slip > 0
                    ? <span className="text-amber-700 dark:text-amber-400">밀린 {t.late}개 · 예상 완료 {prettyDate(t.projected!)} (+{slip}일, 계획 {prettyDate(t.last)})</span>
                    : <span>완료 예정 {prettyDate(t.last)}</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
