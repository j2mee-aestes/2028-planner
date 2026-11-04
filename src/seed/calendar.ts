import type { Holiday, SchoolCalendar } from '../lib/types';

export const PLAN_START = '2026-12-15';
export const PLAN_END = '2027-11-17'; // 수능 전날
export const EXAM_DATE = '2027-11-18'; // 2028학년도 수능 (교육부 2025-06-02 발표)

/** 연습 기간: 이 날부터 12/14 까지 통계(잔디·연속·누적 등)를 미리 써보고, 12/15 부터는 새로 집계 */
export const PRACTICE_START = '2026-11-01';
/** 통계 집계 시작일: 연습 기간엔 PRACTICE_START, 12/15 부터는 PLAN_START (연습 기록은 집계에서 빠짐) */
export const statsStart = (today: string) => (today < PLAN_START ? PRACTICE_START : PLAN_START);
export const inPractice = (today: string) => today < PLAN_START;

// 법정 공휴일·대체공휴일 (2026-12 ~ 2027-11). 출처: 우주항공청 2027 월력요항 보도 기반 정리.
// 임시공휴일이 생기면 앱 설정 화면에서 추가하거나 여기에 추가.
export const HOLIDAYS: Holiday[] = [
  { date: '2026-12-25', name: '성탄절' },
  { date: '2027-01-01', name: '신정' },
  { date: '2027-02-06', name: '설 연휴' },
  { date: '2027-02-07', name: '설날' },
  { date: '2027-02-08', name: '설 연휴' },
  { date: '2027-02-09', name: '대체공휴일(설)' },
  { date: '2027-03-01', name: '삼일절' },
  { date: '2027-05-01', name: '노동절' },
  { date: '2027-05-03', name: '대체공휴일(노동절)' },
  { date: '2027-05-05', name: '어린이날' },
  { date: '2027-05-13', name: '부처님오신날' },
  { date: '2027-06-06', name: '현충일' },
  { date: '2027-07-17', name: '제헌절' },
  { date: '2027-07-19', name: '대체공휴일(제헌절)' },
  { date: '2027-08-15', name: '광복절' },
  { date: '2027-08-16', name: '대체공휴일(광복절)' },
  { date: '2027-09-14', name: '추석 연휴' },
  { date: '2027-09-15', name: '추석' },
  { date: '2027-09-16', name: '추석 연휴' },
  { date: '2027-10-03', name: '개천절' },
  { date: '2027-10-04', name: '대체공휴일(개천절)' },
  { date: '2027-10-09', name: '한글날' },
  { date: '2027-10-11', name: '대체공휴일(한글날)' },
];

/** 개인 공부 금지일 (휴일 규칙과 무관하게 항상 쉼) */
export const PERSONAL_OFF: Holiday[] = [
  { date: '2026-12-25', name: '성탄절(개인)' },
  { date: '2027-02-05', name: '개인 휴식일' },
];

/** 학교 일정 기본값 — 앱 설정 화면에서 수정 가능 (저장값이 우선) */
export const DEFAULT_SCHOOL: SchoolCalendar = {
  winterEnd: '2027-03-01',
  sem1Start: '2027-03-02',
  exams: [
    { name: '1학기 중간고사', start: '2027-04-20', end: '2027-05-01' },
    { name: '1학기 기말고사', start: '2027-06-29', end: '2027-07-10' },
  ],
  examLeadDays: 21, // 시험 3주 전부터 내신기간
  summerStart: '2027-07-20',
  summerEnd: '2027-08-16',
  sem2Start: '2027-08-17',
};

export const DEFAULT_TARGETS = { weekday: 360, weekend: 480 };

/** 달력에 표시할 주요 시험 일정. tentative=true 는 미확정(추정) */
export const EVENTS: { date: string; title: string; tentative?: boolean }[] = [
  { date: '2027-03-25', title: '3월 학평 (일정 미확정)', tentative: true },
  { date: '2027-05-07', title: '5월 학평 (일정 미확정)', tentative: true },
  { date: '2027-06-03', title: '6월 모평 (일정 미확정)', tentative: true },
  { date: '2027-07-08', title: '7월 학평 (일정 미확정)', tentative: true },
  { date: '2027-08-26', title: '하반기 모평 · 8월 넷째~다섯째 주 (미확정)', tentative: true },
  { date: '2027-10-13', title: '10월 학평 (일정 미확정)', tentative: true },
];
