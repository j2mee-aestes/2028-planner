import type { Subject } from '../lib/types';

// 과목 추가(예: 수리논술): 아래 배열에 항목을 추가하고 curriculum/ 에 트랙 파일을 만든 뒤 index.ts 에 등록.
export const SUBJECTS: Subject[] = [
  { id: 'kor', name: '국어', short: '국', color: '#f4a6a6', ink: '#c2484f', active: true, questions: 45 },
  { id: 'math', name: '수학', short: '수', color: '#a5c0f2', ink: '#3461b5', active: true, questions: 30 },
  { id: 'eng', name: '영어', short: '영', color: '#a3d9b1', ink: '#2e8450', active: true, questions: 45 },
  { id: 'soc', name: '통합사회', short: '사', color: '#f6c79c', ink: '#b25f17', active: true, questions: 25 },
  { id: 'sci', name: '통합과학', short: '과', color: '#cdb8f2', ink: '#7a52c2', active: true, questions: 25 },
  { id: 'hist', name: '한국사', short: '한', color: '#9ad8d0', ink: '#1d8379', active: true, questions: 20 },
  // { id: 'essay', name: '수리논술', short: '논', color: '#0ea5e9', active: false, questions: 0 },
  { id: 'etc', name: '기타', short: '기', color: '#d4d4d8', ink: '#71717a', active: true, questions: 0 },
];

export const subjectMap = Object.fromEntries(SUBJECTS.map((s) => [s.id, s]));
export const subjectOf = (id: string): Subject =>
  subjectMap[id] ?? { id, name: id, short: id.slice(0, 1), color: '#d4d4d8', ink: '#71717a', active: true, questions: 0 };
