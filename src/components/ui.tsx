import { useEffect, type CSSProperties, type ReactNode } from 'react';
import { subjectOf, SUBJECTS } from '../seed/subjects';

/** 과목 글자색: 라이트=진한색, 다크=파스텔 (className 'subj-ink' 와 함께 사용) */
export const inkVars = (id: string) => {
  const s = subjectOf(id);
  return { '--ink': s.ink, '--pastel': s.color } as CSSProperties;
};

export function Dot({ subject, filled = true, size = 8 }: { subject: string; filled?: boolean; size?: number }) {
  const c = subjectOf(subject).color;
  return (
    <span
      className="inline-block shrink-0 rounded-full"
      style={{ width: size, height: size, background: filled ? c : 'transparent', boxShadow: `inset 0 0 0 1.5px ${c}` }}
    />
  );
}

export function SubjectTag({ subject }: { subject: string }) {
  const s = subjectOf(subject);
  return (
    <span className="subj-ink inline-flex items-center gap-1 text-xs font-semibold" style={inkVars(s.id)}>
      <Dot subject={subject} /> {s.name}
    </span>
  );
}

export function SubjectSelect({ value, onChange, className = '' }: { value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <select className={`input ${className}`} value={value} onChange={(e) => onChange(e.target.value)}>
      {SUBJECTS.filter((s) => s.active).map((s) => (
        <option key={s.id} value={s.id}>{s.name}</option>
      ))}
    </select>
  );
}

/** 모바일: 하단 시트 / PC: 가운데 모달 */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl dark:bg-zinc-900 sm:max-w-lg sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold">{title}</h2>
          <button className="btn-ghost" onClick={onClose} aria-label="닫기">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="card p-3">
      <div className="label">{label}</div>
      <div className="mt-0.5 text-xl font-bold tabular-nums">{value}</div>
      {sub && <div className="text-xs muted">{sub}</div>}
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex rounded-lg bg-zinc-100 p-0.5 dark:bg-zinc-800">
      {options.map(([v, l]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`rounded-md px-2.5 py-1 text-xs font-medium ${value === v ? 'bg-white shadow-sm dark:bg-zinc-950' : 'muted'}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
