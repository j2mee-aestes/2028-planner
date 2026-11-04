import type { Track, Unit } from '../../lib/types';
import { seq } from './helpers';

// 2028 이해원 스탠다드 패스 (integrate.kr/pass) 기반
// 한완기 평가원·수능 3권(2026.12) / N제 시즌1(2027.3) / N제 시즌2(2027.4) / 이해원 모의고사 시즌1~4·Final(5·8·9·10·10월)

/** 대수·미적Ⅰ·확통 을 번갈아 배치 */
function interleave(prefix: string, book: string, parts: [string, number][]): Unit[] {
  const lists = parts.map(([name, n]) => seq(`${prefix}-${name}`, `${book} ${name}`, n));
  const out: Unit[] = [];
  for (let i = 0; lists.some((l) => i < l.length); i++) for (const l of lists) if (i < l.length) out.push(l[i]);
  return out;
}

const SUBJ3: [string, number][] = [['대수', 12], ['미적분Ⅰ', 12], ['확통', 12]];

export const MATH: Track[] = [
  {
    id: 'm-calc2',
    subject: 'math',
    title: '마플시너지 미적분Ⅱ (예습)',
    kind: 'study',
    phases: ['winter'],
    startDate: '2026-12-15',
    estMin: 120,
    note: '겨울방학 예습. 분량(36일)은 진도 보고 조정',
    units: seq('m-calc2', '마플시너지 미적분Ⅱ', 36, {}, (i, n) => `마플시너지 미적분Ⅱ Day ${i}/${n}`),
  },
  {
    id: 'm-geo',
    subject: 'math',
    title: '시발점 기하 + 워크북 (예습)',
    kind: 'study',
    phases: ['winter', 'sem1', 'exam'],
    after: 'm-calc2',
    estMin: 120,
    units: seq('m-geo', '시발점 기하', 28, {}, (i, n) => `시발점 기하 ${i}강 + 워크북 (${i}/${n})`),
  },
  {
    id: 'm-hwk',
    subject: 'math',
    title: '한완기 평가원·수능 (대수·미적Ⅰ·확통)',
    kind: 'study',
    phases: ['winter', 'sem1', 'exam'],
    startDate: '2026-12-15',
    perDay: 1,
    examMode: 'half',
    estMin: 90,
    units: interleave('m-hwk', '한완기', [['대수', 24], ['미적분Ⅰ', 24], ['확통', 18]]),
  },
  {
    id: 'm-hwk-re',
    subject: 'math',
    title: '한완기 오답 1회독 (N제 출간 전)',
    kind: 'study',
    phases: ['winter', 'sem1', 'exam'],
    after: 'm-hwk',
    endDate: '2027-03-14',
    estMin: 60,
    units: seq('m-hwk-re', '한완기 오답', 15, {}, (i, n) => `한완기 틀린 문항 다시 풀기 ${i}/${n}`),
  },
  {
    id: 'm-n1',
    subject: 'math',
    title: '이해원 N제 시즌1',
    kind: 'study',
    phases: ['sem1', 'exam', 'summer', 'sem2'],
    after: 'm-hwk',
    startDate: '2027-03-15',
    examMode: 'half',
    estMin: 90,
    units: interleave('m-n1', 'N제 시즌1', SUBJ3),
  },
  {
    id: 'm-n2',
    subject: 'math',
    title: '이해원 N제 시즌2',
    kind: 'study',
    phases: ['sem1', 'exam', 'summer', 'sem2'],
    after: 'm-n1',
    startDate: '2027-04-15',
    examMode: 'half',
    estMin: 90,
    units: interleave('m-n2', 'N제 시즌2', SUBJ3),
  },
  {
    id: 'm-mock',
    subject: 'math',
    title: '이해원 모의고사',
    kind: 'mock',
    phases: ['sem1', 'exam', 'summer', 'sem2'],
    weekdays: [2, 4, 6], // 화·목·토
    examMode: 'skip',
    estMin: 130,
    note: '시즌3·4·Final 출시일은 2027 패스 기준(9/30, 10/14, 10/26) 준용',
    units: [
      { id: 'm-mock-6p', title: '6평 대비 이해원 모의고사 (패스 부록)', availableFrom: '2027-05-10', org: '사설' },
      ...seq('m-mock-s1', '이해원 모의고사 시즌1', 3, { availableFrom: '2027-05-15', org: '사설' }, (i) => `이해원 모의고사 시즌1 ${i}회`),
      ...seq('m-mock-s2', '', 3, { availableFrom: '2027-08-10', org: '사설' }, (i) => `이해원 모의고사 시즌2 ${i}회`),
      ...seq('m-mock-s3', '', 3, { availableFrom: '2027-09-30', org: '사설' }, (i) => `이해원 모의고사 시즌3 ${i}회`),
      ...seq('m-mock-s4', '', 3, { availableFrom: '2027-10-14', org: '사설' }, (i) => `이해원 모의고사 시즌4 ${i}회`),
      ...seq('m-mock-f', '', 3, { availableFrom: '2027-10-26', org: '사설' }, (i) => `이해원 모의고사 Final ${i}회`),
    ],
  },
  {
    id: 'm-ebs1',
    subject: 'math',
    title: 'EBS 수능특강 수학',
    kind: 'study',
    phases: ['sem1', 'exam', 'summer', 'sem2'],
    after: 'm-n2',
    examMode: 'half',
    estMin: 60,
    tentative: true,
    units: interleave('m-ebs1', '수특', [['대수', 8], ['미적분Ⅰ', 8], ['확통', 8]]),
  },
  {
    id: 'm-ebs2',
    subject: 'math',
    title: 'EBS 수능완성 수학',
    kind: 'study',
    phases: ['sem1', 'exam', 'summer', 'sem2'],
    after: 'm-ebs1',
    startDate: '2027-06-08',
    examMode: 'half',
    estMin: 60,
    tentative: true,
    units: seq('m-ebs2', '수능완성 수학', 20),
  },
  {
    id: 'm-review',
    subject: 'math',
    title: '한완기·N제 오답 복습',
    kind: 'study',
    phases: ['summer', 'sem2'],
    startDate: '2027-08-01',
    weekdays: [1, 3, 5],
    estMin: 60,
    units: seq('m-review', '오답 복습', 30, {}, (i, n) => `한완기·N제 틀린 문항 복습 ${i}/${n}`),
  },
  {
    id: 'm-final',
    subject: 'math',
    title: '파이널 점검 (최근 평가원 재풀이·개념 체크)',
    kind: 'study',
    phases: ['sem2'],
    after: 'm-review',
    weekdays: [0, 1, 3, 5],
    estMin: 90,
    units: seq('m-final', '파이널 점검', 22),
  },
];
