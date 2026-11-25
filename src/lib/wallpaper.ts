// 배경화면(잠금화면) 이미지: 오늘 데이터 요약 → 캔버스에 그리기
import { EXAM_DATE } from '../seed/calendar';
import { subjectOf } from '../seed/subjects';
import { addDays, diffDays, fmtMin, isWeekend, kstDateOf, weekday } from './date';
import { phaseLabel, type Plan } from './plan';
import { streaks } from './insights';
import { dayMinutes, overdue, tasksOf, weekRange } from './stats';
import { elapsedMs } from './timer';
import type { AppData } from './types';

export interface WallInfo {
  date: string;
  dday: number;
  phase: string;
  off?: string;
  minutes: number;
  target: number;
  bySubject: { subject: string; min: number }[];
  tasks: { title: string; subject: string; done: boolean }[];
  overdue: number;
  week: number;
  streak: number;
  next?: { title: string; days: number };
  running?: string;
  at: number;
}

const emptyDay = { checks: {}, edits: {}, custom: [], logs: [] };

/** 배경화면에 들어갈 오늘 요약. 진행 중인 타이머(오늘 시작분)도 공부 시간에 포함 */
export function wallpaperInfo(data: AppData, plan: Plan, today: string, now = Date.now()): WallInfo {
  const rec = { ...emptyDay, ...data.days[today] };
  const by: Record<string, number> = {};
  for (const l of rec.logs) by[l.subject] = (by[l.subject] ?? 0) + l.min;
  const rt = data.settings.runningTimer;
  let running: string | undefined;
  if (rt && kstDateOf(rt.firstStart ?? rt.startedAt) === today) {
    const m = Math.floor(elapsedMs(rt, now) / 60000);
    if (m > 0) by[rt.subject] = (by[rt.subject] ?? 0) + m;
    if (!rt.pausedAt) running = rt.subject;
  }
  const minutes = Object.values(by).reduce((a, b) => a + b, 0);

  const [ws] = weekRange(today);
  let week = 0;
  for (let d = ws; d < today; d = addDays(d, 1)) week += dayMinutes(data.days[d]);
  week += minutes;

  let next: WallInfo['next'];
  for (const d of Object.keys(plan.events).sort())
    if (d >= today) {
      next = { title: plan.events[d][0].title.replace(/\s*\(.*?\)\s*$/, '').replace(/\s*·.*$/, ''), days: diffDays(today, d) };
      break;
    }

  return {
    date: today,
    dday: diffDays(today, EXAM_DATE),
    phase: phaseLabel(today, plan.phase(today)),
    off: plan.off.get(today),
    minutes,
    target: isWeekend(today) ? data.settings.targets.weekend : data.settings.targets.weekday,
    bySubject: Object.entries(by).filter(([, m]) => m > 0).map(([subject, min]) => ({ subject, min })).sort((a, b) => b.min - a.min),
    tasks: tasksOf(plan, today, rec).map((t) => ({ title: t.title, subject: t.subject, done: t.done })),
    overdue: overdue(plan, data, today).length,
    week,
    streak: streaks(data, plan, today).current,
    next,
    running,
    at: now,
  };
}

export type WallTheme = 'light' | 'dark';
export interface WallOptions {
  width: number;
  height: number;
  theme: WallTheme;
  /** 잠금화면 시계 자리(위쪽)를 비움 */
  lockSpace: boolean;
}

const FONT = '"Gowun Dodum", system-ui, -apple-system, sans-serif';
const WD = ['일', '월', '화', '수', '목', '금', '토'];

/** 그리기 전에 필요한 글자(웹폰트 부분집합)를 미리 받아둠 */
export async function loadWallFont(info: WallInfo) {
  if (typeof document === 'undefined' || !document.fonts) return;
  const text = ['D-0123456789:/·+개더오늘공부할일목표이번주연속쉬는날밀린항목다음일정까지수능업데이트월화수목금토일요일전부완료측정중', info.phase, info.off ?? '', info.next?.title ?? '', ...info.tasks.map((t) => t.title), ...info.bySubject.map((s) => subjectOf(s.subject).name)].join('');
  try { await document.fonts.load(`40px ${FONT}`, text); } catch {}
}

