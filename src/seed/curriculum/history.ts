import type { Track } from '../../lib/types';
import { seq } from './helpers';

// 한국사: 겨울방학 + 3학년 2학기만, 천천히
export const HISTORY: Track[] = [
  {
    id: 'h-lec',
    subject: 'hist',
    title: 'EBS 최태성 한국사 개념 (무료)',
    kind: 'study',
    phases: ['winter'],
    startDate: '2026-12-15',
    weekdays: [1, 2, 3, 4, 5],
    estMin: 30,
    units: seq('h-lec', '최태성 한국사 개념', 40, {}, (i, n) => `최태성 한국사 개념 ${i}강 (${i}/${n})`),
  },
  {
    id: 'h-ebs1',
    subject: 'hist',
    title: 'EBS 수능특강 한국사',
    kind: 'study',
    phases: ['sem2'],
    weekdays: [3, 6],
    estMin: 40,
    units: seq('h-ebs1', '수능특강 한국사', 10),
  },
  {
    id: 'h-ebs2',
    subject: 'hist',
    title: 'EBS 수능완성 한국사',
    kind: 'study',
    phases: ['sem2'],
    after: 'h-ebs1',
    weekdays: [3, 6],
    estMin: 40,
    units: seq('h-ebs2', '수능완성 한국사', 10),
  },
  {
    id: 'h-mock',
    subject: 'hist',
    title: '한국사 기출 모고 (20문항 30분)',
    kind: 'mock',
    phases: ['sem2'],
    startDate: '2027-08-22',
    weekdays: [0],
    estMin: 40,
    units: seq('h-mock', '한국사 기출', 12, { org: '평가원' }, (i) => `한국사 평가원 기출 ${i}회`),
  },
];
