import type { SVGProps } from 'react';

// 플래너 전용 라인 아이콘 (24 그리드, 1.7 stroke, 둥근 끝) — 모노톤 테마에 맞춤
type P = SVGProps<SVGSVGElement> & { size?: number };

const Svg = ({ size = 20, children, ...p }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}
    strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}>
    {children}
  </svg>
);

export const IconCalendar = (p: P) => (
  <Svg {...p}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="3.5" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
    <circle cx="8.5" cy="14.5" r=".6" fill="currentColor" />
    <circle cx="12" cy="14.5" r=".6" fill="currentColor" />
    <circle cx="15.5" cy="14.5" r=".6" fill="currentColor" />
  </Svg>
);
export const IconToday = (p: P) => (
  <Svg {...p}>
    <rect x="4" y="3.5" width="16" height="17" rx="4" />
    <path d="M8.5 12.2l2.4 2.4 4.6-4.8" />
  </Svg>
);
export const IconChart = (p: P) => (
  <Svg {...p}>
    <path d="M4 20h16" />
    <rect x="5.5" y="12" width="3" height="5.5" rx="1.2" />
    <rect x="10.5" y="7.5" width="3" height="10" rx="1.2" />
    <rect x="15.5" y="4" width="3" height="13.5" rx="1.2" />
  </Svg>
);
export const IconScore = (p: P) => (
  <Svg {...p}>
    <path d="M7 3.5h7.5L19 8v10.5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2z" />
    <path d="M14.5 3.5V8H19" />
    <path d="M8.5 15.5l2.2-3 2 2 2.8-4" />
  </Svg>
);
export const IconSettings = (p: P) => (
  <Svg {...p}>
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
    <circle cx="15" cy="7" r="2.2" />
    <circle cx="9" cy="17" r="2.2" />
  </Svg>
);
export const IconChevronLeft = (p: P) => <Svg {...p}><path d="M14.5 5.5L8 12l6.5 6.5" /></Svg>;
export const IconChevronRight = (p: P) => <Svg {...p}><path d="M9.5 5.5L16 12l-6.5 6.5" /></Svg>;
export const IconChevronDown = (p: P) => <Svg {...p}><path d="M6 9.5l6 6 6-6" /></Svg>;
export const IconClose = (p: P) => <Svg {...p}><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" /></Svg>;
export const IconPlus = (p: P) => <Svg {...p}><path d="M12 5.5v13M5.5 12h13" /></Svg>;
export const IconPlay = (p: P) => (
  <Svg {...p}><path d="M8 5.8v12.4a.8.8 0 0 0 1.2.7l9.6-6.2a.8.8 0 0 0 0-1.4L9.2 5.1a.8.8 0 0 0-1.2.7z" fill="currentColor" stroke="none" /></Svg>
);
export const IconStop = (p: P) => <Svg {...p}><rect x="6.5" y="6.5" width="11" height="11" rx="2.5" fill="currentColor" stroke="none" /></Svg>;
export const IconTimer = (p: P) => (
  <Svg {...p}><circle cx="12" cy="13.5" r="7" /><path d="M12 10v3.8l2.3 1.6M10 3h4M18.5 6.5l1.2-1.2" /></Svg>
);
export const IconPin = (p: P) => (
  <Svg {...p}><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.3" /></Svg>
);
export const IconPencil = (p: P) => <Svg {...p}><path d="M14.5 5.5l4 4M4.5 19.5l1-4.5L16 4.5a1.4 1.4 0 0 1 2 0l1.5 1.5a1.4 1.4 0 0 1 0 2L9 18.5z" /></Svg>;
export const IconTrash = (p: P) => (
  <Svg {...p}><path d="M4.5 7h15M9.5 7V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2M6.5 7l.8 11.5a2 2 0 0 0 2 1.8h5.4a2 2 0 0 0 2-1.8L17.5 7" /></Svg>
);
export const IconUndo = (p: P) => <Svg {...p}><path d="M9 7L5 11l4 4" /><path d="M5 11h9a5 5 0 0 1 0 10h-2" /></Svg>;
