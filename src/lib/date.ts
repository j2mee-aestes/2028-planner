// 모든 날짜는 KST 기준 'YYYY-MM-DD' 문자열. 계산은 UTC 자정 기준 순수 달력 연산.
const fmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export const kstDateOf = (ms: number) => fmt.format(new Date(ms));
export const kstToday = () => kstDateOf(Date.now());

export const toUTC = (d: string) => {
  const [y, m, day] = d.split('-').map(Number);
  return Date.UTC(y, m - 1, day);
};
export const fromUTC = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export const addDays = (d: string, n: number) => fromUTC(toUTC(d) + n * 86400000);
export const diffDays = (a: string, b: string) => Math.round((toUTC(b) - toUTC(a)) / 86400000);
export const weekday = (d: string) => new Date(toUTC(d)).getUTCDay();
export const isWeekend = (d: string) => {
  const w = weekday(d);
  return w === 0 || w === 6;
};
export const monthKey = (d: string) => d.slice(0, 7);

export function* eachDay(start: string, end: string) {
  for (let d = start; d <= end; d = addDays(d, 1)) yield d;
}

export const startOfWeek = (d: string) => addDays(d, -weekday(d)); // 일요일 시작
export const startOfMonth = (d: string) => d.slice(0, 8) + '01';
export const addMonths = (d: string, n: number) => {
  const [y, m] = d.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1 + n, 1));
  return fromUTC(t.getTime());
};
export const endOfMonth = (d: string) => addDays(addMonths(startOfMonth(d), 1), -1);

const WD = ['일', '월', '화', '수', '목', '금', '토'];
export const wdName = (d: string) => WD[weekday(d)];
export const prettyDate = (d: string) => {
  const [, m, day] = d.split('-').map(Number);
  return `${m}/${day}(${wdName(d)})`;
};

export const fmtMin = (min: number) => {
  const m = Math.round(min);
  if (m <= 0) return '0:00';
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
};
export const fmtHM = (min: number) => {
  const m = Math.round(min);
  const h = Math.floor(m / 60);
  return h ? (m % 60 ? `${h}시간 ${m % 60}분` : `${h}시간`) : `${m}분`;
};
export const fmtClock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
};

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
