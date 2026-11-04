import { useEffect, useState } from 'react';
import { fmtClock } from '../lib/date';
import { elapsedMs, useTimer } from '../lib/timer';
import { subjectOf } from '../seed/subjects';
import { openFocus } from './FocusTimer';
import { IconPlay } from './icons';
import { SubjectSelect } from './ui';

/** 하루 상세의 타이머 칸: 시작하면 집중 화면이 열림 */
export function Timer({ defaultSubject = 'math' }: { defaultSubject?: string }) {
  const { rt, start } = useTimer();
  const [subject, setSubject] = useState(defaultSubject);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!rt || rt.pausedAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [rt]);

  if (rt) {
    const s = subjectOf(rt.subject);
    return (
      <button onClick={openFocus} className="press flex w-full items-center gap-3 rounded-2xl p-3.5 text-left text-zinc-900" style={{ background: s.color }}>
        <span className="flex-1">
          <span className="block text-xs opacity-70">{rt.pausedAt ? '일시정지됨' : `${s.name} 공부 중`}</span>
          <span className="text-2xl tabular-nums">{fmtClock(elapsedMs(rt, now))}</span>
        </span>
        <span className="rounded-full bg-zinc-900 px-4 py-2 text-sm text-white">열기</span>
      </button>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <SubjectSelect value={subject} onChange={setSubject} className="flex-1" />
      <button className="btn-primary" onClick={() => { start(subject); openFocus(); }}><IconPlay size={14} />시작</button>
    </div>
  );
}