const palette = (t: WallTheme) => t === 'dark'
  ? { bg: '#050506', fg: '#f4f4f5', muted: 'rgba(244,244,245,0.55)', faint: 'rgba(244,244,245,0.28)', card: 'rgba(39,39,42,0.62)', line: 'rgba(255,255,255,0.08)', track: 'rgba(255,255,255,0.10)', amber: '#fbbf24', blob: 0.22, check: '#f4f4f5', checkInk: '#18181b' }
  : { bg: '#f5f5f7', fg: '#18181b', muted: 'rgba(24,24,27,0.55)', faint: 'rgba(24,24,27,0.28)', card: 'rgba(255,255,255,0.72)', line: 'rgba(0,0,0,0.06)', track: 'rgba(0,0,0,0.07)', amber: '#d97706', blob: 0.55, check: '#18181b', checkInk: '#ffffff' };

function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h);
}

function fit(ctx: CanvasRenderingContext2D, s: string, max: number) {
  if (ctx.measureText(s).width <= max) return s;
  let lo = 0, hi = s.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (ctx.measureText(s.slice(0, mid) + '…').width <= max) lo = mid; else hi = mid - 1;
  }
  return s.slice(0, lo) + '…';
}

export function drawWallpaper(canvas: HTMLCanvasElement, info: WallInfo, o: WallOptions) {
  const { width: W, height: H } = o;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const c = palette(o.theme);
  const land = W > H * 1.05;
  // 기준 단위: 세로는 폭 390pt, 가로는 높이 800 기준
  const u = land ? H / 800 : Math.min(W / 390, H / 700);

  // 배경 + 과목색 흐릿한 원
  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, W, H);
  const blobs: [number, number, number, string][] = [
    [0.1, 0.15, 0.55, subjectOf('math').color], [0.95, 0.35, 0.5, subjectOf('kor').color],
    [0.2, 0.75, 0.5, subjectOf('eng').color], [0.9, 0.95, 0.45, subjectOf('sci').color],
  ];
  ctx.save();
  ctx.globalAlpha = c.blob;
  for (const [bx, by, br, col] of blobs) {
    const r = br * Math.max(W, H);
    const g = ctx.createRadialGradient(bx * W, by * H, 0, bx * W, by * H, r);
    g.addColorStop(0, col);
    g.addColorStop(1, col + '00');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();

  const font = (px: number) => `${Math.round(px * u)}px ${FONT}`;
  const text = (s: string, x: number, y: number, px: number, color: string, align: CanvasTextAlign = 'left') => {
    ctx.font = font(px);
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(s, x, y);
  };
  const card = (x: number, y: number, w: number, h: number) => {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.06)';
    ctx.shadowBlur = 24 * u;
    ctx.shadowOffsetY = 6 * u;
    rrect(ctx, x, y, w, h, 26 * u);
    ctx.fillStyle = c.card;
    ctx.fill();
    ctx.restore();
    rrect(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 26 * u);
    ctx.strokeStyle = c.line;
    ctx.lineWidth = Math.max(1, u);
    ctx.stroke();
  };

  const [, mo, da] = info.date.split('-').map(Number);
  const dateLine = `${mo}월 ${da}일 ${WD[weekday(info.date)]}요일 · ${info.phase}`;
  const pad = 22 * u;

  // ── 영역 나누기
  let colA: { x: number; y: number; w: number }; // D-day + 시간
  let colB: { x: number; y: number; w: number; bottom: number }; // 할 일
  let footY: number;
  if (land) {
    const gx = W * 0.07;
    const top = H * 0.12;
    const cw = Math.min(W * 0.36, 520 * u);
    colA = { x: gx, y: top, w: cw };
    colB = { x: W - gx - cw, y: top, w: cw, bottom: H * 0.88 };
    footY = H * 0.88;
  } else {
    const cw = Math.min(W - pad * 2, 420 * u);
    const x = (W - cw) / 2;
    const top = o.lockSpace ? H * 0.255 : H * 0.07;
    colA = { x, y: top, w: cw };
    colB = { x, y: 0, w: cw, bottom: H - (o.lockSpace ? 100 : 60) * u };
    footY = colB.bottom;
  }

  // ── D-day
  let y = colA.y;
  text('2028 수능까지', colA.x + 4 * u, y + 16 * u, 15, c.muted);
  ctx.font = font(76);
  const dTxt = info.dday > 0 ? `D-${info.dday}` : info.dday === 0 ? 'D-DAY' : `D+${-info.dday}`;
  text(dTxt, colA.x - 2 * u, y + 86 * u, 72, c.fg);
  text(dateLine, colA.x + 4 * u, y + 113 * u, 15, c.muted);
  y += 130 * u;

  // ── 오늘 공부 카드
  const tH = 124 * u;
  card(colA.x, y, colA.w, tH);
  const ix = colA.x + 20 * u, iw = colA.w - 40 * u;
  text(info.running ? `오늘 공부 · ${subjectOf(info.running).name} 측정 중` : '오늘 공부', ix, y + 30 * u, 13, c.muted);
  text(`이번 주 ${fmtMin(info.week)} · 연속 ${info.streak}일`, ix + iw, y + 30 * u, 13, c.muted, 'right');
  text(fmtMin(info.minutes), ix, y + 72 * u, 40, c.fg);
  ctx.font = font(40);
  const tw = ctx.measureText(fmtMin(info.minutes)).width;
  text(`/ 목표 ${fmtMin(info.target)}`, ix + tw + 10 * u, y + 72 * u, 15, c.muted);
  const pct = info.target ? Math.round((info.minutes / info.target) * 100) : 0;
  text(`${pct}%`, ix + iw, y + 72 * u, 15, c.muted, 'right');
  // 과목별 막대
  const by = y + 88 * u, bh = 8 * u;
  rrect(ctx, ix, by, iw, bh, bh / 2);
  ctx.fillStyle = c.track;
  ctx.fill();
  const scale = Math.max(info.target, info.minutes, 1);
  ctx.save();
  rrect(ctx, ix, by, iw, bh, bh / 2);
  ctx.clip();
  let bx = ix;
  for (const s of info.bySubject) {
    const w = (s.min / scale) * iw;
    ctx.fillStyle = subjectOf(s.subject).color;
    ctx.fillRect(bx, by, w, bh);
    bx += w;
  }
  ctx.restore();
  // 과목 범례 (상위 4개)
  let lx = ix;
  ctx.font = font(11.5);
  for (const s of info.bySubject.slice(0, 4)) {
    const label = `${subjectOf(s.subject).name} ${fmtMin(s.min)}`;
    const lw = ctx.measureText(label).width + 22 * u;
    if (lx + lw > ix + iw) break;
    ctx.beginPath();
    ctx.arc(lx + 4 * u, by + 25 * u, 4 * u, 0, Math.PI * 2);
    ctx.fillStyle = subjectOf(s.subject).color;
    ctx.fill();
    text(label, lx + 12 * u, by + 29 * u, 11.5, c.muted);
    lx += lw;
  }
  if (!info.bySubject.length) text('아직 기록 없음', ix, by + 29 * u, 11.5, c.faint);
  y += tH + 14 * u;

  // ── 할 일 카드
  const listTop = land ? colB.y : y;
  const done = info.tasks.filter((t) => t.done).length;
  const rowH = 37 * u, headH = 48 * u, foot = 12 * u;
  const extraLines = info.overdue > 0 ? 1 : 0;
  const avail = colB.bottom - listTop - headH - foot - extraLines * 30 * u;
  const maxRows = Math.max(2, Math.floor(avail / rowH));
  // 미완료 먼저, 완료는 뒤로. 넘치면 마지막 줄은 '+N개 더'
  const ordered = [...info.tasks.filter((t) => !t.done), ...info.tasks.filter((t) => t.done)];
  let shown = ordered;
  let more = 0;
  if (ordered.length > maxRows) {
    shown = ordered.slice(0, maxRows - 1);
    more = ordered.length - shown.length;
  }
  const rows = Math.max(1, shown.length) + (more ? 1 : 0);
  const lH = headH + rows * rowH + extraLines * 30 * u + foot;
  card(colB.x, listTop, colB.w, lH);
  const lx0 = colB.x + 20 * u, lw0 = colB.w - 40 * u;
  text('오늘 할 일', lx0, listTop + 32 * u, 15, c.fg);
  text(info.tasks.length ? `${done} / ${info.tasks.length}` : '', lx0 + lw0, listTop + 32 * u, 14, c.muted, 'right');
  let ry = listTop + headH;
  if (!info.tasks.length) {
    text(info.off ? `쉬는 날 · ${info.off}` : '배정된 할 일이 없어요', lx0, ry + rowH / 2 + 5 * u, 14, c.muted);
    ry += rowH;
  }
  for (const t of shown) {
    const cy = ry + rowH / 2;
    const r = 9.5 * u;
    ctx.beginPath();
    ctx.arc(lx0 + r, cy, r, 0, Math.PI * 2);
    if (t.done) {
      ctx.fillStyle = c.check;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(lx0 + r - 4.5 * u, cy + 0.3 * u);
      ctx.lineTo(lx0 + r - 1.3 * u, cy + 3.5 * u);
      ctx.lineTo(lx0 + r + 4.6 * u, cy - 3.3 * u);
      ctx.strokeStyle = c.checkInk;
      ctx.lineWidth = 2 * u;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    } else {
      ctx.strokeStyle = c.faint;
      ctx.lineWidth = 1.6 * u;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(lx0 + 2 * r + 14 * u, cy, 4 * u, 0, Math.PI * 2);
    ctx.fillStyle = subjectOf(t.subject).color;
    ctx.fill();
    const tx = lx0 + 2 * r + 26 * u;
    ctx.font = font(14.5);
    const s = fit(ctx, t.title, lx0 + lw0 - tx);
    text(s, tx, cy + 5 * u, 14.5, t.done ? c.faint : c.fg);
    if (t.done) {
      const sw = ctx.measureText(s).width;
      ctx.beginPath();
      ctx.moveTo(tx, cy);
      ctx.lineTo(tx + sw, cy);
      ctx.strokeStyle = c.faint;
      ctx.lineWidth = 1.2 * u;
      ctx.stroke();
    }
    ry += rowH;
  }
  if (more) {
    text(`+ ${more}개 더`, lx0 + 2 * 9.5 * u + 26 * u, ry + rowH / 2 + 5 * u, 13.5, c.muted);
    ry += rowH;
  }
  if (info.tasks.length && done === info.tasks.length) {
    text('전부 완료!', lx0 + lw0, listTop + 32 * u, 14, c.fg, 'right');
  }
  if (info.overdue > 0) text(`밀린 항목 ${info.overdue}개 · 최근 2주`, lx0, ry + 18 * u, 13, c.amber);

  // ── 아래: 다음 일정 + 갱신 시각
  const at = new Date(info.at + 9 * 3600000);
  const stamp = `${at.getUTCMonth() + 1}/${at.getUTCDate()} ${String(at.getUTCHours()).padStart(2, '0')}:${String(at.getUTCMinutes()).padStart(2, '0')} 업데이트`;
  const fx = land ? colA.x : colB.x;
  if (land) {
    if (info.next) text(`다음 일정 · ${info.next.title} D-${info.next.days}`, colA.x + 6 * u, y + 10 * u, 13, c.muted);
    text(stamp, colA.x + 6 * u, footY, 11, c.faint);
  } else {
    const line = [info.next ? `다음 일정 · ${info.next.title} D-${info.next.days}` : '', stamp].filter(Boolean).join('   ·   ');
    ctx.font = font(11);
    text(fit(ctx, line, colB.w), fx + colB.w / 2, Math.min(footY + 30 * u, listTop + lH + 28 * u), 11, c.faint, 'center');
  }
}

export interface WallSize { id: string; label: string; w: number; h: number }
export const WALL_SIZES: WallSize[] = [
  { id: 'iphone', label: '아이폰 (15·16)', w: 1179, h: 2556 },
  { id: 'iphone-max', label: '아이폰 Pro Max', w: 1320, h: 2868 },
  { id: 'galaxy', label: '갤럭시 S', w: 1080, h: 2340 },
  { id: 'ipad', label: '아이패드', w: 1640, h: 2360 },
  { id: 'fhd', label: 'PC 1920×1080', w: 1920, h: 1080 },
  { id: 'qhd', label: 'PC 2560×1440', w: 2560, h: 1440 },
];

/** 지금 이 기기 화면의 실제 픽셀 크기 */
export function deviceSize(): WallSize | null {
  if (typeof window === 'undefined') return null;
  const dpr = window.devicePixelRatio || 1;
  const w = Math.round(screen.width * dpr), h = Math.round(screen.height * dpr);
  if (!w || !h) return null;
  return { id: 'device', label: `이 기기 (${w}×${h})`, w, h };
}
