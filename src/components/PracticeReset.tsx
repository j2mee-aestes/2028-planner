import { useEffect, useState } from 'react';
import { exportJSON } from '../lib/backup';
import { kstToday, prettyDate } from '../lib/date';
import { useStore } from '../lib/store';
import { PLAN_START, PRACTICE_START } from '../seed/calendar';
import { Sheet, toast } from './ui';

/** 12/15 첫 실행 때: 연습 기간 기록 정리 (통계는 이미 12/15 부터 새로 집계됨) */
export function PracticeReset() {
  const { data, loaded, updateSettings, clearBefore } = useStore();
  const today = kstToday();
  const [open, setOpen] = useState(false);
  const has =
    Object.keys(data.days).some((k) => k < PLAN_START) ||
    Object.values(data.scores).some((s) => s.date < PLAN_START) ||
    Object.values(data.wrongs).some((w) => w.date < PLAN_START);

  useEffect(() => {
    if (loaded && today >= PLAN_START && !data.settings.practiceReset) {
      if (has) setOpen(true);
      else updateSettings((s) => ({ ...s, practiceReset: true }));
    }
  }, [loaded, today, data.settings.practiceReset, has]); // eslint-disable-line react-hooks/exhaustive-deps

  const reset = (backup: boolean) => {
    if (backup) exportJSON(data);
    clearBefore(PLAN_START);
    updateSettings((s) => ({ ...s, practiceReset: true }));
    setOpen(false);
    toast('연습 기록을 정리했어요. 2028 대비 시작!');
  };

  return (
    <Sheet open={open} onClose={() => setOpen(false)} title="2028 대비 플래너 시작">
      <div className="space-y-4">
        <p className="text-sm leading-relaxed">
          오늘부터 본 커리큘럼이 시작돼요. 연습 기간({prettyDate(PRACTICE_START)}~{prettyDate('2026-12-14')}) 기록은
          통계에서 이미 빠졌고, 아래 버튼으로 깨끗하게 정리할 수 있어요.
        </p>
        <ul className="rounded-2xl bg-zinc-100 px-4 py-3 text-sm dark:bg-zinc-800/60">
          <li>· 12/14 이전의 공부시간·체크·메모·회고</li>
          <li>· 12/14 이전 날짜의 성적·오답노트</li>
          <li className="muted">· 학교 일정·목표시간·알림 설정은 그대로 유지</li>
        </ul>
        <div className="grid gap-2">
          <button className="btn-primary py-3" onClick={() => reset(true)}>백업 받고 초기화</button>
          <button className="btn-outline py-3" onClick={() => { if (confirm('연습 기록을 모두 삭제할까요? 되돌릴 수 없어요.')) reset(false); }}>백업 없이 초기화</button>
          <button className="btn-ghost" onClick={() => setOpen(false)}>나중에 (다음에 다시 물어봐요)</button>
        </div>
      </div>
    </Sheet>
  );
}
