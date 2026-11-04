import { useState } from 'react';
import { addDays, kstToday, uid } from '../lib/date';
import { useStore } from '../lib/store';
import type { Score, SubjectScore } from '../lib/types';
import { SUBJECTS, subjectOf } from '../seed/subjects';
import { Check, inkVars, Sheet } from './ui';

const OFFICIAL_SUBJECTS = ['kor', 'math', 'eng', 'soc', 'sci', 'hist'];
const ORGS = ['평가원', '교육청', '사설', '기타'];

export function ScoreModal({ initial, onClose }: { initial: Partial<Score> | null; onClose: () => void }) {
  const { saveScore, deleteScore, saveWrong, deleteWrong, data } = useStore();
  const [autoReview, setAutoReview] = useState(true);
  const existing = initial?.id ? data.scores[initial.id] : undefined;
  const [s, setS] = useState<Score>(() => {
    const base: Score = existing ?? {
      id: uid(),
      type: initial?.type ?? 'self',
      org: initial?.org ?? (initial?.type === 'official' ? '평가원' : '사설'),
      name: initial?.name ?? '',
      date: initial?.date ?? kstToday(),
      taskId: initial?.taskId,
      subjects: initial?.subjects ?? {},
    };
    if (!Object.keys(base.subjects).length)
      for (const id of base.type === 'official' ? OFFICIAL_SUBJECTS : ['kor']) base.subjects[id] = { wrong: [] };
    return base;
  });
  const [addSub, setAddSub] = useState('');

  const setSub = (id: string, patch: Partial<SubjectScore>) =>
    setS((x) => ({ ...x, subjects: { ...x.subjects, [id]: { ...x.subjects[id], ...patch } } }));
  const num = (v: string) => (v === '' ? undefined : Number(v));
  const toggleWrong = (id: string, n: number) => {
    const w = s.subjects[id].wrong ?? [];
    setSub(id, { wrong: w.includes(n) ? w.filter((x) => x !== n) : [...w, n].sort((a, b) => a - b) });
  };
  const save = () => {
    if (!s.name.trim()) return alert('시험명을 입력하세요');
    saveScore(s);
    // 틀린 번호 → 오답노트 (재풀이 1주 뒤·1달 뒤)
    const keep = new Set<string>();
    for (const [sub, v] of Object.entries(s.subjects))
      for (const no of v.wrong ?? []) {
        const id = `${s.id}-${sub}-${no}`;
        keep.add(id);
        const w = data.wrongs[id];
        if (!w) saveWrong({ id, scoreId: s.id, subject: sub, no, exam: s.name, date: s.date, reviews: autoReview ? [addDays(s.date, 7), addDays(s.date, 30)] : [] });
        else if (w.exam !== s.name || w.date !== s.date) saveWrong({ ...w, exam: s.name, date: s.date });
      }
    for (const w of Object.values(data.wrongs))
      if (w.scoreId === s.id && !keep.has(w.id) && !w.memo && !w.photo) deleteWrong(w.id);
    onClose();
  };

  return (
    <Sheet open onClose={onClose} title={existing ? '성적 수정' : '성적 입력'}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <label className="col-span-2">
            <span className="label">시험명 (회차)</span>
            <input className="input" value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} placeholder="예: 2027년 3월 학평" />
          </label>
          <label>
            <span className="label">구분</span>
            <select className="input" value={s.type} onChange={(e) => setS({ ...s, type: e.target.value as Score['type'] })}>
              <option value="official">학교 응시 (평가원·교육청)</option>
              <option value="self">내가 푼 모고</option>
            </select>
          </label>
          <label>
            <span className="label">시행기관</span>
            <select className="input" value={s.org} onChange={(e) => setS({ ...s, org: e.target.value })}>
              {ORGS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </label>
          <label className="col-span-2">
            <span className="label">{s.type === 'official' ? '시행일' : '푼 날짜'}</span>
            <input type="date" className="input" value={s.date} onChange={(e) => setS({ ...s, date: e.target.value })} />
          </label>
        </div>

        {Object.entries(s.subjects).map(([id, v]) => {
          const sub = subjectOf(id);
          return (
            <div key={id} className="rounded-2xl bg-zinc-50 p-3 dark:bg-zinc-800/50">
              <div className="mb-2 flex items-center justify-between">
                <span className="subj-ink text-sm" style={inkVars(id)}>{sub.name}</span>
                <button
                  className="text-xs muted"
                  onClick={() => setS((x) => { const c = { ...x.subjects }; delete c[id]; return { ...x, subjects: c }; })}
                >
                  제거
                </button>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {(['raw', 'std', 'pct', 'grade'] as const).map((k) => (
                  <label key={k}>
                    <span className="label">{{ raw: '원점수', std: '표준', pct: '백분위', grade: '등급' }[k]}</span>
                    <input type="number" inputMode="numeric" className="input px-1.5" value={v[k] ?? ''} onChange={(e) => setSub(id, { [k]: num(e.target.value) })} />
                  </label>
                ))}
              </div>
              {sub.questions > 0 && (
                <div className="mt-2">
                  <span className="label">틀린 번호 ({v.wrong?.length ?? 0}개)</span>
                  <div className="mt-1 grid grid-cols-10 gap-1">
                    {Array.from({ length: sub.questions }, (_, i) => i + 1).map((n) => {
                      const on = v.wrong?.includes(n);
                      return (
                        <button
                          key={n}
                          onClick={() => toggleWrong(id, n)}
                          className={`press h-8 rounded-lg text-xs tabular-nums transition-colors ${on ? 'text-white' : 'bg-zinc-100 dark:bg-zinc-800'}`}
                          style={on ? { background: sub.ink } : undefined}
                        >
                          {n}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        <div className="flex gap-2">
          <select className="input flex-1" value={addSub} onChange={(e) => setAddSub(e.target.value)}>
            <option value="">과목 추가…</option>
            {SUBJECTS.filter((x) => x.questions > 0 && !s.subjects[x.id]).map((x) => (
              <option key={x.id} value={x.id}>{x.name}</option>
            ))}
          </select>
          <button className="btn-outline" disabled={!addSub} onClick={() => { setSub(addSub, { wrong: [] }); setAddSub(''); }}>추가</button>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Check checked={autoReview} onChange={() => setAutoReview(!autoReview)} label="재풀이 자동 추가" />
          틀린 문항을 오답노트에 넣고 1주 뒤·1달 뒤 재풀이 할 일 추가
        </label>
        <textarea className="input" rows={2} placeholder="메모" value={s.memo ?? ''} onChange={(e) => setS({ ...s, memo: e.target.value })} />
        <div className="flex justify-between">
          {existing ? (
            <button className="btn-ghost text-red-600 dark:text-red-400" onClick={() => { if (confirm('삭제할까요?')) { deleteScore(s.id); for (const w of Object.values(data.wrongs)) if (w.scoreId === s.id && !w.memo && !w.photo) deleteWrong(w.id); onClose(); } }}>삭제</button>
          ) : <span />}
          <button className="btn-primary px-5" onClick={save}>저장</button>
        </div>
      </div>
    </Sheet>
  );
}
