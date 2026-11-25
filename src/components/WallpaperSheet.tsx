import { useEffect, useMemo, useRef, useState } from 'react';
import { kstToday } from '../lib/date';
import { deleteWallpaper, firebaseEnabled, projectId } from '../lib/firebase';
import { useStore } from '../lib/store';
import type { WallConfig } from '../lib/types';
import { deviceSize, drawWallpaper, loadWallFont, newWallToken, WALL_SIZES, wallpaperInfo, wallUrl, type WallSize, type WallTheme } from '../lib/wallpaper';
import { Check, Disclosure, Segmented, Sheet, toast } from './ui';

const load = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d; } catch { return d; } };
const save = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

/** 배경화면 만들기: D-day · 오늘 할 일 · 오늘 공부 시간을 이미지로 저장 / 자동 반영 */
export function WallpaperSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, plan, updateSettings } = useStore();
  const wall = data.settings.wall;
  const auto = !!wall?.auto;
  const canvas = useRef<HTMLCanvasElement>(null);
  const dev = useMemo(deviceSize, []);

  // 자동 반영 중이면 저장된 설정(다른 기기에서 만든 것 포함)이 기준
  const [sizeId, setSizeId] = useState(() => load('wall-size', dev?.id ?? WALL_SIZES[0].id));
  const [theme, setThemeL] = useState<WallTheme>(() => load('wall-theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light'));
  const [lockSpace, setLockL] = useState(() => load('wall-lock', true));
  const sizes: WallSize[] = useMemo(() => {
    const list = dev ? [dev, ...WALL_SIZES] : [...WALL_SIZES];
    if (auto && !list.some((s) => s.w === wall!.w && s.h === wall!.h)) list.unshift({ id: 'saved', label: `자동 반영 크기 (${wall!.w}×${wall!.h})`, w: wall!.w, h: wall!.h });
    return list;
  }, [dev, auto, wall?.w, wall?.h]); // eslint-disable-line react-hooks/exhaustive-deps

  const size = auto ? sizes.find((s) => s.w === wall!.w && s.h === wall!.h)! : sizes.find((s) => s.id === sizeId) ?? sizes[0];
  const th = auto ? wall!.theme : theme;
  const lock = auto ? wall!.lockSpace : lockSpace;
  const landscape = size.w > size.h;

  const setWall = (p: Partial<WallConfig>) => updateSettings((s) => ({ ...s, wall: { ...s.wall!, ...p } }));
  const chooseSize = (id: string) => { setSizeId(id); save('wall-size', id); const s = sizes.find((x) => x.id === id)!; if (auto) setWall({ w: s.w, h: s.h }); };
  const chooseTheme = (t: WallTheme) => { setThemeL(t); save('wall-theme', t); if (auto) setWall({ theme: t }); };
  const toggleLock = () => { setLockL(!lock); save('wall-lock', !lock); if (auto) setWall({ lockSpace: !lock }); };

  const render = async () => {
    const info = wallpaperInfo(data, plan, kstToday());
    await loadWallFont(info);
    if (canvas.current) drawWallpaper(canvas.current, info, { width: size.w, height: size.h, theme: th, lockSpace: lock });
  };
  useEffect(() => { if (open) render(); }, [open, data, plan, size.w, size.h, th, lock]); // eslint-disable-line react-hooks/exhaustive-deps

  const [busy, setBusy] = useState(false);
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

  const enableAuto = () => updateSettings((s) => ({
    ...s, wall: { auto: true, token: s.wall?.token || newWallToken(), w: size.w, h: size.h, theme: th, lockSpace: lock },
  }));
  const disableAuto = () => { if (wall) { deleteWallpaper(wall.token); updateSettings((s) => ({ ...s, wall: { ...s.wall!, auto: false } })); } };
  const rotate = () => {
    if (!wall) return;
    deleteWallpaper(wall.token);
    setWall({ token: newWallToken() });
    toast('새 주소를 만들었어요. 단축어의 주소도 바꿔 주세요');
  };
  const url = wall ? wallUrl(projectId, wall.token) : '';
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); toast('주소를 복사했어요'); } catch { toast('복사하지 못했어요. 주소를 길게 눌러 복사하세요'); }
  };

  return (
    <Sheet open={open} onClose={onClose} title="배경화면">
      <div className="space-y-4">
        <div className="flex justify-center rounded-2xl bg-zinc-100 p-3 dark:bg-zinc-800/60">
          <canvas ref={canvas} className="rounded-xl shadow-lg"
            style={landscape ? { width: '100%', height: 'auto' } : { height: 'min(48vh, 440px)', width: 'auto' }} />
        </div>

        <div className="space-y-2.5">
          <label className="block">
            <span className="label">크기</span>
            <select className="input" value={size.id} onChange={(e) => chooseSize(e.target.value)}>
              {sizes.map((s) => <option key={s.id} value={s.id}>{s.label}{s.id !== 'device' && s.id !== 'saved' ? ` · ${s.w}×${s.h}` : ''}</option>)}
            </select>
          </label>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Segmented value={th} onChange={chooseTheme} options={[['light', '밝게'], ['dark', '어둡게']]} />
            {!landscape && (
              <label className="flex items-center gap-2 text-sm">
                <Check checked={lock} onChange={toggleLock} label="시계 자리 비우기" />잠금화면 시계 자리 비우기
              </label>
            )}
          </div>
        </div>

        {firebaseEnabled && (
          <section className="card space-y-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-sm">자동 반영</div>
                <div className="text-xs muted">{auto ? '켜짐 · 체크·공부 기록이 바뀌면 이미지가 바로 갱신돼요' : '아이폰 단축어로 배경화면이 저절로 바뀌게 해요'}</div>
              </div>
              {auto ? <button className="btn-outline" onClick={disableAuto}>끄기</button> : <button className="btn-primary" onClick={enableAuto}>켜기</button>}
            </div>
            {auto && (
              <>
                <div className="flex gap-1.5">
                  <input className="input min-w-0 flex-1 font-mono text-[11px]" readOnly value={url} onFocus={(e) => e.target.select()} />
                  <button className="btn-primary shrink-0" onClick={copy}>복사</button>
                </div>
                <Disclosure title={<span className="text-sm">아이폰 단축어 설정 방법</span>}>
                  <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[12.5px] leading-relaxed">
                    <li>먼저 잠금화면을 아무 <b className="font-normal underline underline-offset-2">사진</b> 배경화면으로 하나 만들어 두세요.</li>
                    <li><b className="font-normal">단축어</b> 앱 → + 새 단축어 → 아래 동작을 순서대로 추가:
                      <ul className="mt-1 list-disc space-y-0.5 pl-4 muted">
                        <li><b className="font-normal text-zinc-800 dark:text-zinc-200">URL</b> — 위 주소 붙여넣기</li>
                        <li><b className="font-normal text-zinc-800 dark:text-zinc-200">URL의 콘텐츠 가져오기</b></li>
                        <li><b className="font-normal text-zinc-800 dark:text-zinc-200">사전 값 가져오기</b> — 키 <code>fields</code></li>
                        <li><b className="font-normal text-zinc-800 dark:text-zinc-200">사전 값 가져오기</b> — 키 <code>img</code></li>
                        <li><b className="font-normal text-zinc-800 dark:text-zinc-200">사전 값 가져오기</b> — 키 <code>stringValue</code></li>
                        <li><b className="font-normal text-zinc-800 dark:text-zinc-200">Base64 인코딩</b> — 눌러서 <b className="font-normal">디코딩</b>으로 변경</li>
                        <li><b className="font-normal text-zinc-800 dark:text-zinc-200">배경화면 사진 설정</b> — 잠금 화면 선택, 펼쳐서 '미리보기 표시' 끄기</li>
                      </ul>
                    </li>
                    <li>한 번 실행해서 바뀌는지 확인 (처음엔 허용 질문이 나와요).</li>
                    <li><b className="font-normal">자동화</b> 탭 → 새로운 자동화 → <b className="font-normal">특정 시간</b>(예: 00:10, 07:00, 12:00, 17:00, 21:00) 또는 <b className="font-normal">충전기</b> 연결·해제 → '즉시 실행' → 방금 만든 단축어. 시간마다 자동화를 하나씩 만들면 돼요.</li>
                  </ol>
                  <p className="mt-2 text-[11.5px] muted">이미지는 앱에서 체크·공부 기록이 바뀔 때마다, 그리고 매일 자정(서버)에 새 날짜로 갱신돼요. 단축어가 실행될 때 최신 이미지를 가져옵니다.</p>
                </Disclosure>
                <div className="flex items-center justify-between text-[11.5px] muted">
                  <span>주소를 아는 사람은 이 이미지를 볼 수 있어요</span>
                  <button className="press underline underline-offset-2" onClick={rotate}>새 주소 만들기</button>
                </div>
              </>
            )}
          </section>
        )}

        <button className={`${auto ? 'btn-outline' : 'btn-primary'} w-full py-3`} disabled={busy} onClick={saveImage}>{busy ? '만드는 중…' : '이미지로 한 번 저장 · 공유'}</button>
        {!auto && (
          <p className="text-[11.5px] leading-relaxed muted">
            한 번 저장한 이미지는 자동으로 바뀌지 않아요. 아이폰: 저장 → 사진 앱 공유 → "배경화면으로 사용" · 갤럭시: 갤러리 ⋮ → "배경화면으로 설정" · PC: 파일 오른쪽 클릭 → "바탕 화면 배경으로 설정"
          </p>
        )}
      </div>
    </Sheet>
  );
}
