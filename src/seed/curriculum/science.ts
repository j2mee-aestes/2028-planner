import type { Track } from '../../lib/types';
import { seq } from './helpers';

// 통합과학: 인강 없이 교재만. 12/15 ~ 3학년 1학기 내신기간까지 (이후 학원)
// 교재는 EBS 수능특강·수능완성만 지정. 나머지는 요일별 자습 시간 블록(교재 자유).
// 시간 바꾸기: blocks 의 { 요일(0=일): 분 } 수정
const P = ['winter', 'sem1', 'exam'] as const;

export const SCIENCE: Track[] = [
  {
    id: 'c-self-w',
    subject: 'sci',
    title: '통합과학 자습',
    kind: 'study',
    phases: ['winter'],
    blocks: { 1: 60, 2: 60, 3: 60, 4: 60, 5: 60, 6: 120 }, // 겨울방학: 월~금 1시간, 토 2시간
    units: [],
  },
  {
    id: 'c-self-s',
    subject: 'sci',
    title: '통합과학 자습',
    kind: 'study',
    phases: ['sem1', 'exam'],
    endAfterExams: true,
    blocks: { 2: 60, 4: 60, 6: 120 }, // 학기 중: 화·목 1시간, 토 2시간
    examMode: { weekdays: [6] }, // 내신기간: 토요일만
    units: [],
  },
  {
    id: 'c-ebs1',
    subject: 'sci',
    title: 'EBS 수능특강 통합과학',
    kind: 'study',
    phases: [...P],
    endAfterExams: true,
    startDate: '2027-02-01',
    weekdays: [1, 3, 5],
    examMode: 'half',
    estMin: 60,
    units: seq('c-ebs1', '수능특강 통합과학', 25),
  },
  {
    id: 'c-ebs2',
    subject: 'sci',
    title: 'EBS 수능완성 통합과학',
    kind: 'study',
    phases: [...P],
    endAfterExams: true,
    after: 'c-ebs1',
    startDate: '2027-06-08',
    estMin: 60,
    tentative: true,
    units: seq('c-ebs2', '수능완성 통합과학', 20),
  },
];
