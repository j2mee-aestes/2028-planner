import { useEffect, useState } from 'react';
import { fmtClock, kstDateOf, uid } from '../lib/date';
import { useStore } from '../lib/store';
import { subjectOf } from '../seed/subjects';
import { IconPlay, IconStop } from './icons';
import { SubjectSelect } from './ui';

export function Timer({ defaultSubject = 'math' }: { defaultSubject?: string }) {
  const { data, updateSettings, updateDay } = useStore();
  const running = data.settings.runningTimer;
  const [subject, setSubject] = useState(defaultSubject);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running]);

  const start = () => updateSettings((s) => ({ ...s, runningTimer: { subject, startedAt: Date.now() } }));
  const stop = () => {
    if (!running) return;
    const end = Date.now();
    const min = Math.round((end - running.startedAt) / 60000);
    if (min > 0)
      updateDay(kstDateOf(running.startedAt), (d) => ({
        ...d,
        logs: [...d.logs, { id: uid(), subject: running.subject, min, start: running.startedAt, end, src: 'timer' }],
      }));
    updateSettings((s) => ({ ...s, runningTimer: null }));
  };
  const cancel = () => confirm('타이머를 기록 없이 취소할까요?') && updateSettings((s) => ({ ...s, runningTimer: null }));

  if (running) {
    const s = subjectOf(running.subject);
    return (
      <div className="flex items-center gap-3 rounded-2xl p-4 text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]" style={{ background: s.color }}>
        <div className="flex-1">
          <div className="text-xs opacity-90">{s.name} 공부 중</div>
          <div className="text-3xl tabular-nums tracking-tight">{fmtClock(now - running.startedAt)}</div>
        </div>
        <button className="btn bg-white/40 hover:bg-white/60" onClick={cancel}>취소</button>
        <button className="btn bg-zinc-900 text-white" onClick={stop}><IconStop size={15} />정지</button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <SubjectSelect value={subject} onChange={setSubject} className="flex-1" />
      <button className="btn-primary" onClick={start}><IconPlay size={14} />시작</button>
    </div>
  );
}
