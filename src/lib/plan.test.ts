import { describe, expect, it } from 'vitest';
import { DEFAULT_SCHOOL, DEFAULT_TARGETS } from '../seed/calendar';
import { computeOffDays, generatePlan, phaseOf } from './plan';
import type { Settings } from './types';

const S: Settings = {
  school: DEFAULT_SCHOOL,
  extraHolidays: [],
  extraOff: [],
  extraStudy: [],
  targets: DEFAULT_TARGETS,
  runningTimer: null,
};

describe('공부 금지일', () => {
  const off = computeOffDays(S);
  it.each([
    ['2026-12-25', true], ['2026-12-26', false],
    ['2027-01-01', true], ['2027-01-02', false],
    ['2027-02-05', true], ['2027-02-06', true], ['2027-02-07', false], ['2027-02-09', false],
    ['2027-02-27', true], ['2027-03-01', false],
    ['2027-05-01', true], ['2027-05-03', false],
    ['2027-05-05', true], ['2027-05-13', true],
    ['2027-06-05', false], ['2027-06-06', true],
    ['2027-07-17', true], ['2027-07-19', false],
    ['2027-08-14', true], ['2027-08-16', false],
    ['2027-09-14', true], ['2027-09-15', false],
    ['2027-10-02', true], ['2027-10-04', false],
    ['2027-10-09', true], ['2027-10-11', false],
  ])('%s → %s', (d, v) => expect(off.has(d)).toBe(v));
});

describe('단계', () => {
  it('내신기간 3주 전', () => {
    expect(phaseOf('2027-03-29', DEFAULT_SCHOOL)).toBe('sem1');
    expect(phaseOf('2027-03-30', DEFAULT_SCHOOL)).toBe('exam');
    expect(phaseOf('2027-05-02', DEFAULT_SCHOOL)).toBe('sem1');
    expect(phaseOf('2027-08-17', DEFAULT_SCHOOL)).toBe('sem2');
  });
});

describe('커리 생성', () => {
  const p = generatePlan(S);
  it('금지일엔 할 일 없음', () => {
    for (const d of p.off.keys()) expect(p.byDate[d]).toBeUndefined();
  });
  it('겨울방학 국어·영어 모고 매일 1회', () => {
    for (const d of ['2026-12-15', '2026-12-16', '2027-01-10']) {
      expect(p.byDate[d].filter((t) => t.trackId === 'kor-mock')).toHaveLength(1);
      expect(p.byDate[d].filter((t) => t.trackId === 'eng-mock')).toHaveLength(1);
    }
  });
  it('내신기간 모고 월수금만', () => {
    for (const [d, n] of [['2027-04-05', 1], ['2027-04-06', 0], ['2027-04-07', 1]] as const)
      expect((p.byDate[d] ?? []).filter((t) => t.trackId === 'kor-mock')).toHaveLength(n);
  });
  it('과탐 자습 블록은 요일별 시간으로 생성', () => {
    expect(p.byDate['2027-01-16'].find((t) => t.trackId === 'c-self-w')?.estMin).toBe(120);
    expect(p.byDate['2027-01-17']?.find((t) => t.trackId === 'c-self-w')).toBeUndefined();
  });
  it('과탐은 1학기 기말 이후 없음', () => {
    const after = Object.entries(p.byDate).filter(([d, ts]) => d > '2027-07-10' && ts.some((t) => t.subject === 'sci'));
    expect(after).toHaveLength(0);
  });
  it('한국사는 겨울방학·2학기만', () => {
    const bad = Object.entries(p.byDate).filter(
      ([d, ts]) => d > '2027-03-01' && d < '2027-08-17' && ts.some((t) => t.subject === 'hist'),
    );
    expect(bad).toHaveLength(0);
  });
  it('출간일 이전 배정 없음', () => {
    expect(p.byId['m-mock:m-mock-f-1'].date >= '2027-10-26').toBe(true);
    expect(p.byId['kor-ebs1:kor-ebs1-1'].date >= '2027-02-01').toBe(true);
  });
  it('task id 유일', () => {
    const all = Object.values(p.byDate).flat();
    expect(new Set(all.map((t) => t.id)).size).toBe(all.length);
  });
});

import { postponedList, tasksOf } from './stats';
describe('미루기', () => {
  const p = generatePlan(S);
  const date = '2027-01-12';
  const t = p.byDate[date][0];
  const day = { checks: {}, edits: { [t.id]: { postponed: '2027-01-12', snap: { title: t.title, subject: t.subject, kind: t.kind } } },
    custom: [{ id: 'c-1', subject: 'etc', title: '내 할 일', kind: 'study' as const, postponed: '2027-01-13' }], logs: [] };
  const data = { settings: S, days: { [date]: day }, scores: {}, wrongs: {} };
  it('미룬 항목은 그날 목록에서 빠지고 미룬 목록에 나옴', () => {
    expect(tasksOf(p, date, day).some((x) => x.id === t.id || x.id === 'c-1')).toBe(false);
    expect(postponedList(p, data).map((x) => x.id)).toEqual([t.id, 'c-1']);
  });
  it('완전 삭제·이동한 항목은 미룬 목록에서 빠짐', () => {
    const d2 = { ...day, edits: { [t.id]: { deleted: true } }, custom: [] };
    expect(postponedList(p, { ...data, days: { [date]: d2 } })).toHaveLength(0);
    const d3 = { ...day, edits: { [t.id]: { movedTo: '2027-01-14' } }, custom: [] };
    expect(postponedList(p, { ...data, days: { [date]: d3 } })).toHaveLength(0);
    expect(tasksOf(p, date, d3).some((x) => x.id === t.id)).toBe(false);
  });
});

import { streaks, trackProgress } from './insights';
import { withReviews } from './plan';
describe('오답 재풀이·연속 공부·진도', () => {
  const base = generatePlan(S);
  it('재풀이 일정이 할 일로 들어가고, 쉬는 날이면 다음 공부일로', () => {
    const p = withReviews(base, { w1: { id: 'w1', subject: 'kor', no: 17, exam: '3월 학평', date: '2027-01-01', reviews: ['2027-02-06', '2027-01-20'] } });
    expect(p.byDate['2027-02-07'].some((t) => t.id === 'wrong-review:w1-0')).toBe(true); // 2/6 설 연휴 첫날 → 2/7
    expect(p.byDate['2027-01-20'].some((t) => t.id === 'wrong-review:w1-1')).toBe(true);
  });
  it('연속 공부일: 쉬는 날은 건너뛰고, 오늘 0분은 끊지 않음', () => {
    const log = (min: number) => ({ checks: {}, edits: {}, custom: [], logs: [{ id: 'x', subject: 'kor', min, src: 'manual' as const }] });
    const days = { '2026-12-23': log(60), '2026-12-24': log(60), '2026-12-26': log(60) }; // 12/25 휴무
    const s = streaks({ settings: S, days, scores: {}, wrongs: {} }, base, '2026-12-27');
    expect(s.current).toBe(3);
  });
  it('밀린 만큼 예상 완료일이 뒤로', () => {
    const tp = trackProgress({ settings: S, days: {}, scores: {}, wrongs: {} }, base, '2027-01-10').find((t) => t.id === 'm-calc2')!;
    expect(tp.late).toBeGreaterThan(0);
    expect(tp.projected! > tp.last!).toBe(true);
  });
});
