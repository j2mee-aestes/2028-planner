import { useEffect, useMemo, useRef, useState } from 'react';
import { addDays, eachDay, fmtHM, kstToday, prettyDate, startOfWeek } from '../lib/date';
import { streaks } from '../lib/insights';
import { dayMinutes } from '../lib/stats';
import { useStore } from '../lib/store';
import { PLAN_END, PLAN_START } from '../seed/calendar';

// 단일 색조(모노톤) 순차 단계: 0, ~2h, ~4h, ~6h, 6h+
const LEVELS = [0, 120, 240, 360];
const level = (m: number) => (m <= 0 ? 0 : LEVELS.filter((x) => m > x).length);

export function Heatmap() {
  const { data, plan } = useStore();
  const today = kstToday();
  const [sel, setSel] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const s = useMemo(() => streaks(data, plan, today), [data, plan, today]);

  const weeks = useMemo(() => {
    const out: string[][] = [];
    for (let w = startOfWeek(PLAN_START); w <= PLAN_END; w = addDays(w, 7)) out.push([...eachDay(w, addDays(w, 6))]);
    return out;
  }, []);

  useEffect(() => {
    const el = box.current?.querySelector<HTMLElement>('[data-today]');
    if (el && box.current) box.current.scrollLeft = el.offsetLeft - box.current.clientWidth / 2;
  }, []);

  const info = sel ?? today;
  return (
    <section className="card p-4">
      <div className="mb-3 flex flex-wrap items-end gap-x-6 gap-y-2">
        <div>
          <div className="label">연속 공부</div>
          <div className="text-3xl tabular-nums">{s.current}<span className="ml-0.5 text-base muted">일</span></div>
        </div>
        <div>
          <div className="label">최장 기록</div>
          <div className="text-xl tabular-nums">{s.best}<span className="ml-0.5 text-sm muted">일</span></div>
        </div>
        <div>
          <div className="label">공부한 날</div>
          <div className="text-xl tabular-nums">{s.studied}<span className="text-sm muted"> / {s.studyDays}일</span></div>
        </div>
      </div>
      <div ref={box} className="overflow-x-auto pb-1 [scrollbar-width:thin]">
        <div className="flex gap-[3px]">
          {weeks.map((wk) => (
            <div key={wk[0]} className="flex flex-col gap-[3px]">
              <div className="h-3 text-[9px] leading-3 muted">{wk.some((d) => d.endsWith('-01') || d === PLAN_START) ? `${Number((wk.find((d) => d.endsWith('-01')) ?? PLAN_START).slice(5, 7))}월` : ''}</div>
              {wk.map((d) => {
                const out = d < PLAN_START || d > PLAN_END;
                const m = dayMinutes(data.days[d]);
                const off = plan.off.has(d);
                return (
                  <button key={d} data-today={d === today ? '' : undefined} disabled={out}
                    onClick={() => setSel(d)} title={`${prettyDate(d)} ${fmtHM(m)}`} aria-label={`${prettyDate(d)} ${fmtHM(m)}`}
                    className={`hm h-[13px] w-[13px] rounded-[3px] ${out ? 'invisible' : `hm-${level(m)}`} ${off && !m ? 'hm-off' : ''} ${d === today ? 'ring-1 ring-zinc-900 ring-offset-1 dark:ring-zinc-100 dark:ring-offset-zinc-900' : ''} ${sel === d ? 'outline outline-2 outline-offset-1 outline-zinc-400' : ''}`} />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs muted">
        <span>{prettyDate(info)} · {fmtHM(dayMinutes(data.days[info]))}{plan.off.has(info) ? ' · 휴' : ''}</span>
        <span className="ml-auto flex items-center gap-1">0
          {[0, 1, 2, 3, 4].map((l) => <span key={l} className={`hm-${l} h-[11px] w-[11px] rounded-[3px]`} />)}6h+
        </span>
      </div>
    </section>
  );
}
