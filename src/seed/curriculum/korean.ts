import type { Track } from '../../lib/types';
import { pastExamRound3, pastExamUnits, privateSet, seq } from './helpers';

export const KOREAN: Track[] = [
  {
    id: 'kor-mock',
    subject: 'kor',
    title: '국어 모의고사',
    kind: 'mock',
    phases: ['winter', 'sem1', 'exam', 'summer', 'sem2'],
    perDay: 1,
    examMode: { weekdays: [1, 3, 5] }, // 내신기간 주 3회(월·수·금)
    estMin: 120,
    note: '2021~2027학년도 기출 1회독(49) → 평가원 2회독(21) → 씨뮬 사설 → 신작 사설 → 9/1 평가원 3회독(21) → 파이널 사설 → 재풀이. 사설은 출시일 이후 순서대로.',
    units: [
      ...pastExamUnits('k', 90),
      ...privateSet('k-simul', '씨뮬 사설', 20, '2026-12-01'), // 지난 사설 시험 모음 · 회차는 책 받은 뒤 수정
      ...pastExamRound3('k', 90),
      ...privateSet('k-igam1', '이감 상반기', 8, '2027-02-15'),
      ...privateSet('k-ss1', '상상 시즌1', 4, '2027-03-01'),
      ...privateSet('k-hs1', '한수 시즌1', 5, '2027-03-15'),
      ...privateSet('k-sv1', '서바이벌 상반기', 10, '2027-03-15'),
      ...privateSet('k-kk1', '강대K 상반기', 10, '2027-03-15'),
      ...privateSet('k-ss2', '상상 시즌2', 4, '2027-05-01'),
      ...privateSet('k-hs2', '한수 시즌2', 5, '2027-05-15'),
      ...privateSet('k-igam2', '이감 하반기', 16, '2027-07-01'),
      ...privateSet('k-sv2', '서바이벌 하반기', 12, '2027-08-01'),
      ...privateSet('k-kk2', '강대K 하반기', 12, '2027-08-01'),
      ...privateSet('k-ssf', '상상 파이널', 6, '2027-09-15'),
      ...privateSet('k-hsf', '한수 파이널', 4, '2027-10-01'),
      ...privateSet('k-igamf', '이감 파이널', 6, '2027-10-01'),
      ...seq('k-redo', '취약 회차 재풀이', 110, { availableFrom: '2027-03-01' }, (i) => `취약 회차 재풀이 · 또는 추가 사설 (${i})`), // 맨 뒤 = 다른 회차가 없는 빈 날에만 배정
    ],
  },
  {
    id: 'kor-ebs1',
    subject: 'kor',
    title: 'EBS 수능특강 국어',
    kind: 'study',
    phases: ['winter', 'sem1', 'exam', 'summer'],
    startDate: '2027-02-01', // 2027년 1월 말 발행 예정
    weekdays: [1, 4],
    examMode: 'half',
    estMin: 60,
    tentative: true,
    note: '단원 구성 미확정 — 교재 받으면 units 를 실제 단원명으로 교체',
    units: seq('kor-ebs1', '수능특강 국어', 30),
  },
  {
    id: 'kor-ebs2',
    subject: 'kor',
    title: 'EBS 수능완성 국어',
    kind: 'study',
    phases: ['sem1', 'exam', 'summer', 'sem2'],
    after: 'kor-ebs1',
    startDate: '2027-06-08', // 예년 패턴(5월 말~6월 초) 기반 추정
    weekdays: [2, 5],
    examMode: 'half',
    estMin: 60,
    tentative: true,
    units: seq('kor-ebs2', '수능완성 국어', 25),
  },
  {
    id: 'kor-ebs-re',
    subject: 'kor',
    title: 'EBS 연계 복습 (수특·수완 작품·지문 재정리)',
    kind: 'study',
    phases: ['sem2'],
    startDate: '2027-09-01',
    weekdays: [1, 4],
    estMin: 50,
    units: seq('kor-ebs-re', 'EBS 연계 복습', 20),
  },
];
