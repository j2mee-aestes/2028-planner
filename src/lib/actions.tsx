import { useMemo, useState } from 'react';
import { ScoreModal } from '../components/ScoreModal';
import { kstToday, uid } from './date';
import type { DayTask, PostponedItem } from './stats';
import { useStore } from './store';
import type { Score } from './types';

const SCORED = ['kor', 'eng', 'math', 'soc', 'sci', 'hist'];

/** 체크·미루기·복원·완전삭제 + 모고 점수 입력창. DayDetail, 주간 보드, 미룬 할 일 시트에서 공용 */
export function useTaskActions() {
  const { data, day, updateDay } = useStore();
  const [score, setScore] = useState<Partial<Score> | null>(null);
  const today = kstToday();

  const scoreByTask = useMemo(() => {
    const m: Record<string, Score> = {};
    for (const s of Object.values(data.scores)) if (s.taskId) m[s.taskId] = s;
    return m;
  }, [data.scores]);

  const toggle = (t: DayTask, date: string) => {
    const wasDone = !!day(date).checks[t.id];
    updateDay(date, (d) => {
      const checks = { ...d.checks };
      if (wasDone) delete checks[t.id];
      else checks[t.id] = today;
      return { ...d, checks };
    });
    if (!wasDone && t.kind === 'mock' && !scoreByTask[t.id] && SCORED.includes(t.subject))
      setScore({ type: 'self', org: t.plan?.org ?? '사설', name: t.title, date: today, taskId: t.id, subjects: { [t.subject]: { wrong: [] } } });
  };

  const openScore = (t: DayTask) =>
    setScore(scoreByTask[t.id] ?? { type: 'self', name: t.title, taskId: t.id, org: t.plan?.org, subjects: { [t.subject]: { wrong: [] } } });

  const rename = (t: DayTask, date: string, title: string) =>
    updateDay(date, (d) =>
      t.custom
        ? { ...d, custom: d.custom.map((c) => (c.id === t.id ? { ...c, title } : c)) }
        : { ...d, edits: { ...d.edits, [t.id]: { ...d.edits[t.id], title } } },
    );

  /** 쓰레기통 1번: 미룬 할 일로 이동 */
  const postpone = (t: DayTask, date: string) =>
    updateDay(date, (d) =>
      t.custom
        ? { ...d, custom: d.custom.map((c) => (c.id === t.id ? { ...c, postponed: today } : c)) }
        : { ...d, edits: { ...d.edits, [t.id]: { ...d.edits[t.id], postponed: today, snap: { title: t.title, subject: t.subject, kind: t.kind } } } },
    );

  /** 원래 날짜로 되돌리기 */
  const restore = (p: PostponedItem) =>
    updateDay(p.date, (d) =>
      p.custom
        ? { ...d, custom: d.custom.map((c) => (c.id === p.id ? { ...c, postponed: undefined } : c)) }
        : { ...d, edits: { ...d.edits, [p.id]: { ...d.edits[p.id], postponed: undefined } } },
    );

  /** 다른 날짜(기본 오늘)로 옮기기: 대상 날짜에 직접 추가 항목으로 생성 */
  const moveTo = (p: PostponedItem, target = today) => {
    if (target === p.date) return restore(p);
    updateDay(target, (d) => ({ ...d, custom: [...d.custom, { id: `c-${uid()}`, subject: p.subject, title: p.title, kind: p.kind, from: p.custom ? undefined : p.id }] }));
    updateDay(p.date, (d) =>
      p.custom
        ? { ...d, custom: d.custom.filter((c) => c.id !== p.id) }
        : { ...d, edits: { ...d.edits, [p.id]: { ...d.edits[p.id], postponed: undefined, movedTo: target } } },
    );
  };

  /** 할 일을 다른 날짜로 옮기기 (주간 보드 끌어놓기) */
  const move = (t: DayTask, from: string, to: string) => {
    if (from === to) return;
    if (t.custom) {
      const c = day(from).custom.find((x) => x.id === t.id);
      if (!c) return;
      updateDay(from, (d) => ({ ...d, custom: d.custom.filter((x) => x.id !== t.id) }));
      updateDay(to, (d) => ({ ...d, custom: [...d.custom, c] }));
    } else {
      updateDay(to, (d) => ({ ...d, custom: [...d.custom, { id: `c-${uid()}`, subject: t.subject, title: t.title, kind: t.kind, from: t.id }] }));
      updateDay(from, (d) => ({ ...d, edits: { ...d.edits, [t.id]: { ...d.edits[t.id], movedTo: to } } }));
    }
  };

  /** 쓰레기통 2번: 완전 삭제 */
  const purge = (p: PostponedItem) =>
    updateDay(p.date, (d) =>
      p.custom
        ? { ...d, custom: d.custom.filter((c) => c.id !== p.id) }
        : { ...d, edits: { ...d.edits, [p.id]: { ...d.edits[p.id], postponed: undefined, deleted: true } } },
    );

  const scoreModal = score ? <ScoreModal initial={score} onClose={() => setScore(null)} /> : null;
  return { toggle, openScore, rename, postpone, restore, moveTo, move, purge, scoreByTask, scoreModal };
}

export type TaskActions = ReturnType<typeof useTaskActions>;
