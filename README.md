# 2028 수능 플래너

2028학년도 수능(2027-11-18) 대비 개인 학습 플래너. 기간 2026-12-15 ~ 2027-11-17, KST 기준.
React + Vite + Tailwind PWA / Firebase (Google 로그인 + Firestore 로컬 캐시) / Firebase Hosting.

## 기능
- 월·주·일 달력: 셀 아래 공부시간, 과목별 완료 점, 공부 금지일 "휴", 시험 일정 📌, 오늘 버튼, 수능 D-day
- 일일 체크리스트: 커리에서 자동 생성 + 직접 추가·수정·삭제(복원 가능), 최근 2주 밀린 항목
- 공부시간: 타이머(기기를 바꿔도 이어짐) + 직접 입력, 과목별 기록, 일/주/월 집계
- 모의고사: 체크하면 점수 입력창 → 월별 진행 개수 자동 집계
- 성적: 학교 응시(평가원·교육청) / 내가 푼 모고 — 원점수·표준·백분위·등급·틀린 번호, 월별 추이, 오답 번호 빈도
- 설정: 학교 일정(시험 3주 전부터 내신기간 자동), 임시공휴일·추가 휴무·강제 공부일, 목표시간, 커리 배치 현황, JSON 백업, 다크모드
- 공부 금지일 규칙: 12/25, 2/5, 공휴일 / 2일 이상 연휴(금토일·토일월·설 등)는 첫날만 쉼 / 토·일만 이어진 경우는 연휴 아님(그 안의 공휴일 당일만 쉼)

### 추가 기능
- **공부 잔디·연속 공부일** (통계): 하루 공부시간 히트맵, 현재/최장 연속 기록 (쉬는 날은 끊기지 않음)
- **주간 회고** (통계, 토요일 정리 창): 공부시간·완료율·지난주 대비·과목별 배분 + 한 줄 회고
- **교재별 진도** (통계): 진도율, 밀린 개수, 밀린 만큼 늦춰진 예상 완료일
- **오답노트** (성적 → 오답노트): 성적 입력 시 틀린 번호가 자동 등록, 메모·사진(압축 저장), 1주·1달 뒤 재풀이 할 일 자동 생성. 교재 문제는 '직접 추가'
- **타임라인** (하루 상세 → 타임라인): 할 일에 시작 시각 지정(계획) vs 타이머 기록(실제)
- **주간 보드 끌어서 옮기기**: PC는 드래그, 휴대폰은 길게 누른 뒤 드래그
- **미룬 할 일**: 쓰레기통 = 미루기, 미룬 목록의 쓰레기통 = 완전 삭제, 토요일 정리 알림
- **휴대폰 알림**: 매일 07:30 오늘 할 일 개수 + D-day, 토요일 10:00 미룬 할 일 (아래 설정)

## 로컬 실행
```bash
npm install
npm run dev        # .env 가 없으면 '로컬 모드'(이 브라우저에만 저장)로 동작
npm test           # 휴일 규칙·커리 생성 테스트
```

## 배포 (Firebase 무료 Spark 요금제)
1. https://console.firebase.google.com → 프로젝트 만들기
2. **Authentication** → 시작하기 → 로그인 방법 → **Google** 사용 설정
3. **Firestore Database** → 데이터베이스 만들기 → 위치 `asia-northeast3 (서울)` → 프로덕션 모드
4. 프로젝트 설정 → 내 앱 → 웹 앱 추가 → 표시되는 config 로 `.env` 작성 (`.env.example` 복사)
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=<project>.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=<project>
   VITE_FIREBASE_APP_ID=...
   VITE_ALLOWED_EMAIL=로그인할구글계정@gmail.com
   ```
5. `firestore.rules` 의 `YOUR_EMAIL@gmail.com` 을 같은 이메일로, `.firebaserc` 의 `YOUR_FIREBASE_PROJECT_ID` 를 프로젝트 ID 로 수정
6. 배포
   ```bash
   npm i -g firebase-tools
   firebase login
   npm run deploy      # 빌드 + Hosting + Firestore 보안 규칙 배포
   ```
7. `https://<project>.web.app` 접속 → Google 로그인. 휴대폰은 브라우저 메뉴 "홈 화면에 추가"로 앱처럼 사용.

