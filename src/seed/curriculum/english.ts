import type { Track } from '../../lib/types';
import { pastExamRound3, pastExamUnits, privateSet, seq } from './helpers';

// 영어는 학원 수강 중 → 모의고사 진행만 (국어와 동일 빈도)
export const ENGLISH: Track[] = [
  {
    id: 'eng-mock',
    subject: 'eng',
    title: '영어 모의고사',
    kind: 'mock',
    phases: ['winter', 'sem1', 'exam', 'summer', 'sem2'],
    perDay: 1,
    examMode: { weekdays: [1, 3, 5] },
    estMin: 90,
    note: '국어와 같은 구조: 2021~2027 기출 1회독 → 평가원 2회독 → 씨뮬 사설 → 신작 사설 → 9/1 평가원 3회독. 학원 일정 나오면 조정.',
    units: [
      ...pastExamUnits('e', 60),
      ...privateSet('e-simul', '씨뮬 사설', 20, '2026-12-01'),
      ...pastExamRound3('e', 60),
      ...privateSet('e-sv1', '서바이벌 영어 상반기', 10, '2027-03-15'),
      ...privateSet('e-kk1', '강대K 영어 상반기', 10, '2027-03-15'),
      ...privateSet('e-lec1', '강사 실모 시즌1(조정식·이명학·션티 등)', 10, '2027-04-01'),
      ...privateSet('e-sv2', '서바이벌 영어 하반기', 12, '2027-08-01'),
      ...privateSet('e-kk2', '강대K 영어 하반기', 12, '2027-08-01'),
      ...privateSet('e-lecf', '강사 실모 파이널', 10, '2027-09-01'),
      ...seq('e-redo', '취약 회차 재풀이', 140, { availableFrom: '2027-03-01' }, (i) => `취약 회차 재풀이 · 또는 추가 사설 (${i})`), // 맨 뒤 = 다른 회차가 없는 빈 날에만 배정
    ],
  },
];
