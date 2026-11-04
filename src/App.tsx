import { onAuthStateChanged, type User } from 'firebase/auth';
import { useEffect, useMemo, useState } from 'react';
import { DayDetail } from './components/DayDetail';
import { diffDays, kstToday } from './lib/date';
import { ALLOWED_EMAIL, auth, firebaseEnabled, firestoreBackend, localBackend, login, logout } from './lib/firebase';
import { StoreProvider, useStore } from './lib/store';
import { EXAM_DATE } from './seed/calendar';
import { CalendarView } from './views/CalendarView';
import { ScoresView } from './views/ScoresView';
import { SettingsView } from './views/SettingsView';
import { StatsView } from './views/StatsView';

type View = 'calendar' | 'today' | 'stats' | 'scores' | 'settings';
const NAV: [View, string, string][] = [
  ['calendar', '달력', '📅'],
  ['today', '오늘', '✅'],
  ['stats', '통계', '📊'],
  ['scores', '성적', '📝'],
  ['settings', '설정', '⚙️'],
];

function Shell({ email }: { email?: string | null }) {
  const [view, setView] = useState<View>(() => { try { return (sessionStorage.getItem('view') as View) || 'today'; } catch { return 'today'; } });
  const { loaded } = useStore();
  const today = kstToday();
  useEffect(() => { try { sessionStorage.setItem('view', view); } catch {} }, [view]);
  const dday = diffDays(today, EXAM_DATE);

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl">
      <nav className="sticky top-0 hidden h-screen w-48 shrink-0 flex-col gap-1 border-r border-slate-200 p-3 dark:border-slate-800 md:flex">
        <div className="mb-3 px-2">
          <div className="text-sm font-bold">2028 수능 플래너</div>
          <div className="text-xs muted">수능 D-{dday}</div>
        </div>
        {NAV.map(([v, l, i]) => (
          <button key={v} onClick={() => setView(v)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${view === v ? 'bg-slate-200 font-semibold dark:bg-slate-800' : 'hover:bg-slate-100 dark:hover:bg-slate-900'}`}>
            <span>{i}</span>{l}
          </button>
        ))}
      </nav>
      <main className="min-w-0 flex-1 px-4 pb-24 pt-4 md:px-6 md:pb-8">
        <div className="mb-3 flex items-center justify-between md:hidden">
          <span className="text-sm font-bold">2028 수능 플래너</span>
          <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-bold text-white dark:bg-slate-100 dark:text-slate-900">D-{dday}</span>
        </div>
        {!loaded ? <p className="muted">불러오는 중…</p> : (
          <>
            {view === 'calendar' && <CalendarView />}
            {view === 'today' && <div className="mx-auto max-w-xl"><DayDetail date={today} /></div>}
            {view === 'stats' && <StatsView />}
            {view === 'scores' && <ScoresView />}
            {view === 'settings' && <SettingsView email={email} />}
          </>
        )}
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 md:hidden">
        {NAV.map(([v, l, i]) => (
          <button key={v} onClick={() => setView(v)} className={`flex flex-col items-center py-2 text-[11px] ${view === v ? 'font-bold' : 'muted'}`}>
            <span className="text-lg leading-none">{i}</span>{l}
          </button>
        ))}
      </nav>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null | undefined>(firebaseEnabled ? undefined : null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!firebaseEnabled) return;
    return onAuthStateChanged(auth!, async (u) => {
      if (u && ALLOWED_EMAIL && u.email?.toLowerCase() !== ALLOWED_EMAIL) {
        setErr(`${u.email} 계정은 허용되지 않았습니다.`);
        await logout();
        return;
      }
      setUser(u);
    });
  }, []);

  const backend = useMemo(() => (firebaseEnabled ? (user ? firestoreBackend(user.uid) : null) : localBackend()), [user]);

  if (firebaseEnabled && user === undefined) return <div className="p-8 text-center muted">로딩…</div>;
  if (!backend)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
        <h1 className="text-xl font-bold">2028 수능 플래너</h1>
        <button className="btn-primary px-6 py-2.5" onClick={() => login().catch((e) => setErr(e.message))}>Google로 로그인</button>
        {err && <p className="text-sm text-red-600">{err}</p>}
      </div>
    );
  return (
    <StoreProvider backend={backend} key={user?.uid ?? 'local'}>
      <Shell email={user?.email} />
    </StoreProvider>
  );
}
