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

/** 기출 모의고사 큐 (국어·영어 공통). 2017~2021 평가원 → 2022~2027 교육청 → 2022~2027 평가원 */
export function pastExamUnits(prefix: string): Unit[] {
  const out: Unit[] = [];
  for (let y = 2017; y <= 2021; y++)
    for (const [k, n] of [['6', '6월 모평'], ['9', '9월 모평'], ['s', '수능']] as const)
      out.push({ id: `${prefix}-k${y}-${k}`, title: `${y}학년도 ${n}`, org: '평가원' });
  for (let y = 2022; y <= 2027; y++)
    for (const m of [3, 5, 7, 10])
      out.push({
        id: `${prefix}-e${y}-${m}`,
        title: `${y - 1}년 ${m}월 고3 학평 (${y}학년도)`, // 5월 학평이 없던 해는 4월분으로
        org: '교육청',
      });
  for (let y = 2022; y <= 2027; y++)
    for (const [k, n] of [['6', '6월 모평'], ['9', '9월 모평'], ['s', '수능']] as const)
      out.push({ id: `${prefix}-k${y}-${k}`, title: `${y}학년도 ${n}`, org: '평가원' });
  return out;
}

/** 사설 모의고사 묶음. 회차 수·출시일은 추정(tentative) */
export const privateSet = (prefix: string, label: string, n: number, availableFrom: string): Unit[] =>
  seq(prefix, label, n, { availableFrom, org: '사설', tentative: true }, (i) => `${label} ${i}회`);
