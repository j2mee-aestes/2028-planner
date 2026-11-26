import { initializeApp, type FirebaseApp } from 'firebase/app';
import { GoogleAuthProvider, getAuth, signInWithPopup, signInWithRedirect, signOut, type Auth } from 'firebase/auth';
import {
  collection, deleteDoc, doc, initializeFirestore, onSnapshot, persistentLocalCache,
  persistentMultipleTabManager, setDoc, writeBatch, type Firestore,
} from 'firebase/firestore';
import { ALLOWED_EMAIL_DEFAULT, FIREBASE_CONFIG } from '../config';
import type { AppData, DayRecord, Score, Settings, WrongNote } from './types';

const env = import.meta.env;
// VITE_LOCAL_MODE=1 이면 Firebase 없이 브라우저에만 저장 (테스트용)
export const firebaseEnabled = env.VITE_LOCAL_MODE !== '1';
export const ALLOWED_EMAIL = ((env.VITE_ALLOWED_EMAIL as string | undefined) || ALLOWED_EMAIL_DEFAULT).trim().toLowerCase() || undefined;

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

if (firebaseEnabled) {
  app = initializeApp({
    apiKey: env.VITE_FIREBASE_API_KEY || FIREBASE_CONFIG.apiKey,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || FIREBASE_CONFIG.authDomain,
    projectId: env.VITE_FIREBASE_PROJECT_ID || FIREBASE_CONFIG.projectId,
    appId: env.VITE_FIREBASE_APP_ID || FIREBASE_CONFIG.appId,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || FIREBASE_CONFIG.messagingSenderId,
  });
  auth = getAuth(app);
  // 로컬 캐시 우선: 쓰기는 기기에 즉시 반영되고 서버 동기화는 백그라운드. 오프라인에서도 동작.
  db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
}

export { app, auth };

export async function login() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    await signInWithPopup(auth!, provider);
  } catch (e: any) {
    if (e?.code === 'auth/popup-blocked' || e?.code === 'auth/operation-not-supported-in-this-environment')
      await signInWithRedirect(auth!, provider);
    else throw e;
  }
}
export const logout = () => (auth ? signOut(auth) : Promise.resolve());

export interface Backend {
  subscribe(cb: (patch: Partial<AppData>) => void): () => void;
  saveSettings(s: Settings): void;
  saveDay(date: string, d: DayRecord): void;
  deleteDay(date: string): void;
  saveScore(s: Score): void;
  deleteScore(id: string): void;
  saveWrong(w: WrongNote): void;
  deleteWrong(id: string): void;
  replaceAll(d: AppData): Promise<void>;
}

const clean = <T,>(o: T): T => JSON.parse(JSON.stringify(o)); // undefined 제거 (Firestore 제약)

export function firestoreBackend(uid: string): Backend {
  const base = `users/${uid}`;
  const report = (e: unknown) => console.error('[sync]', e);
  return {
    subscribe(cb) {
      const u1 = onSnapshot(doc(db!, `${base}/meta/settings`), (s) => s.exists() && cb({ settings: s.data() as Settings }), report);
      const u2 = onSnapshot(collection(db!, `${base}/days`), (qs) => {
        const days: Record<string, DayRecord> = {};
        qs.forEach((d) => (days[d.id] = d.data() as DayRecord));
        cb({ days });
      }, report);
      const u3 = onSnapshot(collection(db!, `${base}/scores`), (qs) => {
        const scores: Record<string, Score> = {};
        qs.forEach((d) => (scores[d.id] = d.data() as Score));
        cb({ scores });
      }, report);
      const u4 = onSnapshot(collection(db!, `${base}/wrongs`), (qs) => {
        const wrongs: Record<string, WrongNote> = {};
        qs.forEach((d) => (wrongs[d.id] = d.data() as WrongNote));
        cb({ wrongs });
      }, report);
      return () => { u1(); u2(); u3(); u4(); };
    },
    saveSettings: (s) => void setDoc(doc(db!, `${base}/meta/settings`), clean(s)).catch(report),
    saveDay: (date, d) => void setDoc(doc(db!, `${base}/days/${date}`), clean(d)).catch(report),
    deleteDay: (date) => void deleteDoc(doc(db!, `${base}/days/${date}`)).catch(report),
    saveScore: (s) => void setDoc(doc(db!, `${base}/scores/${s.id}`), clean(s)).catch(report),
    deleteScore: (id) => void deleteDoc(doc(db!, `${base}/scores/${id}`)).catch(report),
    saveWrong: (w) => void setDoc(doc(db!, `${base}/wrongs/${w.id}`), clean(w)).catch(report),
    deleteWrong: (id) => void deleteDoc(doc(db!, `${base}/wrongs/${id}`)).catch(report),
    async replaceAll(data) {
      const ops: [string, unknown][] = [[`${base}/meta/settings`, data.settings]];
      for (const [k, v] of Object.entries(data.days)) ops.push([`${base}/days/${k}`, v]);
      for (const [k, v] of Object.entries(data.scores)) ops.push([`${base}/scores/${k}`, v]);
      for (const [k, v] of Object.entries(data.wrongs)) ops.push([`${base}/wrongs/${k}`, v]);
      for (let i = 0; i < ops.length; i += 100) {
        const b = writeBatch(db!);
        for (const [p, v] of ops.slice(i, i + 100)) b.set(doc(db!, p), clean(v as object));
        await b.commit();
      }
    },
  };
}

/** Firebase 미설정 시(로컬 개발) 브라우저 저장소 사용 */
export function localBackend(): Backend {
  const KEY = 'planner-data-v1';
  const read = (): Partial<AppData> => {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
  };
  const write = (fn: (d: Partial<AppData>) => void) => {
    const d = read();
    fn(d);
    try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { console.error(e); }
  };
  return {
    subscribe(cb) { cb(read()); return () => {}; },
    saveSettings: (s) => write((d) => (d.settings = s)),
    saveDay: (date, v) => write((d) => ((d.days ??= {})[date] = v)),
    deleteDay: (date) => write((d) => { if (d.days) delete d.days[date]; }),
    saveScore: (s) => write((d) => ((d.scores ??= {})[s.id] = s)),
    deleteScore: (id) => write((d) => { if (d.scores) delete d.scores[id]; }),
    saveWrong: (w) => write((d) => ((d.wrongs ??= {})[w.id] = w)),
    deleteWrong: (id) => write((d) => { if (d.wrongs) delete d.wrongs[id]; }),
    async replaceAll(data) { write((d) => Object.assign(d, data)); },
  };
}
