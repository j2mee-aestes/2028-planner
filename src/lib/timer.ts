import { kstDateOf, uid } from './date';
import { useStore } from './store';
import type { Settings } from './types';

type RT = NonNullable<Settings['runningTimer']>;

/** 일시정지 시간을 뺀 순수 경과 시간(ms) */
export const elapsedMs = (rt: RT, now = Date.now()) => (rt.accum ?? 0) + (rt.pausedAt ? 0 : Math.max(0, now - rt.startedAt));

export function useTimer() {
  const { data, updateSettings, updateDay } = useStore();
  const rt = data.settings.runningTimer;

  const start = (subject: string) =>
    updateSettings((s) => ({ ...s, runningTimer: { subject, startedAt: Date.now(), firstStart: Date.now(), accum: 0, pausedAt: null } }));

  const pause = () => {
    if (!rt || rt.pausedAt) return;
    const now = Date.now();
    updateSettings((s) => ({ ...s, runningTimer: { ...rt, accum: elapsedMs(rt, now), pausedAt: now } }));
  };

  const resume = () => {
    if (!rt || !rt.pausedAt) return;
    updateSettings((s) => ({ ...s, runningTimer: { ...rt, startedAt: Date.now(), pausedAt: null } }));
  };

  /** 그만두기: 과목 시간으로 저장 → 일간·주간·월간 통계, 잔디, 주간 회고, 타임라인에 자동 반영. 저장한 분 반환 */
  const finish = () => {
    if (!rt) return 0;
    const end = Date.now();
    const min = Math.round(elapsedMs(rt, end) / 60000);
    const start = rt.firstStart ?? rt.startedAt;
    if (min > 0)
      updateDay(kstDateOf(start), (d) => ({ ...d, logs: [...d.logs, { id: uid(), subject: rt.subject, min, start, end, src: 'timer' }] }));
    updateSettings((s) => ({ ...s, runningTimer: null }));
    return min;
  };

  const discard = () => updateSettings((s) => ({ ...s, runningTimer: null }));
  const setSubject = (subject: string) => rt && updateSettings((s) => ({ ...s, runningTimer: { ...rt, subject } }));

  return { rt, start, pause, resume, finish, discard, setSubject };
}
