export type SubjectId = string; // 'kor' | 'math' | 'eng' | 'soc' | 'sci' | 'hist' | 추가 과목
export type PhaseId = 'winter' | 'sem1' | 'exam' | 'summer' | 'sem2';
export type TaskKind = 'study' | 'mock';

export interface Subject {
  id: SubjectId;
  name: string;
  short: string;
  color: string; // hex
  active: boolean;
  /** 성적 기록 시 문항 수 (틀린 번호 입력용) */
  questions: number;
}

export interface Unit {
  id: string;
  title: string;
  /** 이 날짜 이전에는 배정하지 않음 (출간일 등) */
  availableFrom?: string;
  /** 성적 자동 입력용 시행기관 */
  org?: string;
  tentative?: boolean;
}

/** 내신기간 처리: same=그대로, skip=중단, half=격일, weekdays=지정 요일만(0=일) */
export type ExamMode = 'same' | 'skip' | 'half' | { weekdays: number[] };

export interface Track {
  id: string;
  subject: SubjectId;
  title: string;
  kind: TaskKind;
  phases: PhaseId[];
  startDate?: string;
  endDate?: string;
  /** true 면 학교 일정의 마지막 내신 종료일까지만 진행 */
  endAfterExams?: boolean;
  /** 다른 트랙이 끝난 다음 날부터 시작 (앞쪽에 정의된 트랙만 지정 가능) */
  after?: string;
  perDay?: number;
  weekendPerDay?: number;
  /** 지정 시 해당 요일에만 배정 (0=일 … 6=토) */
  weekdays?: number[];
  examMode?: ExamMode;
  estMin?: number;
  note?: string;
  tentative?: boolean;
  units: Unit[];
}

export interface PlanTask {
  id: string; // `${trackId}:${unitId}`
  trackId: string;
  subject: SubjectId;
  title: string;
  trackTitle: string;
  kind: TaskKind;
  date: string;
  estMin?: number;
  org?: string;
  tentative?: boolean;
}

export interface Holiday {
  date: string;
  name: string;
}

export interface ExamWindow {
  name: string;
  start: string;
  end: string;
}

export interface SchoolCalendar {
  winterEnd: string;
  sem1Start: string;
  exams: ExamWindow[];
  examLeadDays: number;
  summerStart: string;
  summerEnd: string;
  sem2Start: string;
}

export interface Settings {
  school: SchoolCalendar;
  extraHolidays: Holiday[];
  /** 공부 금지로 강제 지정 */
  extraOff: string[];
  /** 규칙상 금지일이지만 공부일로 강제 지정 */
  extraStudy: string[];
  targets: { weekday: number; weekend: number }; // 분
  runningTimer: { subject: SubjectId; startedAt: number } | null;
}

export interface CustomTask {
  id: string;
  subject: SubjectId;
  title: string;
  kind: TaskKind;
}

export interface TimeLog {
  id: string;
  subject: SubjectId;
  min: number;
  start?: number;
  end?: number;
  src: 'timer' | 'manual';
}

export interface DayRecord {
  /** taskId -> 체크한 날짜(KST) */
  checks: Record<string, string>;
  edits: Record<string, { title?: string; deleted?: boolean }>;
  custom: CustomTask[];
  logs: TimeLog[];
  memo?: string;
}

export interface SubjectScore {
  raw?: number;
  std?: number;
  pct?: number;
  grade?: number;
  wrong: number[];
}

export interface Score {
  id: string;
  type: 'official' | 'self';
  org: string; // 평가원 | 교육청 | 사설 | 기타
  name: string;
  date: string;
  taskId?: string;
  subjects: Record<SubjectId, SubjectScore>;
  memo?: string;
}

export interface AppData {
  settings: Settings;
  days: Record<string, DayRecord>;
  scores: Record<string, Score>;
}
