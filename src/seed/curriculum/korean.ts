import type { Track, Unit } from '../../lib/types';
import { pastExamUnits, privateSet, seq } from './helpers';

/** 갭 채우기: 사설 출시 전 빈 날에 자동 배정되는 예비 기출 (2017~2021학년도 교육청) */
export function backupEduUnits(prefix: string): Unit[] {
  const out: Unit[] = [];
  for (let y = 2017; y <= 2021; y++)
    for (const m of [3, 4, 7, 10])
      out.push({ id: `${prefix}-b${y}-${m}`, title: `[예비] ${y - 1}년 ${m}월 고3 학평 (${y}학년도)`, org: '교육청' });
  return out;
}

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
    note: '기출 57회(평가원 2017~2027, 교육청 2022~2027) → 사설. 사설은 출시일 이후 순서대로, 출시 전 빈 날은 [예비] 기출로 채움.',
    units: [
      ...pastExamUnits('k'),
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
      ...backupEduUnits('k'),
      ...seq('k-redo', '취약 회차 재풀이', 70, { availableFrom: '2027-09-01' }),
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
