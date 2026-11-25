// 자동 배경화면 서버 갱신 (GitHub Actions, 매일 자정 직후): 날짜가 바뀌면 앱을 열지 않아도 새 D-day·오늘 할 일로 다시 그림
// 필요: 환경변수 FIREBASE_SERVICE_ACCOUNT, (선택) WALL_FONT = 고운돋움 TTF 경로
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { kstToday } from '../src/lib/date';
import { generatePlan, withReviews } from '../src/lib/plan';
import type { AppData, DayRecord, Settings, WrongNote } from '../src/lib/types';
import { drawWallpaper, encodeJpeg, wallpaperInfo } from '../src/lib/wallpaper';
import { DEFAULT_SCHOOL, DEFAULT_TARGETS } from '../src/seed/calendar';

const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!sa) { console.log('FIREBASE_SERVICE_ACCOUNT 미설정 — 건너뜀'); process.exit(0); }
const font = process.env.WALL_FONT;
if (font && !GlobalFonts.registerFromPath(font, 'Gowun Dodum')) console.log('폰트 등록 실패:', font);

initializeApp({ credential: cert(JSON.parse(sa)) });
const db = getFirestore();
const today = kstToday();

const metas = await db.collectionGroup('meta').get();
for (const doc of metas.docs) {
  if (doc.id !== 'settings') continue;
  const uid = doc.ref.parent.parent!.id;
  const raw = doc.data() as Partial<Settings>;
  const wall = raw.wall;
  if (!wall?.auto || !wall.token) continue;
  const settings: Settings = {
    extraHolidays: [], extraOff: [], extraStudy: [], ...raw, runningTimer: raw.runningTimer ?? null,
    school: { ...DEFAULT_SCHOOL, ...raw.school }, targets: { ...DEFAULT_TARGETS, ...raw.targets },
  };
  const days: Record<string, DayRecord> = {};
  (await db.collection(`users/${uid}/days`).get()).forEach((d) => (days[d.id] = { checks: {}, edits: {}, custom: [], logs: [], ...(d.data() as DayRecord) }));
  const wrongs: Record<string, WrongNote> = {};
  (await db.collection(`users/${uid}/wrongs`).get()).forEach((d) => (wrongs[d.id] = d.data() as WrongNote));
  const data: AppData = { settings, days, scores: {}, wrongs };
  const plan = withReviews(generatePlan(settings), wrongs);

  const canvas = createCanvas(wall.w, wall.h);
  drawWallpaper(canvas, wallpaperInfo(data, plan, today), { width: wall.w, height: wall.h, theme: wall.theme, lockSpace: wall.lockSpace });
  const img = encodeJpeg((q) => canvas.toDataURL('image/jpeg', q));
  if (process.env.WALL_OUT) (await import('node:fs')).writeFileSync(process.env.WALL_OUT, Buffer.from(img, 'base64'));
  await db.doc(`wallpapers/${wall.token}`).set({ img, at: Date.now() });
  console.log(uid, today, `배경화면 갱신 (${Math.round(img.length / 1024)}KB)`);
}
