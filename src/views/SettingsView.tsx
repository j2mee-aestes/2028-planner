import { useRef, useState } from 'react';
import { exportJSON, readBackup } from '../lib/backup';
import { prettyDate } from '../lib/date';
import { firebaseEnabled, logout } from '../lib/firebase';
import { useStore } from '../lib/store';
import type { SchoolCalendar } from '../lib/types';
import { PLAN_END, PLAN_START } from '../seed/calendar';
import { subjectOf } from '../seed/subjects';

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input type="date" className="input" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function DateList({ title, items, onChange, withName }: {
  title: string; items: { date: string; name?: string }[]; withName?: boolean;
  onChange: (v: { date: string; name: string }[]) => void;
}) {
  const [d, setD] = useState('');
  const [n, setN] = useState('');
  return (
    <div>
      <div className="label mb-1">{title}</div>
      <div className="flex gap-1.5">
        <input type="date" className="input" value={d} onChange={(e) => setD(e.target.value)} />
        {withName && <input className="input" placeholder="이름" value={n} onChange={(e) => setN(e.target.value)} />}
        <button className="btn-outline shrink-0" disabled={!d}
          onClick={() => { onChange([...items.map((x) => ({ date: x.date, name: x.name ?? '' })), { date: d, name: n || '휴일' }]); setD(''); setN(''); }}>
          추가
        </button>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {items.map((x) => (
          <span key={x.date} className="inline-flex items-center gap-1 rounded-full bg-slate-100 py-0.5 pl-2 pr-1 text-xs dark:bg-slate-800">
            {prettyDate(x.date)}{x.name ? ` ${x.name}` : ''}
            <button className="px-1 muted" onClick={() => onChange(items.filter((y) => y.date !== x.date).map((y) => ({ date: y.date, name: y.name ?? '' })))}>✕</button>
          </span>
        ))}
      </div>
    </div>
  );
}

