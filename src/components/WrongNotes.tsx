import { useMemo, useRef, useState } from 'react';
import { addDays, kstToday, prettyDate, uid } from '../lib/date';
import { compressImage } from '../lib/image';
import { doneIds } from '../lib/insights';
import { nextStudyDay } from '../lib/plan';
import { useStore } from '../lib/store';
import type { WrongNote } from '../lib/types';
import { SUBJECTS, subjectOf } from '../seed/subjects';
import { IconCalendar, IconClose, IconPlus, IconTrash } from './icons';
import { Check, Dot, inkVars, Sheet, SubjectSelect } from './ui';

/** 재풀이 i차 완료 여부: 해당 날짜(쉬는 날이면 다음 공부일) 체크 기록 */
export function useReviewDone() {
  const { data } = useStore();
  const done = useMemo(() => doneIds(data), [data]); // 다른 날로 옮겨서 체크한 경우 포함
  return (w: WrongNote, i: number) => done.has(`wrong-review:${w.id}-${i}`);
}

export function WrongNotesView() {
  const { data } = useStore();
  const [subject, setSubject] = useState('all');
  const [edit, setEdit] = useState<WrongNote | null>(null);
  const isDone = useReviewDone();
  const list = useMemo(
    () => Object.values(data.wrongs).filter((w) => subject === 'all' || w.subject === subject)
      .sort((a, b) => b.date.localeCompare(a.date) || a.exam.localeCompare(b.exam) || a.no - b.no),
    [data.wrongs, subject],
  );
  const groups = list.reduce<Record<string, WrongNote[]>>((g, w) => ((g[`${w.date}|${w.exam}`] ??= []).push(w), g), {});

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <select className="input w-32" value={subject} onChange={(e) => setSubject(e.target.value)}>
          <option value="all">전체 과목</option>
          {SUBJECTS.filter((s) => s.questions > 0).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <span className="self-center text-xs muted">{list.length}문항</span>
        <button className="btn-outline ml-auto" onClick={() => setEdit({ id: `w-${uid()}`, subject: subject === 'all' ? 'math' : subject, no: 1, exam: '', date: kstToday(), reviews: [addDays(kstToday(), 7), addDays(kstToday(), 30)] })}>
          <IconPlus size={15} />직접 추가
        </button>
      </div>
      {list.length === 0 && <p className="py-6 text-center text-sm muted">성적 입력에서 틀린 번호를 고르면 여기에 쌓입니다. 교재 문제는 '직접 추가'로.</p>}
      {Object.entries(groups).map(([k, ws]) => (
        <div key={k}>
          <div className="mb-1 text-xs muted">{prettyDate(k.split('|')[0])} · {k.split('|')[1]}</div>
          <ul className="card divide-y divide-zinc-100 dark:divide-zinc-800">
            {ws.map((w) => (
              <li key={w.id}>
                <button className="press flex w-full items-center gap-3 px-4 py-3 text-left" onClick={() => setEdit(w)}>
                  <span className="subj-ink w-14 shrink-0 text-lg tabular-nums" style={inkVars(w.subject)}>{w.no}번</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{w.memo || <span className="muted">메모 없음</span>}</span>
                    <span className="mt-0.5 flex gap-1.5 text-[11px] muted">
                      {subjectOf(w.subject).name}
                      {w.reviews.map((r, i) => <span key={i} className={isDone(w, i) ? 'text-zinc-900 dark:text-zinc-100' : ''}>{isDone(w, i) ? '✓' : '○'} {i + 1}차 {prettyDate(r)}</span>)}
                    </span>
                  </span>
                  {w.photo && <img src={w.photo} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {edit && <WrongNoteSheet note={edit} onClose={() => setEdit(null)} />}
    </div>
  );
}

function WrongNoteSheet({ note, onClose }: { note: WrongNote; onClose: () => void }) {
  const { data, plan, saveWrong, deleteWrong, updateDay } = useStore();
  const exists = !!data.wrongs[note.id];
  const [w, setW] = useState<WrongNote>(note);
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const isDone = useReviewDone();
  const save = () => {
    if (!w.exam.trim()) return alert('시험·교재명을 입력하세요');
    saveWrong({ ...w, reviews: [...w.reviews].filter(Boolean).sort() });
    onClose();
  };

  return (
    <Sheet open onClose={onClose} title={exists ? `${w.exam} ${w.no}번` : '오답 추가'}>
      <div className="space-y-3">
        <div className="grid grid-cols-[1fr_5rem] gap-2">
          <label><span className="label">시험·교재</span><input className="input" value={w.exam} placeholder="예: 이해원 N제 시즌1 대수" onChange={(e) => setW({ ...w, exam: e.target.value })} /></label>
          <label><span className="label">번호</span><input type="number" className="input" value={w.no} onChange={(e) => setW({ ...w, no: Number(e.target.value) })} /></label>
          <label><span className="label">과목</span><SubjectSelect value={w.subject} onChange={(v) => setW({ ...w, subject: v })} /></label>
          <label><span className="label">날짜</span><input type="date" className="input px-2" value={w.date} onChange={(e) => setW({ ...w, date: e.target.value })} /></label>
        </div>
        <label className="block">
          <span className="label">왜 틀렸나 · 다음엔 이렇게</span>
          <textarea className="input mt-1" rows={3} value={w.memo ?? ''} onChange={(e) => setW({ ...w, memo: e.target.value })} placeholder="개념 착각 / 계산 실수 / 시간 부족 …" />
        </label>
        <div>
          <span className="label">문제 사진</span>
          {w.photo ? (
            <div className="relative mt-1">
              <img src={w.photo} alt="문제 사진" className="max-h-72 w-full rounded-2xl object-contain bg-zinc-100 dark:bg-zinc-800" />
              <button className="icon-btn glass absolute right-2 top-2 h-8 w-8" onClick={() => setW({ ...w, photo: undefined })} aria-label="사진 삭제"><IconClose size={15} /></button>
            </div>
          ) : (
            <button className="btn-outline mt-1 w-full py-3" disabled={busy} onClick={() => file.current?.click()}>{busy ? '압축 중…' : '사진 찍기 · 앨범에서 선택'}</button>
          )}
          <input ref={file} type="file" accept="image/*" hidden onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            setBusy(true);
            try { setW((x) => ({ ...x, photo: undefined })); const url = await compressImage(f); setW((x) => ({ ...x, photo: url })); }
            catch (err: any) { alert(err.message); }
            setBusy(false);
          }} />
        </div>
        <div>
          <span className="label">재풀이 일정 (그날 할 일에 자동 추가)</span>
          <ul className="mt-1 space-y-1.5">
            {w.reviews.map((r, i) => (
              <li key={i} className="flex items-center gap-2">
                <Check checked={isDone(w, i)} label={`${i + 1}차 완료`} onChange={() => {
                  const d = nextStudyDay(plan, w.reviews[i]);
                  const id = `wrong-review:${w.id}-${i}`;
                  updateDay(d, (x) => { const checks = { ...x.checks }; if (checks[id]) delete checks[id]; else checks[id] = kstToday(); return { ...x, checks }; });
                }} />
                <span className="w-8 text-sm">{i + 1}차</span>
                <input type="date" className="input flex-1 px-2" value={r} onChange={(e) => setW({ ...w, reviews: w.reviews.map((x, j) => (j === i ? e.target.value : x)) })} />
                <button className="icon-btn h-8 w-8" onClick={() => setW({ ...w, reviews: w.reviews.filter((_, j) => j !== i) })} aria-label="일정 삭제"><IconClose size={15} /></button>
              </li>
            ))}
          </ul>
          <button className="btn-ghost mt-1 px-2 text-xs" onClick={() => setW({ ...w, reviews: [...w.reviews, addDays(w.reviews.at(-1) ?? kstToday(), 7)] })}>
            <IconCalendar size={14} />재풀이 추가
          </button>
        </div>
        <div className="flex items-center justify-between pt-1">
          {exists ? <button className="btn-ghost text-red-600 dark:text-red-400" onClick={() => { if (confirm('이 오답을 삭제할까요?')) { deleteWrong(w.id); onClose(); } }}><IconTrash size={15} />삭제</button> : <span />}
          <span className="flex items-center gap-2"><Dot subject={w.subject} /><button className="btn-primary px-5" onClick={save}>저장</button></span>
        </div>
      </div>
    </Sheet>
  );
}
