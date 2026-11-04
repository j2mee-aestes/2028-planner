import { VAPID_KEY } from '../config';
import { app, firebaseEnabled } from './firebase';

export const pushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

export const isStandalone = () =>
  matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;

/** 알림 권한 요청 → FCM 토큰 발급 (홈 화면에 추가한 앱에서만 iOS 지원) */
export async function getPushToken(): Promise<string> {
  if (!firebaseEnabled || !app) throw new Error('Firebase 설정 후 사용할 수 있어요 (README 참고)');
  // 웹 푸시 공개 키 (공개용 키라 코드에 넣어도 안전). .env 의 값이 있으면 그걸 우선 사용
  const vapidKey = (import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined) || VAPID_KEY;
  if (!pushSupported()) throw new Error(/iPhone|iPad/.test(navigator.userAgent) && !isStandalone()
    ? '아이폰은 Safari 공유 버튼 → "홈 화면에 추가" 후 그 앱에서 켜주세요 (iOS 16.4 이상)'
    : '이 브라우저는 알림을 지원하지 않아요');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('알림 권한이 거부됐어요. 기기 설정에서 허용해 주세요');
  const { getMessaging, getToken, isSupported } = await import('firebase/messaging');
  if (!(await isSupported())) throw new Error('이 브라우저는 알림을 지원하지 않아요');
  const reg = await navigator.serviceWorker.ready;
  return getToken(getMessaging(app), { vapidKey, serviceWorkerRegistration: reg });
}
