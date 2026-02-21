# Club Tennis Match App

모바일 최적화된 클럽용 테니스 매칭 웹앱입니다.

## 핵심 기능

- 로그인: 게스트 둘러보기 + 이메일 매직 링크
- 피드: 인스타그램 스타일 매치 피드
- 연락: 매치 카드의 WhatsApp Click to Chat(1:1)
- 시간표: `/times`, `/es/times`에서 코트 이용 가능시간 표시
- 다국어: KO/ES 전환

## Run

```bash
npm install
npm run dev
```

## 시간표 사용법

- 기본값: `기본 시간표` 모드 (설정 없이 바로 사용)
- 선택사항: `SIRES 연동(고급)` 버튼을 켜면 실데이터 시도
- SIRES가 준비되지 않았으면 자동으로 기본 시간표로 fallback

SIRES 연동을 쓰려면 `.env.local`에 아래 설정:

- `SIRES_RESERVAS_URL=https://sires.azurewebsites.net/Reservas/MisReservas`
- `SIRES_SESSION_COOKIE=<로그인된 브라우저의 Cookie 헤더 값>`

## Magic Link API

- 시작: `POST /api/auth/magic-link/start`
- 검증: `POST /api/auth/magic-link/verify`

개발 환경에서는 응답의 `previewMagicLink`로 메일 없이 테스트할 수 있습니다.
