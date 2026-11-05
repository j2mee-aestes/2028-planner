import type { Unit } from '../../lib/types';

/** 번호 단위 n개 생성: seq('hwk-a', '한완기 대수', 24) → 한완기 대수 1/24 ... */
export const seq = (
  idPrefix: string,
  label: string,
  n: number,
  extra: Partial<Unit> = {},
  fmt: (i: number, n: number) => string = (i, n) => `${label} ${i}/${n}`,
): Unit[] =>
  Array.from({ length: n }, (_, k) => ({ id: `${idPrefix}-${k + 1}`, title: fmt(k + 1, n), ...extra }));

const PG = [['6', '6월 모평'], ['9', '9월 모평'], ['s', '수능']] as const;

/**
 * 기출 모의고사 큐 (국어·영어 공통)
 * 1회독: 2021~2027학년도 평가원 + 교육청을 연도별 시행 순서대로 (3월 → 4·5월 → 6모 → 7월 → 9모 → 10월 → 수능)
 * 2회독: 2021~2027학년도 평가원만 다시 (분석 위주)
 * 3회독(pastExamRound3): 평가원만 한 번 더 — 9/1(하반기 모평 직후)부터
 */
export function pastExamUnits(prefix: string, reviewMin: number): Unit[] {
  const out: Unit[] = [];
  for (let y = 2021; y <= 2027; y++) {
    const covid = y === 2021; // 2020년 시행: 코로나로 학평 일정 변동
    const edu = (m: number, label: string) =>
      out.push({ id: `${prefix}-e${y}-${m}`, title: `${y - 1}년 ${label} 고3 학평 (${y}학년도)`, org: '교육청', tentative: covid || undefined });
    const pg = (k: (typeof PG)[number]) => out.push({ id: `${prefix}-k${y}-${k[0]}`, title: `${y}학년도 ${k[1]}`, org: '평가원' });
    edu(3, '3월'); edu(5, '4·5월'); pg(PG[0]); edu(7, '7월'); pg(PG[1]); edu(10, '10월'); pg(PG[2]);
  }
  out.push(...pgRound(prefix, 2, reviewMin));
  return out;
}

const pgRound = (prefix: string, r: number, min: number, availableFrom?: string): Unit[] => {
  const out: Unit[] = [];
  for (let y = 2021; y <= 2027; y++)
    for (const [k, n] of PG)
      out.push({ id: `${prefix}-r${r}-${y}-${k}`, title: `[평가원 ${r}회독] ${y}학년도 ${n}`, org: '평가원', estMin: min, availableFrom });
  return out;
};

/** 평가원 3회독: 9/1 부터 (사설보다 앞에 두면 9/1 이 되는 순간 사설보다 먼저 배정됨) */
export const pastExamRound3 = (prefix: string, min: number) => pgRound(prefix, 3, min, '2027-09-01');

/** 사설 모의고사 묶음. 회차 수·출시일은 추정(tentative) */
export const privateSet = (prefix: string, label: string, n: number, availableFrom: string): Unit[] =>
  seq(prefix, label, n, { availableFrom, org: '사설', tentative: true }, (i) => `${label} ${i}회`);
