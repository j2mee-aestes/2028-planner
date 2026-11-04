import type { Track } from '../../lib/types';
import { pastExamUnits, privateSet, seq } from './helpers';
import { backupEduUnits } from './korean';

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
    note: '기출 57회 → 사설. 사설 회차·출시일은 추정.',
    units: [
      ...pastExamUnits('e'),
      ...privateSet('e-sv1', '서바이벌 영어 상반기', 10, '2027-03-15'),
      ...privateSet('e-kk1', '강대K 영어 상반기', 10, '2027-03-15'),
      ...privateSet('e-lec1', '강사 실모 시즌1(조정식·이명학·션티 등)', 10, '2027-04-01'),
      ...privateSet('e-sv2', '서바이벌 영어 하반기', 12, '2027-08-01'),
      ...privateSet('e-kk2', '강대K 영어 하반기', 12, '2027-08-01'),
      ...privateSet('e-lecf', '강사 실모 파이널', 10, '2027-09-01'),
      ...backupEduUnits('e'),
      ...seq('e-redo', '취약 회차 재풀이', 80, { availableFrom: '2027-09-01' }),
    ],
  },
];
