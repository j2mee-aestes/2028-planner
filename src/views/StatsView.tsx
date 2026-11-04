import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Heatmap } from '../components/Heatmap';
import { IconChevronLeft, IconChevronRight } from '../components/icons';
import { ProgressList } from '../components/ProgressList';
import { Segmented, Stat } from '../components/ui';
import { WeeklyReview } from '../components/WeeklyReview';
import { addDays, addMonths, eachDay, endOfMonth, fmtHM, fmtMin, kstToday, monthKey, startOfMonth, startOfWeek } from '../lib/date';
import { minutesBySubject, mockCountByMonth, tasksOf } from '../lib/stats';
import { useStore } from '../lib/store';
import { inPractice, PLAN_END, PLAN_START, statsStart } from '../seed/calendar';
import { SUBJECTS, subjectOf } from '../seed/subjects';

type Range = 'day' | 'week' | 'month';
const AXIS = { fontSize: 11, fill: '#94a3b8' };

export function ChartTooltip({ active, payload, label, unit = 'min', suffix = '' }: any) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p: any) => p.value);
  const total = rows.reduce((a: number, p: any) => a + p.value, 0);
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mb-1">{label}{suffix}{unit === 'min' && total ? ` · ${fmtHM(total * 60)}` : ''}</div>
      {rows.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-zinc-600 dark:text-zinc-300">{p.name}</span>
          <span className="ml-auto pl-3 tabular-nums">{unit === 'min' ? fmtHM(p.value * 60) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

export function StatsView() {
  const { data, plan } = useStore();
  const today = kstToday();
  const [range, setRange] = useState<Range>('day');
  const [rw, setRw] = useState(() => startOfWeek(kstToday()));
  const from = statsStart(today);
  const subs = SUBJECTS.filter((s) => s.active && (s.id !== 'etc' || Object.values(data.days).some((d) => d.logs?.some((l) => l.subject === 'etc'))));

  const buckets: { label: string; from: string; to: string }[] = [];
  if (range === 'day') for (let i = 13; i >= 0; i--) { const d = addDays(today, -i); buckets.push({ label: d.slice(5).replace('-', '/'), from: d, to: d }); }
  if (range === 'week') for (let i = 11; i >= 0; i--) { const s = addDays(startOfWeek(today), -7 * i); buckets.push({ label: s.slice(5).replace('-', '/') + '~', from: s, to: addDays(s, 6) }); }
  if (range === 'month') for (let m = startOfMonth(from); m <= PLAN_END; m = addMonths(m, 1)) buckets.push({ label: `${Number(m.slice(5, 7))}월`, from: m, to: endOfMonth(m) });

  const chart = buckets.map((b) => {
    const r = minutesBySubject(data.days, b.from, b.to);
    return { label: b.label, ...Object.fromEntries(subs.map((s) => [s.id, +((r[s.id] ?? 0) / 60).toFixed(2)])) };
  });

  const sumRange = (a: string, b: string) => Object.values(minutesBySubject(data.days, a, b)).reduce((x, y) => x + y, 0);
  const ws = startOfWeek(today);
  const completion = (a: string, b: string) => {
    let n = 0, done = 0;
    for (const d of eachDay(a, b)) {
      const ts = tasksOf(plan, d, data.days[d] ?? { checks: {}, edits: {}, custom: [], logs: [] });
      n += ts.length;
      done += ts.filter((t) => t.done).length;
    }
    return n ? Math.round((done / n) * 100) : 0;
  };
  const monthBySubject = minutesBySubject(data.days, startOfMonth(today), endOfMonth(today));
  const mocks = mockCountByMonth(data, plan, from);
  const mockMonths: string[] = [];
  for (let m = startOfMonth(from); m <= PLAN_END; m = addMonths(m, 1)) mockMonths.push(monthKey(m));
  const mockSubs = ['kor', 'eng', 'math', 'soc', 'sci', 'hist'];

  return (
    <div className="space-y-4">
      <h1 className="text-lg">통계</h1>
      {inPractice(today) && (
        <div className="rounded-2xl bg-zinc-900 px-4 py-3 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900">
          연습 기간이에요 · 지금 기록은 미리 써보는 용도이고, {Number(PLAN_START.slice(5, 7))}/{Number(PLAN_START.slice(8))}부터 통계가 새로 시작돼요.
        </div>
      )}
      <Heatmap />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="오늘" value={fmtMin(sumRange(today, today))} />
        <Stat label="이번 주" value={fmtMin(sumRange(ws, addDays(ws, 6)))} sub={`완료율 ${completion(ws, today)}%`} />
        <Stat label="이번 달" value={fmtMin(sumRange(startOfMonth(today), endOfMonth(today)))} sub={`완료율 ${completion(startOfMonth(today), today)}%`} />
        <Stat label="누적" value={fmtMin(sumRange(from, PLAN_END))} sub={inPractice(today) ? '연습 기간' : undefined} />
      </div>

      <section className="card p-3">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm">과목별 공부시간 (시간)</h2>
          <Segmented value={range} onChange={setRange} options={[['day', '일간'], ['week', '주간'], ['month', '월간']]} />
        </div>
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart data={chart} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#94a3b8" strokeOpacity={0.2} />
              <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: '#94a3b8', fillOpacity: 0.12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />
              {subs.map((s) => (
                <Bar key={s.id} dataKey={s.id} name={s.name} stackId="a" fill={s.color} stroke="var(--surface)" strokeWidth={1} maxBarSize={28} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card p-4">
        <div className="mb-3 flex items-center gap-1">
          <h2 className="flex-1 text-sm">주간 회고</h2>
          <button className="icon-btn h-8 w-8" onClick={() => setRw(addDays(rw, -7))} aria-label="이전 주"><IconChevronLeft size={18} /></button>
          <button className="icon-btn h-8 w-8" onClick={() => setRw(addDays(rw, 7))} aria-label="다음 주"><IconChevronRight size={18} /></button>
        </div>
        <WeeklyReview ws={rw} />
      </section>

      <ProgressList />

      <section className="card p-3">
        <h2 className="mb-2 text-sm">이번 달 과목별</h2>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
          {subs.map((s) => (
            <div key={s.id} className="flex items-center gap-2 text-sm">
              <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
              {s.name}
              <span className="ml-auto tabular-nums">{fmtMin(monthBySubject[s.id] ?? 0)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card overflow-x-auto p-3">
        <h2 className="mb-2 text-sm">월별 모의고사 진행 (체크 기준 자동 집계)</h2>
        <table className="w-full text-sm tabular-nums">
          <thead>
            <tr className="text-xs muted">
              <th className="py-1 text-left">월</th>
              {mockSubs.map((id) => <th key={id} className="px-2 text-right">{subjectOf(id).name}</th>)}
            </tr>
          </thead>
          <tbody>
            {mockMonths.map((m) => (
              <tr key={m} className={`border-t border-zinc-100 dark:border-zinc-800 ${m === monthKey(today) ? '' : ''}`}>
                <td className="py-1">{m.slice(0, 4)}.{m.slice(5)}</td>
                {mockSubs.map((id) => <td key={id} className="px-2 text-right">{mocks[m]?.[id] ?? '–'}</td>)}
              </tr>
            ))}
            <tr className="border-t-2 border-zinc-200 dark:border-zinc-700">
              <td className="py-1">합계</td>
              {mockSubs.map((id) => <td key={id} className="px-2 text-right">{Object.values(mocks).reduce((a, r) => a + (r[id] ?? 0), 0)}</td>)}
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}
