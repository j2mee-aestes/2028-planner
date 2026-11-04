import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { fmtClock, fmtHM } from '../lib/date';
import { elapsedMs, useTimer } from '../lib/timer';
import { SUBJECTS, subjectOf } from '../seed/subjects';
import { IconChevronDown, IconStop, IconTimer } from './icons';
import { inkVars, toast } from './ui';

const OPEN_EVENT = 'planner:focus-open';
/** 다른 곳(시작 버튼, 미니 바)에서 집중 화면 열기 */
export const openFocus = () => window.dispatchEvent(new Event(OPEN_EVENT));

/** 경과 시간을 보여주는 아날로그 시계 (분침·초침·시침 + 이번 시간 진행 호) */
function AnalogClock({ ms, color, ink, paused }: { ms: number; color: string; ink: string; paused: boolean }) {
  const sec = (ms / 1000) % 60;
  const min = (ms / 60000) % 60;
  const hrs = Math.floor(ms / 3600000);
  const R = 88;
  const C = 2 * Math.PI * R;
  const hand = (deg: number, len: number, w: number, c: string, tail = 0) => (
    <line x1="100" y1={100 + tail} x2="100" y2={100 - len} stroke={c} strokeWidth={w} strokeLinecap="round"
      transform={`rotate(${deg} 100 100)`} />
  );
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full drop-shadow-[0_20px_40px_rgba(0,0,0,0.12)]" role="img" aria-label={`경과 ${fmtClock(ms)}`}>
      <circle cx="100" cy="100" r="97" className="fill-white dark:fill-zinc-900" />
      <circle cx="100" cy="100" r={R} fill="none" strokeWidth="5" className="stroke-zinc-100 dark:stroke-zinc-800" />
      <circle cx="100" cy="100" r={R} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
        strokeDasharray={`${(min / 60) * C} ${C}`} transform="rotate(-90 100 100)" />
      {Array.from({ length: 60 }, (_, i) => {
        const major = i % 5 === 0;
        return (
          <line key={i} x1="100" y1={major ? 20 : 22} x2="100" y2="26" strokeWidth={major ? 1.6 : 0.8} strokeLinecap="round"
            className={major ? 'stroke-zinc-700 dark:stroke-zinc-300' : 'stroke-zinc-300 dark:stroke-zinc-600'} transform={`rotate(${i * 6} 100 100)`} />
        );
      })}
      {Array.from({ length: 12 }, (_, i) => {
        const a = ((i * 30 - 90) * Math.PI) / 180;
        return (
          <text key={i} x={100 + 63 * Math.cos(a)} y={100 + 63 * Math.sin(a) + 3.5} textAnchor="middle" fontSize="10"
            className="fill-zinc-500 dark:fill-zinc-400">{i === 0 ? 60 : i * 5}</text>
        );
      })}
      {hrs > 0 && <text x="100" y="134" textAnchor="middle" fontSize="11" className="fill-zinc-500 dark:fill-zinc-400">{hrs}시간 +</text>}
      <g className="text-zinc-900 dark:text-zinc-100">
        {hand(((ms / 3600000) % 12) * 30, 34, 5, 'currentColor')}
        {hand(min * 6, 56, 3.2, 'currentColor')}
      </g>
      {hand(sec * 6, 70, 1.3, ink, 14)}
      <circle cx="100" cy="100" r="4" fill={ink} />
      <circle cx="100" cy="100" r="1.6" className="fill-white dark:fill-zinc-900" />
      {paused && <text x="100" y="72" textAnchor="middle" fontSize="10" className="fill-zinc-500">일시정지</text>}
    </svg>
  );
}

