import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DEFAULT_SCHOOL, DEFAULT_TARGETS } from '../seed/calendar';
import type { Backend } from './firebase';
import { generatePlan, withReviews, type Plan } from './plan';
import type { AppData, DayRecord, Score, Settings, WrongNote } from './types';

export const defaultSettings = (): Settings => ({
  school: DEFAULT_SCHOOL,
  extraHolidays: [],
  extraOff: [],
  extraStudy: [],
  targets: DEFAULT_TARGETS,
  runningTimer: null,
});
export const emptyDay = (): DayRecord => ({ checks: {}, edits: {}, custom: [], logs: [] });

const normSettings = (s?: Partial<Settings>): Settings => {
  const d = defaultSettings();
  return { ...d, ...s, school: { ...d.school, ...s?.school }, targets: { ...d.targets, ...s?.targets } };
};
const normDay = (d?: Partial<DayRecord>): DayRecord => ({ ...emptyDay(), ...d });

interface Ctx {
  data: AppData;
  plan: Plan;
  loaded: boolean;
  day: (date: string) => DayRecord;
  updateDay: (date: string, fn: (d: DayRecord) => DayRecord) => void;
  updateSettings: (fn: (s: Settings) => Settings) => void;
  saveScore: (s: Score) => void;
  deleteScore: (id: string) => void;
  saveWrong: (w: WrongNote) => void;
  deleteWrong: (id: string) => void;
  replaceAll: (d: AppData) => Promise<void>;
  /** 이 날짜 이전의 일별 기록·성적·오답노트를 모두 삭제 (연습 기간 정리) */
  clearBefore: (date: string) => void;
}

const StoreCtx = createContext<Ctx>(null as unknown as Ctx);
export const useStore = () => useContext(StoreCtx);

export function StoreProvider({ backend, children }: { backend: Backend; children: ReactNode }) {
  const [data, setData] = useState<AppData>({ settings: defaultSettings(), days: {}, scores: {}, wrongs: {} });
  const [loaded, setLoaded] = useState(false);
  const ref = useRef(data);
  ref.current = data;

  useEffect(
    () =>
      backend.subscribe((p) => {
        setData((d) => ({
          settings: p.settings ? normSettings(p.settings) : d.settings,
          days: p.days ?? d.days,
          scores: p.scores ?? d.scores,
          wrongs: p.wrongs ?? d.wrongs,
        }));
        setLoaded(true);
      }),
    [backend],
  );

  const updateDay = useCallback((date: string, fn: (d: DayRecord) => DayRecord) => {
    const next = fn(normDay(ref.current.days[date]));
    setData((d) => ({ ...d, days: { ...d.days, [date]: next } }));
    backend.saveDay(date, next);
  }, [backend]);

  const updateSettings = useCallback((fn: (s: Settings) => Settings) => {
    const next = fn(ref.current.settings);
    setData((d) => ({ ...d, settings: next }));
    backend.saveSettings(next);
  }, [backend]);

  const saveScore = useCallback((s: Score) => {
    setData((d) => ({ ...d, scores: { ...d.scores, [s.id]: s } }));
    backend.saveScore(s);
  }, [backend]);

  const deleteScore = useCallback((id: string) => {
    setData((d) => {
      const scores = { ...d.scores };
      delete scores[id];
      return { ...d, scores };
    });
    backend.deleteScore(id);
  }, [backend]);

  const saveWrong = useCallback((w: WrongNote) => {
    setData((d) => ({ ...d, wrongs: { ...d.wrongs, [w.id]: w } }));
    backend.saveWrong(w);
  }, [backend]);

  const deleteWrong = useCallback((id: string) => {
    setData((d) => {
      const wrongs = { ...d.wrongs };
      delete wrongs[id];
      return { ...d, wrongs };
    });
    backend.deleteWrong(id);
  }, [backend]);

  const clearBefore = useCallback((date: string) => {
    const cur = ref.current;
    for (const k of Object.keys(cur.days)) if (k < date) backend.deleteDay(k);
    for (const s of Object.values(cur.scores)) if (s.date < date) backend.deleteScore(s.id);
    for (const w of Object.values(cur.wrongs)) if (w.date < date) backend.deleteWrong(w.id);
    const keep = <T,>(o: Record<string, T>, f: (k: string, v: T) => boolean) => Object.fromEntries(Object.entries(o).filter(([k, v]) => f(k, v)));
    setData((d) => ({
      ...d,
      days: keep(d.days, (k) => k >= date),
      scores: keep(d.scores, (_, v) => v.date >= date),
      wrongs: keep(d.wrongs, (_, v) => v.date >= date),
    }));
  }, [backend]);

  const replaceAll = useCallback(async (d: AppData) => {
    const next = { settings: normSettings(d.settings), days: d.days ?? {}, scores: d.scores ?? {}, wrongs: d.wrongs ?? {} };
    await backend.replaceAll(next);
    setData(next);
  }, [backend]);

  // 커리 생성은 일정 관련 설정이 바뀔 때만 다시 계산
  const s = data.settings;
  const planKey = JSON.stringify([s.school, s.extraHolidays, s.extraOff, s.extraStudy]);
  const basePlan = useMemo(() => generatePlan(s), [planKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const plan = useMemo(() => withReviews(basePlan, data.wrongs), [basePlan, data.wrongs]);

  const day = useCallback((date: string) => normDay(data.days[date]), [data.days]);

  return (
    <StoreCtx.Provider value={{ data, plan, loaded, day, updateDay, updateSettings, saveScore, deleteScore, saveWrong, deleteWrong, replaceAll, clearBefore }}>
      {children}
    </StoreCtx.Provider>
  );
}
