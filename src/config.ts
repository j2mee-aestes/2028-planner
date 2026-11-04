// 앱 설정 (공개해도 되는 값만). Firebase 웹 설정값은 원래 배포된 웹사이트 코드에 그대로 들어가는 공개 값이며,
// 실제 접근 제어는 firestore.rules(로그인 이메일 잠금)가 담당합니다. .env 에 값이 있으면 그쪽이 우선합니다.
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyArXNCJkrJXXcUD6yD2zv__I-zVlkLp0KU',
  authDomain: 'planner-eff14.firebaseapp.com',
  projectId: 'planner-eff14',
  appId: '1:817565793615:web:2667ee67ff8147672d993a',
  messagingSenderId: '817565793615',
};

/** 웹 푸시 공개 키 (Firebase 콘솔 > 프로젝트 설정 > 클라우드 메시징 > 웹 푸시 인증서) */
export const VAPID_KEY = 'BKcj9JwAxKy9hX4XXpYqEc8cD4BtbCvlffQmBgYwlFVaHY5uJZqHMlXhixdk5nC9DD7N8VnZazYk4Lawpz-y5WI';

/** 로그인 허용 이메일 (firestore.rules 와 동일하게) */
export const ALLOWED_EMAIL_DEFAULT = '';
