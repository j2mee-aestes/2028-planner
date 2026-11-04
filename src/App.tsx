import { onAuthStateChanged, type User } from 'firebase/auth';
import { useEffect, useMemo, useState } from 'react';
import { DayDetail } from './components/DayDetail';
import { IconCalendar, IconChart, IconScore, IconSettings, IconToday } from './components/icons';
import { FocusTimer } from './components/FocusTimer';
import { PracticeReset } from './components/PracticeReset';
import { PostponedSheet, usePostponed } from './components/PostponedSheet';
import { Toaster } from './components/ui';
import { diffDays, kstToday, weekday } from './lib/date';
import { ALLOWED_EMAIL, auth, firebaseEnabled, firestoreBackend, localBackend, login, logout } from './lib/firebase';
import { StoreProvider, useStore } from './lib/store';
import { EXAM_DATE } from './seed/calendar';
import { CalendarView } from './views/CalendarView';
import { ScoresView } from './views/ScoresView';
import { SettingsView } from './views/SettingsView';
import { StatsView } from './views/StatsView';

type View = 'calendar' | 'today' | 'stats' | 'scores' | 'settings';
const NAV: [View, string, (p: { size?: number }) => JSX.Element][] = [
  ['calendar', '달력', IconCalendar],
  ['today', '오늘', IconToday],
  ['stats', '통계', IconChart],
  ['scores', '성적', IconScore],
  ['settings', '설정', IconSettings],
];

function Shell({ email }: { email?: string | null }) {
  const [view, setView] = useState<View>(() => { try { return (sessionStorage.getItem('view') as View) || 'today'; } catch { return 'today'; } });
  const { loaded } = useStore();
  const today = kstToday();
  useEffect(() => { try { sessionStorage.setItem('view', view); } catch {} }, [view]);
  const dday = diffDays(today, EXAM_DATE);

  // 매주 토요일: 미룬 할 일이 있으면 하루 한 번 자동으로 정리 창 띄우기
  const postponed = usePostponed();
  const [satPrompt, setSatPrompt] = useState(false);
  useEffect(() => {
    if (!loaded || weekday(today) !== 6 || postponed.length === 0) return;
    try {
      if (localStorage.getItem('postponed-prompt') === today) return;
      localStorage.setItem('postponed-prompt', today);
    } catch {}
    setSatPrompt(true);
  }, [loaded, today, postponed.length]);

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl">
      <nav className="sticky top-0 hidden h-screen w-52 shrink-0 flex-col gap-0.5 px-3 py-5 md:flex">
        <div className="mb-5 px-3">
          <div className="text-base">2028 수능 플래너</div>
          <div className="mt-1 inline-block rounded-full bg-zinc-900 px-2 py-0.5 text-xs text-white dark:bg-zinc-100 dark:text-zinc-900">D-{dday}</div>
        </div>
        {NAV.map(([v, l, Icon]) => (
          <button key={v} onClick={() => setView(v)}
            className={`press flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${view === v ? 'bg-white text-zinc-900 shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:bg-zinc-800 dark:text-zinc-50' : 'muted hover:bg-zinc-200/50 dark:hover:bg-zinc-900'}`}>
            <Icon size={19} />{l}
          </button>
        ))}
      </nav>
      <main className="min-w-0 flex-1 px-4 pb-28 md:px-6 md:pb-8 md:pt-5">
        <div className="glass sticky top-0 z-30 -mx-4 mb-3 flex items-center justify-between border-b border-zinc-200/60 px-4 pb-2.5 pt-[max(0.75rem,env(safe-area-inset-top))] dark:border-zinc-800/60 md:hidden">
          <span className="text-[15px]">2028 수능 플래너</span>
          <span className="rounded-full bg-zinc-900 px-2.5 py-0.5 text-xs text-white dark:bg-zinc-100 dark:text-zinc-900">D-{dday}</span>
        </div>
        {!loaded ? <p className="muted">불러오는 중…</p> : (
          <div key={view} className="anim-view">
            {view === 'calendar' && <CalendarView />}
            {view === 'today' && <div className="mx-auto max-w-xl"><DayDetail date={today} /></div>}
            {view === 'stats' && <StatsView />}
            {view === 'scores' && <ScoresView />}
            {view === 'settings' && <SettingsView email={email} />}
          </div>
        )}
      </main>
      <PostponedSheet open={satPrompt} onClose={() => setSatPrompt(false)} saturday />
      {loaded && <FocusTimer />}
      <PracticeReset />
      <Toaster />
      <nav className="glass fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 grid grid-cols-5 rounded-[26px] border border-white/50 p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:border-zinc-700/50 md:hidden">
        {NAV.map(([v, l, Icon]) => (
          <button key={v} onClick={() => setView(v)}
            className={`press flex flex-col items-center gap-0.5 rounded-[20px] py-1.5 text-[10.5px] transition-colors duration-300 ${
              view === v ? 'bg-zinc-900/[0.06] text-zinc-900 dark:bg-white/10 dark:text-white' : 'text-zinc-400 dark:text-zinc-500'}`}>
            <Icon size={22} />{l}
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
        <IconCalendar size={40} />
        <h1 className="text-xl">2028 수능 플래너</h1>
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