### 휴대폰 알림 설정 (무료: GitHub Actions 로 발송)
Cloud Functions 는 유료 요금제가 필요해서, 이 저장소의 GitHub Actions 가 매일 정해진 시각에 발송합니다.
1. Firebase 콘솔 → 프로젝트 설정 → **클라우드 메시징** → 웹 푸시 인증서 → **키 쌍 생성** → `.env` 의 `VITE_FIREBASE_VAPID_KEY`
2. 같은 화면의 **발신자 ID** → `.env` 의 `VITE_FIREBASE_MESSAGING_SENDER_ID` → 다시 `npm run deploy`
3. 프로젝트 설정 → **서비스 계정** → 새 비공개 키 생성(JSON 다운로드)
4. GitHub 저장소 → Settings → Secrets and variables → Actions → **New repository secret**
   이름 `FIREBASE_SERVICE_ACCOUNT`, 값 = JSON 파일 내용 전체
5. 앱 → 설정 → **알림 켜기** (아이폰은 Safari 공유 → "홈 화면에 추가"한 앱에서, iOS 16.4+)
6. 테스트: GitHub → Actions → "휴대폰 알림 발송" → Run workflow (mode: morning)

발송 시각은 `.github/workflows/push.yml` 의 cron(UTC)에서 바꿀 수 있습니다. GitHub 예약 실행은 수 분~수십 분 늦을 수 있습니다.

**접근 제어 (이중 잠금)**: 앱이 허용 이메일이 아닌 로그인을 즉시 로그아웃시키고, Firestore 보안 규칙이 서버에서 본인 uid·이메일 외 모든 읽기/쓰기를 거부합니다.

**속도**: Firestore 로컬 캐시 우선 → 체크·타이머가 즉시 반영되고 동기화는 백그라운드, 오프라인에서도 사용 가능. 커리 일정은 기기에서 계산하므로 DB 사용량이 매우 적어 무료 한도로 충분합니다.

## 커리 수정 방법 (UI 코드 수정 불필요)
커리는 전부 `src/seed/` 에 있습니다.

| 파일 | 내용 |
|---|---|
| `calendar.ts` | 공휴일, 개인 금지일, 학교 일정 기본값, 시험 이벤트(📌) |
| `subjects.ts` | 과목 (이름·색·문항 수). 수리논술 등은 여기에 추가 |
| `curriculum/*.ts` | 과목별 트랙 (교재·인강·모고 큐) |

트랙 예시:
```ts
{
  id: 'm-n1',                 // 고정 유지 (바꾸면 체크 기록 연결이 끊김)
  subject: 'math',
  title: '이해원 N제 시즌1',
  kind: 'study',              // 'mock' 이면 모고 집계·점수 입력 대상
  phases: ['sem1', 'exam', 'summer', 'sem2'], // winter | sem1 | exam(내신기간) | summer | sem2
  after: 'm-hwk',             // 이 트랙이 끝난 다음 날부터 (앞에 정의된 트랙만)
  startDate: '2027-03-15',    // 출간일 등
  perDay: 1, weekendPerDay: 2,
  weekdays: [1, 3, 5],        // 지정 요일에만 (0=일)
  examMode: 'half',           // 내신기간: same | skip | half(격일) | { weekdays: [...] }
  endAfterExams: true,        // 마지막 내신 종료일까지만
  units: seq('m-n1', 'N제 시즌1', 36),  // 또는 [{ id, title, availableFrom }]
}
```
- 분량 변경: `units` 개수·제목 수정. 교재를 받으면 실제 단원명으로 교체 권장
- **unit id 를 유지하면** 수정 후에도 기존 체크 기록이 그대로 따라옴
- 수정 후 앱 **설정 → 커리 배치 현황**에서 기간과 미배정(주황색) 확인
- 과목 추가: `subjects.ts` 에 항목 → `curriculum/새파일.ts` 작성 → `curriculum/index.ts` 에 등록
- 반영: `npm run deploy`

## 백업
설정 → **JSON 내보내기** (설정·일별 기록·성적·오답노트 전체) / **JSON 가져오기** (백업에 있는 날짜·성적은 덮어쓰고 나머지는 유지).

## 리서치·출처
`docs/research.md`