export function SettingsView({ email }: { email?: string | null }) {
  const { data, plan, updateSettings, replaceAll } = useStore();
  const s = data.settings;
  const [school, setSchool] = useState<SchoolCalendar>(s.school);
  const dirty = JSON.stringify(school) !== JSON.stringify(s.school);
  const file = useRef<HTMLInputElement>(null);
  const [theme, setThemeState] = useState(() => { try { return localStorage.getItem('theme') || 'system'; } catch { return 'system'; } });

  const setTheme = (t: string) => {
    setThemeState(t);
    try { localStorage.setItem('theme', t); } catch {}
    const dark = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
  };

  const offList = [...plan.off.entries()].filter(([d]) => d >= PLAN_START && d <= PLAN_END).sort();

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">설정</h1>

      <section className="card space-y-3 p-3">
        <h2 className="text-sm font-bold">학교 일정</h2>
        <div className="grid grid-cols-2 gap-2">
          <Field label="겨울방학 마지막 날" value={school.winterEnd} onChange={(v) => setSchool({ ...school, winterEnd: v })} />
          <Field label="1학기 개학" value={school.sem1Start} onChange={(v) => setSchool({ ...school, sem1Start: v })} />
          <Field label="여름방학 시작" value={school.summerStart} onChange={(v) => setSchool({ ...school, summerStart: v })} />
          <Field label="여름방학 끝" value={school.summerEnd} onChange={(v) => setSchool({ ...school, summerEnd: v })} />
          <Field label="2학기 개학" value={school.sem2Start} onChange={(v) => setSchool({ ...school, sem2Start: v })} />
          <label className="block">
            <span className="label">내신기간 시작 (시험 몇 주 전)</span>
            <input type="number" min={0} max={8} className="input" value={school.examLeadDays / 7}
              onChange={(e) => setSchool({ ...school, examLeadDays: Math.max(0, Number(e.target.value)) * 7 })} />
          </label>
        </div>
        <div className="space-y-2">
          <div className="label">내신 시험</div>
          {school.exams.map((e, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto] gap-1.5 rounded-lg border p-2 dark:border-slate-800">
              <input className="input" value={e.name} onChange={(ev) => setSchool({ ...school, exams: school.exams.map((x, j) => (j === i ? { ...x, name: ev.target.value } : x)) })} />
              <button className="btn-ghost text-red-600" onClick={() => setSchool({ ...school, exams: school.exams.filter((_, j) => j !== i) })}>삭제</button>
              <div className="col-span-2 grid grid-cols-2 gap-1.5">
                <Field label="시험 시작" value={e.start} onChange={(v) => setSchool({ ...school, exams: school.exams.map((x, j) => (j === i ? { ...x, start: v } : x)) })} />
                <Field label="시험 끝" value={e.end} onChange={(v) => setSchool({ ...school, exams: school.exams.map((x, j) => (j === i ? { ...x, end: v } : x)) })} />
              </div>
            </div>
          ))}
          <button className="btn-outline" onClick={() => setSchool({ ...school, exams: [...school.exams, { name: '시험', start: s.school.sem1Start, end: s.school.sem1Start }] })}>+ 시험 추가</button>
        </div>
        <div className="flex justify-end gap-2">
          {dirty && <button className="btn-ghost" onClick={() => setSchool(s.school)}>되돌리기</button>}
          <button className="btn-primary" disabled={!dirty} onClick={() => updateSettings((x) => ({ ...x, school }))}>저장 · 커리 재배치</button>
        </div>
        <p className="text-xs muted">저장하면 커리가 새 일정에 맞게 다시 배치됩니다. 체크 기록은 항목별로 유지됩니다.</p>
      </section>

      <section className="card space-y-2 p-3">
        <h2 className="text-sm font-bold">하루 목표 시간</h2>
        <div className="grid grid-cols-2 gap-2">
          {(['weekday', 'weekend'] as const).map((k) => (
            <label key={k}>
              <span className="label">{k === 'weekday' ? '평일 (시간)' : '주말 (시간)'}</span>
              <input type="number" step={0.5} className="input" value={s.targets[k] / 60}
                onChange={(e) => updateSettings((x) => ({ ...x, targets: { ...x.targets, [k]: Math.round(Number(e.target.value) * 60) } }))} />
            </label>
          ))}
        </div>
      </section>

      <section className="card space-y-3 p-3">
        <h2 className="text-sm font-bold">휴일 · 공부 금지일</h2>
        <DateList title="임시공휴일 추가 (연휴 규칙 적용)" withName items={s.extraHolidays}
          onChange={(v) => updateSettings((x) => ({ ...x, extraHolidays: v }))} />
        <DateList title="추가 휴무일 (무조건 쉼)" items={s.extraOff.map((date) => ({ date }))}
          onChange={(v) => updateSettings((x) => ({ ...x, extraOff: v.map((y) => y.date) }))} />
        <DateList title="강제 공부일 (규칙상 쉬는 날이지만 공부)" items={s.extraStudy.map((date) => ({ date }))}
          onChange={(v) => updateSettings((x) => ({ ...x, extraStudy: v.map((y) => y.date) }))} />
        <details>
          <summary className="cursor-pointer text-xs font-medium muted">계산된 공부 금지일 {offList.length}일 보기</summary>
          <ul className="mt-1 grid grid-cols-1 gap-0.5 text-xs sm:grid-cols-2">
            {offList.map(([d, r]) => <li key={d}><b>{prettyDate(d)}</b> {r}</li>)}
          </ul>
        </details>
      </section>

      <section className="card p-3">
        <h2 className="mb-2 text-sm font-bold">커리 배치 현황</h2>
        <p className="mb-2 text-xs muted">교재·분량 수정은 src/seed/curriculum/*.ts 에서 (README 참고). 미배정이 있으면 기간 안에 다 못 들어간 것입니다.</p>
        <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
          {plan.stats.map(({ track, total, assigned, first, last }) => (
            <li key={track.id} className="flex items-center gap-2 py-1.5">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: subjectOf(track.subject).color }} />
              <span className="min-w-0 flex-1 truncate">{track.title}{track.tentative ? ' (미확정)' : ''}</span>
              <span className="text-xs tabular-nums muted">{first ? `${prettyDate(first)}~${prettyDate(last!)}` : '-'}</span>
              <span className={`w-14 text-right text-xs tabular-nums ${assigned < total ? 'font-bold text-amber-600' : 'muted'}`}>{assigned}/{total}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card space-y-2 p-3">
        <h2 className="text-sm font-bold">백업</h2>
        <div className="flex gap-2">
          <button className="btn-outline" onClick={() => exportJSON(data)}>JSON 내보내기</button>
          <button className="btn-outline" onClick={() => file.current?.click()}>JSON 가져오기</button>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            try {
              const d = await readBackup(f);
              if (confirm(`백업(${Object.keys(d.days).length}일, 성적 ${Object.keys(d.scores).length}건)으로 덮어쓸까요? 현재 데이터 중 백업에 없는 날짜는 유지됩니다.`)) {
                await replaceAll({ settings: d.settings, days: { ...data.days, ...d.days }, scores: { ...data.scores, ...d.scores } });
                alert('가져오기 완료');
              }
            } catch (err: any) { alert(err.message); }
          }} />
        </div>
      </section>

      <section className="card space-y-2 p-3">
        <h2 className="text-sm font-bold">화면 · 계정</h2>
        <div className="flex gap-1.5">
          {[['system', '시스템'], ['light', '라이트'], ['dark', '다크']].map(([v, l]) => (
            <button key={v} className={theme === v ? 'btn-primary' : 'btn-outline'} onClick={() => setTheme(v)}>{l}</button>
          ))}
        </div>
        {firebaseEnabled ? (
          <div className="flex items-center justify-between text-sm">
            <span className="muted">{email}</span>
            <button className="btn-outline" onClick={() => logout()}>로그아웃</button>
          </div>
        ) : (
          <p className="text-xs text-amber-600">로컬 모드: Firebase 미설정 상태라 이 브라우저에만 저장됩니다. README의 배포 가이드를 따라 설정하세요.</p>
        )}
      </section>
    </div>
  );
}
