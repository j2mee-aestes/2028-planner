import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DEFAULT_SCHOOL, DEFAULT_TARGETS } from '../seed/calendar';
import type { Backend } from './firebase';
import { generatePlan, type Plan } from './plan';
import type { AppData, DayRecord, Score, Settings } from './types';

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
  replaceAll: (d: AppData) => Promise<void>;
}

const StoreCtx = createContext<Ctx>(null as unknown as Ctx);
export const useStore = () => useContext(StoreCtx);

export function StoreProvider({ backend, children }: { backend: Backend; children: ReactNode }) {
  const [data, setData] = useState<AppData>({ settings: defaultSettings(), days: {}, scores: {} });
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

  const replaceAll = useCallback(async (d: AppData) => {
    const next = { settings: normSettings(d.settings), days: d.days ?? {}, scores: d.scores ?? {} };
    await backend.replaceAll(next);
    setData(next);
  }, [backend]);

  // 커리 생성은 일정 관련 설정이 바뀔 때만 다시 계산
  const s = data.settings;
  const planKey = JSON.stringify([s.school, s.extraHolidays, s.extraOff, s.extraStudy]);
  const plan = useMemo(() => generatePlan(s), [planKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const day = useCallback((date: string) => normDay(data.days[date]), [data.days]);

  return (
    <StoreCtx.Provider value={{ data, plan, loaded, day, updateDay, updateSettings, saveScore, deleteScore, replaceAll }}>
      {children}
    </StoreCtx.Provider>
  );
}
