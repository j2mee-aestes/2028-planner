// 휴대폰 알림 발송 (GitHub Actions 에서 실행, 무료)
// 사용: node send.mjs morning | saturday
// 필요: 환경변수 FIREBASE_SERVICE_ACCOUNT (서비스 계정 JSON 전체)
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { diffDays, kstToday } from '../src/lib/date';
import { generatePlan, withReviews } from '../src/lib/plan';
import { postponedList, tasksOf } from '../src/lib/stats';
import type { AppData, DayRecord, Settings, WrongNote } from '../src/lib/types';
import { DEFAULT_SCHOOL, DEFAULT_TARGETS, EXAM_DATE } from '../src/seed/calendar';

const mode = process.argv[2] === 'saturday' ? 'saturday' : 'morning';
const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!sa) { console.log('FIREBASE_SERVICE_ACCOUNT 미설정 — 건너뜀'); process.exit(0); }

initializeApp({ credential: cert(JSON.parse(sa)) });
const db = getFirestore();
const fcm = getMessaging();
const today = kstToday();

const metas = await db.collectionGroup('meta').get();
for (const doc of metas.docs) {
  if (doc.id !== 'settings') continue;
  const uid = doc.ref.parent.parent!.id;
  const raw = doc.data() as Partial<Settings>;
  const push = raw.push;
  if (!push?.tokens?.length || !push[mode]) continue;
  const settings: Settings = {
    extraHolidays: [], extraOff: [], extraStudy: [], runningTimer: null, ...raw,
    school: { ...DEFAULT_SCHOOL, ...raw.school }, targets: { ...DEFAULT_TARGETS, ...raw.targets },
  };
  const days: Record<string, DayRecord> = {};
  (await db.collection(`users/${uid}/days`).get()).forEach((d) => (days[d.id] = { checks: {}, edits: {}, custom: [], logs: [], ...(d.data() as DayRecord) }));
  const wrongs: Record<string, WrongNote> = {};
  (await db.collection(`users/${uid}/wrongs`).get()).forEach((d) => (wrongs[d.id] = d.data() as WrongNote));
  const data: AppData = { settings, days, scores: {}, wrongs };
  const plan = withReviews(generatePlan(settings), wrongs);

  let title = '2028 수능 플래너';
  let body: string;
  const dday = diffDays(today, EXAM_DATE);
  if (mode === 'morning') {
    if (plan.off.has(today)) { console.log(uid, '쉬는 날 — 건너뜀'); continue; }
    const tasks = tasksOf(plan, today, days[today] ?? { checks: {}, edits: {}, custom: [], logs: [] });
    title = `수능 D-${dday}`;
    body = `오늘 할 일 ${tasks.length}개. 좋은 하루 시작해요!`;
  } else {
    const n = postponedList(plan, data).length;
    if (!n) { console.log(uid, '미룬 할 일 없음 — 건너뜀'); continue; }
    title = '토요일 정리 시간';
    body = `미룬 할 일 ${n}개를 정리하고 이번 주 회고를 남겨요`;
  }

  const res = await fcm.sendEachForMulticast({
    tokens: push.tokens,
    webpush: { notification: { title, body, icon: '/icon-192.png' }, fcmOptions: { link: '/' } },
    data: { title, body, url: '/', tag: mode },
  });
  const dead = res.responses.flatMap((r, i) =>
    !r.success && ['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'].includes(r.error?.code ?? '') ? [push.tokens[i]] : []);
  if (dead.length) await doc.ref.update({ 'push.tokens': push.tokens.filter((t) => !dead.includes(t)) });
  console.log(uid, mode, `성공 ${res.successCount} / 실패 ${res.failureCount}`, dead.length ? `(만료 토큰 ${dead.length}개 정리)` : '');
}