/** 집중 타이머: 시작하면 전체 화면, 최소화하면 떠 있는 미니 바 */
export function FocusTimer() {
  const { rt, pause, resume, finish, discard, setSubject } = useTimer();
  const [open, setOpen] = useState(false);
  const [ask, setAsk] = useState(false);
  const [now, setNow] = useState(Date.now());
  const raf = useRef(0);
  const prevRunning = useRef(false);

  useEffect(() => {
    const f = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, f);
    return () => window.removeEventListener(OPEN_EVENT, f);
  }, []);

  // 다른 기기에서 시작된 타이머도 처음엔 미니 바로만 표시; 타이머가 끝나면 닫기
  useEffect(() => {
    if (!rt) { setOpen(false); setAsk(false); }
    prevRunning.current = !!rt;
  }, [rt]);

  // 부드러운 초침 (보이는 동안만)
  useEffect(() => {
    if (!rt || rt.pausedAt) { setNow(Date.now()); return; }
    let last = 0;
    const loop = (t: number) => {
      if (t - last > (open ? 50 : 1000)) { setNow(Date.now()); last = t; }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [rt, open]);

  // 공부 중엔 화면 꺼짐 방지
  useEffect(() => {
    if (!open || !rt || rt.pausedAt || !('wakeLock' in navigator)) return;
    let lock: any;
    (navigator as any).wakeLock.request('screen').then((l: any) => (lock = l)).catch(() => {});
    return () => { lock?.release?.(); };
  }, [open, rt]);

  if (!rt) return null;
  const s = subjectOf(rt.subject);
  const ms = elapsedMs(rt, now);

  const stop = () => { pause(); setAsk(true); };
  const keepGoing = () => { setAsk(false); resume(); };
  const quit = () => {
    const min = finish();
    setAsk(false);
    toast(min > 0 ? `${s.name} ${fmtHM(min)} 저장했어요` : '1분 미만이라 저장하지 않았어요');
  };

  if (!open)
    return createPortal(
      <button onClick={() => setOpen(true)}
        className="glass press fixed bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+4.75rem)] left-1/2 z-40 flex -translate-x-1/2 items-center gap-2.5 rounded-full border border-white/50 py-2 pl-3 pr-4 shadow-[0_8px_30px_rgba(0,0,0,0.14)] dark:border-zinc-700/50 md:bottom-6 md:left-auto md:right-6 md:translate-x-0">
        <span className={`h-2.5 w-2.5 rounded-full ${rt.pausedAt ? '' : 'animate-pulse'}`} style={{ background: s.color }} />
        <span className="text-sm">{s.name}</span>
        <span className="text-sm tabular-nums">{fmtClock(ms)}</span>
        {rt.pausedAt && <span className="text-xs muted">일시정지</span>}
      </button>,
      document.body,
    );

  return createPortal(
    <div className="focus-in fixed inset-0 z-[55] flex flex-col bg-[#f5f5f7]/95 backdrop-blur-2xl dark:bg-black/95"
      style={{ backgroundImage: `radial-gradient(60% 45% at 50% 42%, ${s.color}55, transparent 70%)` }}>
      <div className="flex items-center gap-2 px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <button className="icon-btn" onClick={() => setOpen(false)} aria-label="최소화"><IconChevronDown size={22} /></button>
        <select value={rt.subject} onChange={(e) => setSubject(e.target.value)} aria-label="과목"
          className="subj-ink press mx-auto appearance-none rounded-full bg-white/70 px-4 py-1.5 text-center text-sm outline-none dark:bg-zinc-800/70" style={inkVars(rt.subject)}>
          {SUBJECTS.filter((x) => x.active).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
        <span className="w-9 text-right text-xs tabular-nums muted">
          {new Date(now).toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false })}
        </span>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6">
        <div className="aspect-square w-[min(78vw,52vh,360px)]">
          <AnalogClock ms={ms} color={s.color} ink={s.ink} paused={!!rt.pausedAt} />
        </div>
        <div className="text-center">
          <div className="text-5xl tabular-nums tracking-tight">{fmtClock(ms)}</div>
          <div className="mt-1 text-sm muted">{rt.pausedAt ? '일시정지됨' : `${s.name} 공부 중`}</div>
        </div>
      </div>

      <div className="flex justify-center pb-[max(2.5rem,env(safe-area-inset-bottom))]">
        <button onClick={rt.pausedAt ? () => setAsk(true) : stop} aria-label="정지"
          className="press flex h-20 w-20 items-center justify-center rounded-full bg-zinc-900 text-white shadow-[0_10px_30px_rgba(0,0,0,0.25)] dark:bg-zinc-100 dark:text-zinc-900">
          <IconStop size={30} />
        </button>
      </div>

      {ask && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 p-6 backdrop-blur-sm">
          <div className="focus-dialog w-full max-w-xs rounded-[28px] bg-white/95 p-6 text-center shadow-2xl dark:bg-zinc-900/95" role="dialog" aria-modal>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: `${s.color}66` }}>
              <IconTimer size={24} />
            </div>
            <div className="text-lg">{s.name} {fmtHM(Math.round(ms / 60000))}</div>
            <p className="mt-1 text-sm muted">그만두면 {s.name} 공부시간으로 저장되고<br />통계·잔디·주간 회고에 바로 반영돼요.</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button className="btn-outline py-3" onClick={keepGoing}>계속하기</button>
              <button className="btn-primary py-3" onClick={quit}>그만두기</button>
            </div>
            <button className="mt-3 text-xs muted underline underline-offset-2"
              onClick={() => { if (confirm('이번 측정을 저장하지 않고 버릴까요?')) { discard(); toast('측정을 취소했어요'); } }}>
              저장하지 않고 버리기
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
