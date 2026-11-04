import { useMemo } from 'react';
import { addDays, fmtHM, fmtMin, prettyDate } from '../lib/date';
import { weekSummary } from '../lib/insights';
import { useStore } from '../lib/store';
import { SUBJECTS } from '../seed/subjects';

/** 주간 회고: ws = 그 주 일요일. 회고 한 줄은 그 주 토요일 기록에 저장 */
export function WeeklyReview({ ws }: { ws: string }) {
  const { data, plan, day, updateDay } = useStore();
  const sat = addDays(ws, 6);
  const cur = useMemo(() => weekSummary(data, plan, ws), [data, plan, ws]);
  const prev = useMemo(() => weekSummary(data, plan, addDays(ws, -7)), [data, plan, ws]);
  const diff = cur.min - prev.min;
  const rate = cur.n ? Math.round((cur.done / cur.n) * 100) : 0;
  const maxMin = Math.max(1, ...Object.values(cur.bySubject).map((b) => b.min));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-zinc-100 p-3 dark:bg-zinc-800/60">
          <div className="label">공부시간</div>
          <div className="text-xl tabular-nums">{fmtMin(cur.min)}</div>
          <div className="text-[11px] muted">목표 {fmtMin(cur.target)}</div>
        </div>
        <div className="rounded-2xl bg-zinc-100 p-3 dark:bg-zinc-800/60">
          <div className="label">완료율</div>
          <div className="text-xl tabular-nums">{rate}%</div>
          <div className="text-[11px] muted">{cur.done}/{cur.n}개</div>
        </div>
        <div className="rounded-2xl bg-zinc-100 p-3 dark:bg-zinc-800/60">
          <div className="label">지난주 대비</div>
          <div className="text-xl tabular-nums">{diff >= 0 ? '+' : '−'}{fmtMin(Math.abs(diff))}</div>
          <div className="text-[11px] muted">지난주 {fmtMin(prev.min)}</div>
        </div>
      </div>

      <div>
        <div className="label mb-2">과목별 시간 · 완료</div>
        <ul className="space-y-2">
          {SUBJECTS.filter((s) => cur.bySubject[s.id]).map((s) => {
            const b = cur.bySubject[s.id];
            return (
              <li key={s.id} className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-2 text-sm">
                <span>{s.name}</span>
                <span className="h-2.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <span className="block h-full rounded-full" style={{ width: `${(b.min / maxMin) * 100}%`, background: s.color }} />
                </span>
                <span className="w-24 text-right text-xs tabular-nums muted">{fmtHM(b.min)} · {b.done}/{b.n}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <label className="block">
        <span className="label">한 줄 회고 · {prettyDate(ws)}~{prettyDate(sat)}</span>
        <textarea className="input mt-1" rows={2} placeholder="이번 주 잘한 점 / 다음 주 바꿀 점"
          value={day(sat).review ?? ''} onChange={(e) => updateDay(sat, (d) => ({ ...d, review: e.target.value }))} />
      </label>
    </div>
  );
}
