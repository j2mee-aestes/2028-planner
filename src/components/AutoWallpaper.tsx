import { useEffect, useRef, useState } from 'react';
import { kstToday } from '../lib/date';
import { firebaseEnabled, uploadWallpaper } from '../lib/firebase';
import { useStore } from '../lib/store';
import { drawWallpaper, encodeJpeg, loadWallFont, wallKey, wallpaperInfo } from '../lib/wallpaper';

const LAST = 'wall-last-key';

/** 자동 배경화면: 할 일·공부 기록이 바뀌면 몇 초 뒤 이미지를 다시 그려 업로드. 앱이 열려 있는 동안 10분마다도 확인 */
export function AutoWallpaper() {
  const { data, plan } = useStore();
  const wall = data.settings.wall;
  const [tick, setTick] = useState(0);
  const busy = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 10 * 60 * 1000);
    const vis = () => document.visibilityState === 'visible' && setTick((t) => t + 1);
    document.addEventListener('visibilitychange', vis);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', vis); };
  }, []);

  useEffect(() => {
    if (!firebaseEnabled || !wall?.auto || !wall.token) return;
    const t = setTimeout(async () => {
      if (busy.current) return;
      const info = wallpaperInfo(data, plan, kstToday());
      const key = wallKey(info, wall);
      let last: string | null = null;
      try { last = localStorage.getItem(LAST); } catch {}
      if (last === key) return;
      busy.current = true;
      try {
        await loadWallFont(info);
        const canvas = document.createElement('canvas');
        drawWallpaper(canvas, info, { width: wall.w, height: wall.h, theme: wall.theme, lockSpace: wall.lockSpace });
        await uploadWallpaper(wall.token, encodeJpeg((q) => canvas.toDataURL('image/jpeg', q)));
        try { localStorage.setItem(LAST, key); } catch {}
      } catch (e) {
        console.error('[wallpaper]', e);
      } finally {
        busy.current = false;
      }
    }, 3000);
    return () => clearTimeout(t);
  }, [data, plan, wall, tick]);

  return null;
}
