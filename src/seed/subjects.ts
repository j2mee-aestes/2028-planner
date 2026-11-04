import type { Subject } from '../lib/types';

// 과목 추가(예: 수리논술): 아래 배열에 항목을 추가하고 curriculum/ 에 트랙 파일을 만든 뒤 index.ts 에 등록.
export const SUBJECTS: Subject[] = [
  { id: 'kor', name: '국어', short: '국', color: '#e5484d', active: true, questions: 45 },
  { id: 'math', name: '수학', short: '수', color: '#2f6fde', active: true, questions: 30 },
  { id: 'eng', name: '영어', short: '영', color: '#16a34a', active: true, questions: 45 },
  { id: 'soc', name: '통합사회', short: '사', color: '#d9650b', active: true, questions: 25 },
  { id: 'sci', name: '통합과학', short: '과', color: '#9b5de5', active: true, questions: 25 },
  { id: 'hist', name: '한국사', short: '한', color: '#0d9488', active: true, questions: 20 },
  // { id: 'essay', name: '수리논술', short: '논', color: '#0ea5e9', active: false, questions: 0 },
  { id: 'etc', name: '기타', short: '기', color: '#64748b', active: true, questions: 0 },
];

export const subjectMap = Object.fromEntries(SUBJECTS.map((s) => [s.id, s]));
export const subjectOf = (id: string): Subject =>
  subjectMap[id] ?? { id, name: id, short: id.slice(0, 1), color: '#64748b', active: true, questions: 0 };
