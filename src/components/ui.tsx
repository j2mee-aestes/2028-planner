import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { SUBJECTS, subjectOf } from '../seed/subjects';
import { IconChevronDown, IconClose } from './icons';

/** 과목 글자색: 라이트=진한색, 다크=파스텔 (className 'subj-ink' 와 함께 사용) */
export const inkVars = (id: string) => {
  const s = subjectOf(id);
  return { '--ink': s.ink, '--pastel': s.color } as CSSProperties;
};

export function Dot({ subject, filled = true, size = 8 }: { subject: string; filled?: boolean; size?: number }) {
  const c = subjectOf(subject).color;
  return (
    <span className="inline-block shrink-0 rounded-full"
      style={{ width: size, height: size, background: filled ? c : 'transparent', boxShadow: `inset 0 0 0 1.5px ${c}` }} />
  );
}

export function SubjectTag({ subject }: { subject: string }) {
  const s = subjectOf(subject);
  return (
    <span className="subj-ink inline-flex items-center gap-1 text-xs" style={inkVars(s.id)}>
      <Dot subject={subject} /> {s.name}
    </span>
  );
}

export function SubjectSelect({ value, onChange, className = '' }: { value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <select className={`input ${className}`} value={value} onChange={(e) => onChange(e.target.value)}>
      {SUBJECTS.filter((s) => s.active).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
    </select>
  );
}

/** iOS 스타일 둥근 체크 */
export function Check({ checked, onChange, label }: { checked: boolean; onChange: () => void; label?: string }) {
  return (
    <button role="checkbox" aria-checked={checked} aria-label={label} onClick={onChange}
      className="press -m-1.5 flex shrink-0 items-center justify-center p-1.5">
      <span className={`flex h-[22px] w-[22px] items-center justify-center rounded-full transition-colors duration-200 ${
        checked ? 'check-on bg-zinc-900 dark:bg-zinc-100' : 'border-[1.7px] border-zinc-300 dark:border-zinc-600'}`}>
        {checked && (
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" className="text-white dark:text-zinc-900">
            <path d="M3 7.3l2.6 2.6L11 4.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
    </button>
  );
}

/** 시트: 모바일은 아래에서 올라오고 아래로 끌어 닫기, PC는 가운데 팝업. 배경 블러 */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode }) {
  const [closing, setClosing] = useState(false);
  const [drag, setDrag] = useState(0);
  const [touched, setTouched] = useState(false);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ y: number; t: number } | null>(null);
  const close = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(() => { setClosing(false); setDrag(0); setTouched(false); onClose(); }, 240);
  };
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', k);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = ''; };
  });
  if (!open) return null;

  const onDown = (e: React.PointerEvent) => { start.current = { y: e.clientY, t: Date.now() }; setTouched(true); setDragging(true); (e.target as Element).setPointerCapture?.(e.pointerId); };
  const onMove = (e: React.PointerEvent) => { if (start.current) setDrag(Math.max(0, e.clientY - start.current.y)); };
  const onUp = (e: React.PointerEvent) => {
    if (!start.current) return;
    const dy = e.clientY - start.current.y;
    const v = dy / Math.max(1, Date.now() - start.current.t);
    start.current = null;
    setDragging(false);
    if (dy > 110 || v > 0.6) close();
    else setDrag(0);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div className={`sheet-backdrop absolute inset-0 bg-black/25 backdrop-blur-[6px] ${closing ? 'closing' : ''}`} onClick={close} />
      <div className={`sheet-panel relative flex max-h-[92vh] w-full flex-col rounded-t-[28px] bg-white/95 shadow-2xl backdrop-blur-xl dark:bg-zinc-900/95 sm:max-w-lg sm:rounded-[24px] ${closing ? 'closing' : ''}`}
        style={!touched ? undefined : closing ? { transform: `translateY(${drag}px)` }
          : { transform: `translateY(${drag}px)`, animation: 'none', transition: dragging ? 'none' : 'transform .4s var(--ease-spring)' }}>
        <div className="cursor-grab touch-none px-5 pb-2 pt-2 sm:pt-4" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700 sm:hidden" />
          <div className="flex items-center justify-between">
            <h2 className="text-base">{title}</h2>
            <button className="icon-btn h-8 w-8 bg-zinc-100 dark:bg-zinc-800" onClick={close} aria-label="닫기"><IconClose size={16} /></button>
          </div>
        </div>
        <div className="overflow-y-auto overscroll-contain px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="card p-4">
      <div className="label">{label}</div>
      <div className="mt-1 text-2xl tabular-nums">{value}</div>
      {sub && <div className="mt-0.5 text-xs muted">{sub}</div>}
    </div>
  );
}

/** iOS 세그먼트: 선택 표시가 미끄러지듯 이동 */
export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  const i = Math.max(0, options.findIndex(([v]) => v === value));
  return (
    <div className="relative inline-grid rounded-full bg-zinc-100 p-[3px] dark:bg-zinc-800" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      <span className="absolute bottom-[3px] left-[3px] top-[3px] rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.12)] transition-transform duration-300 dark:bg-zinc-600"
        style={{ width: `calc((100% - 6px) / ${options.length})`, transform: `translateX(${i * 100}%)`, transitionTimingFunction: 'var(--ease-spring)' }} />
      {options.map(([v, l]) => (
        <button key={v} onClick={() => onChange(v)}
          className={`press relative z-10 whitespace-nowrap rounded-full px-3 py-1 text-xs transition-colors ${value === v ? '' : 'muted'}`}>
          {l}
        </button>
      ))}
    </div>
  );
}

/** 펼침/접힘: 높이가 부드럽게 변함 */
export function Disclosure({ title, children, className = '' }: { title: ReactNode; children: ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={className}>
      <button className="press flex w-full items-center gap-1.5 text-left" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="flex-1">{title}</span>
        <IconChevronDown size={16} className="transition-transform duration-300" style={{ transform: open ? 'rotate(180deg)' : undefined, transitionTimingFunction: 'var(--ease-spring)' }} />
      </button>
      <div className="grid transition-[grid-template-rows] duration-300" style={{ gridTemplateRows: open ? '1fr' : '0fr', transitionTimingFunction: 'var(--ease-spring)' }}>
        <div className="overflow-hidden" {...(open ? {} : { inert: '', 'aria-hidden': true })}>{children}</div>
      </div>
    </div>
  );
}

const TOAST_EVENT = 'planner:toast';
/** 화면 아래에 잠깐 뜨는 안내 */
export const toast = (msg: string) => window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: msg }));

export function Toaster() {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    const f = (e: Event) => {
      setMsg((e as CustomEvent<string>).detail);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setMsg(null), 2600);
    };
    window.addEventListener(TOAST_EVENT, f);
    return () => window.removeEventListener(TOAST_EVENT, f);
  }, []);
  if (!msg) return null;
  return createPortal(
    <div key={msg} role="status" className="toast-in glass fixed left-1/2 top-[max(1rem,env(safe-area-inset-top))] z-[70] -translate-x-1/2 rounded-full border border-white/50 px-5 py-2.5 text-sm shadow-[0_8px_30px_rgba(0,0,0,0.14)] dark:border-zinc-700/50">
      {msg}
    </div>,
    document.body,
  );
}
