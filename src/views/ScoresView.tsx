import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ScoreModal } from '../components/ScoreModal';
import { inkVars, Segmented } from '../components/ui';
import { monthKey } from '../lib/date';
import { useStore } from '../lib/store';
import type { Score } from '../lib/types';
import { SUBJECTS, subjectOf } from '../seed/subjects';
import { ChartTooltip } from './StatsView';

type Tab = 'official' | 'self';
type Filter = 'all' | Tab;
const AXIS = { fontSize: 11, fill: '#94a3b8' };

export function ScoresView() {
  const { data } = useStore();
  const [tab, setTab] = useState<Tab>('official');
  const [edit, setEdit] = useState<Partial<Score> | null>(null);
  const [subject, setSubject] = useState('kor');
  const [filter, setFilter] = useState<Filter>('all');

  const all = Object.values(data.scores).sort((a, b) => b.date.localeCompare(a.date));
  const list = all.filter((s) => s.type === tab);
  const byMonth = list.reduce<Record<string, Score[]>>((a, s) => ((a[monthKey(s.date)] ??= []).push(s), a), {});

  const sub = subjectOf(subject);
  const pool = all.filter((s) => (filter === 'all' || s.type === filter) && s.subjects[subject]);

  const trend = useMemo(() => {
    const m: Record<string, number[]> = {};
    for (const s of pool) { const r = s.subjects[subject].raw; if (r != null) (m[monthKey(s.date)] ??= []).push(r); }
    return Object.keys(m).sort().map((k) => ({
      label: `${k.slice(2, 4)}.${k.slice(5)}`,
      avg: +(m[k].reduce((a, b) => a + b, 0) / m[k].length).toFixed(1),
      n: m[k].length,
    }));
  }, [pool, subject]);

  const freq = useMemo(() => {
    const c = Array.from({ length: sub.questions }, (_, i) => ({ label: String(i + 1), count: 0 }));
    for (const s of pool) for (const w of s.subjects[subject].wrong ?? []) if (c[w - 1]) c[w - 1].count++;
    return c;
  }, [pool, subject, sub.questions]);
  const top = [...freq].filter((x) => x.count).sort((a, b) => b.count - a.count).slice(0, 8);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">성적</h1>
        <button className="btn-primary" onClick={() => setEdit({ type: tab })}>+ 성적 입력</button>
      </div>
      <Segmented value={tab} onChange={setTab} options={[['official', '학교 응시 (평가원·교육청)'], ['self', '내가 푼 모고']]} />

      <section className="space-y-3">
        {list.length === 0 && <p className="text-sm muted">기록이 없습니다. 모고 항목을 체크하면 점수 입력창이 열립니다.</p>}
        {Object.entries(byMonth).map(([m, ss]) => (
          <div key={m}>
            <div className="mb-1 text-xs font-semibold muted">{m.replace('-', '년 ')}월 · {ss.length}회</div>
            <ul className="card divide-y divide-zinc-100 dark:divide-zinc-800">
              {ss.map((s) => (
                <li key={s.id}>
                  <button className="w-full px-3 py-2 text-left" onClick={() => setEdit(s)}>
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium">{s.name}</span>
                      <span className="text-xs muted">{s.org} · {s.date.slice(5)}</span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs">
                      {Object.entries(s.subjects).map(([id, v]) => (
                        <span key={id}>
                          <b className="subj-ink" style={inkVars(id)}>{subjectOf(id).short}</b>{' '}
                          {v.raw ?? '-'}점{v.grade ? ` ${v.grade}등급` : ''}{v.wrong?.length ? ` · 오답 ${v.wrong.length}` : ''}
                        </span>
                      ))}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="card space-y-3 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-bold">점검</h2>
          <select className="input w-28" value={subject} onChange={(e) => setSubject(e.target.value)}>
            {SUBJECTS.filter((s) => s.questions > 0).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <Segmented value={filter} onChange={setFilter} options={[['all', '전체'], ['official', '학교'], ['self', '자습']]} />
          <span className="text-xs muted">{pool.length}회</span>
        </div>

        <div>
          <div className="label mb-1">{sub.name} 월별 평균 원점수</div>
          <div className="h-48">
            {trend.length ? (
              <ResponsiveContainer>
                <LineChart data={trend} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#94a3b8" strokeOpacity={0.2} />
                  <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
                  <YAxis tick={AXIS} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                  <Tooltip content={<ChartTooltip unit="pt" />} />
                  <Line dataKey="avg" name="평균 점수" stroke={sub.color} strokeWidth={2} dot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface)', fill: sub.color }} />
                </LineChart>
              </ResponsiveContainer>
            ) : <p className="pt-6 text-center text-sm muted">점수 기록이 없습니다</p>}
          </div>
        </div>

        <div>
          <div className="label mb-1">{sub.name} 틀린 번호 빈도</div>
          <div className="h-44">
            <ResponsiveContainer>
              <BarChart data={freq} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#94a3b8" strokeOpacity={0.2} />
                <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} interval={sub.questions > 30 ? 4 : 1} />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip unit="회" suffix="번" />} cursor={{ fill: '#94a3b8', fillOpacity: 0.12 }} />
                <Bar dataKey="count" name="오답 횟수" fill={sub.color} radius={[4, 4, 0, 0]} maxBarSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {top.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
              <span className="muted">자주 틀린 번호</span>
              {top.map((t) => <span key={t.label} className="rounded bg-zinc-100 px-1.5 py-0.5 font-medium dark:bg-zinc-800">{t.label}번 ×{t.count}</span>)}
            </div>
          )}
        </div>
      </section>

      {edit && <ScoreModal initial={edit} onClose={() => setEdit(null)} />}
    </div>
  );
}
