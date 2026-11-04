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
