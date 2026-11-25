import { useEffect, useMemo, useRef, useState } from 'react';
import { kstToday } from '../lib/date';
import { useStore } from '../lib/store';
import { deviceSize, drawWallpaper, loadWallFont, WALL_SIZES, wallpaperInfo, type WallTheme } from '../lib/wallpaper';
import { Check, Segmented, Sheet, toast } from './ui';

const load = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d; } catch { return d; } };
const save = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

/** 배경화면 만들기: D-day · 오늘 할 일 · 오늘 공부 시간을 이미지로 저장 */
export function WallpaperSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, plan } = useStore();
  const canvas = useRef<HTMLCanvasElement>(null);
  const dev = useMemo(deviceSize, []);
  const sizes = dev ? [dev, ...WALL_SIZES] : WALL_SIZES;
  const [sizeId, setSizeId] = useState(() => load('wall-size', sizes[0].id));
  const size = sizes.find((s) => s.id === sizeId) ?? sizes[0];
  const [theme, setTheme] = useState<WallTheme>(() => load('wall-theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light'));
  const [lockSpace, setLockSpace] = useState(() => load('wall-lock', true));
  const [busy, setBusy] = useState(false);
  const landscape = size.w > size.h;

  useEffect(() => { save('wall-size', sizeId); save('wall-theme', theme); save('wall-lock', lockSpace); }, [sizeId, theme, lockSpace]);

  const render = async () => {
    const info = wallpaperInfo(data, plan, kstToday());
    await loadWallFont(info);
    if (canvas.current) drawWallpaper(canvas.current, info, { width: size.w, height: size.h, theme, lockSpace });
  };

  useEffect(() => { if (open) render(); }, [open, data, plan, sizeId, theme, lockSpace]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveImage = async () => {
    if (!canvas.current) return;
    setBusy(true);
    await render();
    const blob = await new Promise<Blob | null>((r) => canvas.current!.toBlob(r, 'image/png'));
    setBusy(false);
    if (!blob) return toast('이미지를 만들지 못했어요');
    const name = `수능플래너-${kstToday()}.png`;
    const file = new File([blob], name, { type: 'image/png' });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
        return;
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast('이미지를 저장했어요');
  };

  return (
    <Sheet open={open} onClose={onClose} title="배경화면 만들기">
      <div className="space-y-4">
        <div className="flex justify-center rounded-2xl bg-zinc-100 p-3 dark:bg-zinc-800/60">
          <canvas ref={canvas} className="rounded-xl shadow-lg"
            style={landscape ? { width: '100%', height: 'auto' } : { height: 'min(52vh, 460px)', width: 'auto' }} />
        </div>

        <div className="space-y-2.5">
          <label className="block">
            <span className="label">크기</span>
            <select className="input" value={size.id} onChange={(e) => setSizeId(e.target.value)}>
              {sizes.map((s) => <option key={s.id} value={s.id}>{s.label}{s.id !== 'device' ? ` · ${s.w}×${s.h}` : ''}</option>)}
            </select>
          </label>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Segmented value={theme} onChange={setTheme} options={[['light', '밝게'], ['dark', '어둡게']]} />
            {!landscape && (
              <label className="flex items-center gap-2 text-sm">
                <Check checked={lockSpace} onChange={() => setLockSpace(!lockSpace)} label="시계 자리 비우기" />잠금화면 시계 자리 비우기
              </label>
            )}
          </div>
        </div>

        <button className="btn-primary w-full py-3" disabled={busy} onClick={saveImage}>{busy ? '만드는 중…' : '이미지 저장 · 공유'}</button>

        <div className="space-y-1 text-[11.5px] leading-relaxed muted">
          <p>배경화면은 사진이라 자동으로 바뀌지 않아요. 할 일을 체크하거나 공부한 뒤 다시 저장하면 최신 내용으로 바뀝니다 (아래에 업데이트 시각 표시).</p>
          <p><b className="font-normal text-zinc-700 dark:text-zinc-300">아이폰</b>: 저장 · 공유 → "이미지 저장" → 사진 앱에서 공유 → "배경화면으로 사용"</p>
          <p><b className="font-normal text-zinc-700 dark:text-zinc-300">갤럭시</b>: 저장 → 갤러리에서 ⋮ → "배경화면으로 설정"</p>
          <p><b className="font-normal text-zinc-700 dark:text-zinc-300">PC</b>: 저장된 파일 오른쪽 클릭 → "바탕 화면 배경으로 설정"</p>
        </div>
      </div>
    </Sheet>
  );
}
