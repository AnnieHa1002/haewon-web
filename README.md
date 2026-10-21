# 꺼지지 않는 이름 · 4막 사이트

4막에서 플레이어가 휴대폰으로 뒤지는 가짜 사이트 묶음(S1~S10, 휴대폰 3대).
서버·DB·네트워크 없이 도는 정적 사이트이고, `site/index.html`을 그냥 열어도(file://) 동작한다.

## QR 코드

휴대폰 카메라로 찍으면 바로 그 사이트가 열린다. 주소는 GitHub Pages 기준이라 **배포가 켜져야 동작한다**.
보관함 1과 이다음의 휴대폰은 허브에 아이콘이 없다. 이 둘의 QR은 해당 소지품 카드에만 인쇄한다.
다른 주소로 배포했다면 `python3 tools/qr.py <새 주소>`로 다시 만든다 (`pip install segno` 필요).

<!-- QR:START -->
| 사이트 | QR | 주소 |
| --- | --- | --- |
| 진행 화면 (타이머·향·소리) — **테이블 가운데 노트북·태블릿용** | <img src="qr/stage.svg" width="140" alt="진행 화면 (타이머·향·소리) QR"> | `https://annieha1002.github.io/haewon-web/stage.html` |
| 허브 (홈 화면) | <img src="qr/hub.svg" width="140" alt="허브 (홈 화면) QR"> | `https://annieha1002.github.io/haewon-web/` |
| S1 남은자리 | <img src="qr/s1.svg" width="140" alt="S1 남은자리 QR"> | `https://annieha1002.github.io/haewon-web/#/S1` |
| 보관함 1 (S2 송은혜 폰 · 차위로 폰) — **별꽃 카드 2(열쇠)에 인쇄** | <img src="qr/s2-locker.svg" width="140" alt="보관함 1 (S2 송은혜 폰 · 차위로 폰) QR"> | `https://annieha1002.github.io/haewon-web/#/locker` |
| S3 이다음의 휴대폰 — **외골수 카드 1에 인쇄** | <img src="qr/s3.svg" width="140" alt="S3 이다음의 휴대폰 QR"> | `https://annieha1002.github.io/haewon-web/#/S3` |
| S4 한컷 nare_nowhere | <img src="qr/s4.svg" width="140" alt="S4 한컷 nare_nowhere QR"> | `https://annieha1002.github.io/haewon-web/#/S4` |
| S5 해원일보 | <img src="qr/s5.svg" width="140" alt="S5 해원일보 QR"> | `https://annieha1002.github.io/haewon-web/#/S5` |
| S6 금방울당 | <img src="qr/s6.svg" width="140" alt="S6 금방울당 QR"> | `https://annieha1002.github.io/haewon-web/#/S6` |
| S7 도원화학 사내망 | <img src="qr/s7.svg" width="140" alt="S7 도원화학 사내망 QR"> | `https://annieha1002.github.io/haewon-web/#/S7` |
| S8 천명그룹 | <img src="qr/s8.svg" width="140" alt="S8 천명그룹 QR"> | `https://annieha1002.github.io/haewon-web/#/S8` |
| S9 사원증 | <img src="qr/s9.svg" width="140" alt="S9 사원증 QR"> | `https://annieha1002.github.io/haewon-web/#/S9` |
| S10 새벽의 방 | <img src="qr/s10.svg" width="140" alt="S10 새벽의 방 QR"> | `https://annieha1002.github.io/haewon-web/#/S10` |
<!-- QR:END -->

## 진행 화면 (`stage.html`)

테이블 가운데 노트북·태블릿에 띄우는 타이머. 허브와 연결되어 있지 않다.

- 망향 향이 타들어 가는 길이가 그 구간의 남은 시간이다. 연기는 막이 넘어갈수록 옅어진다 (2막 진함 → 4막 거의 없음 → 엔딩 꺼짐).
- 진행표 (규칙서, 약 2시간 15분): 프롤로그 5 → 1막 15 → 2막 숙지 10 · 토론 20 → 3막 숙지 10 · 토론 20 →
  4막 조사 10 → 1대1 면담 3분 × 3 (별꽃이 하늘바라기 → 가우디 → 외골수 순서로) → 토론 20 → 최종 추리와 지목 5 → 엔딩북 10.
  구간이 바뀌면 방울 소리와 함께 STOP·면담 차례 안내가 뜬다.
- 지목: 화면을 두 번 누르면 "하나, 둘, 셋"을 세고 모두 동시에 가리킨다. 이어서 '마지막 장 · 물건 카드' 안내가 뜨고,
  다시 두 번 누르면 카드 선택용 하나, 둘, 셋을 센 뒤 별꽃 → 하늘바라기 → 가우디 → 외골수 대사 순서를 보여 준다.
- ⏸ 일시정지는 모임 약속의 "잠시 쉬어요"용이다. 멈춘 동안 화면에 '잠시 쉬어요'가 뜬다.
- 소리는 파일 없이 코드로 만든다: 빗소리, 천둥(가까우면 화면이 번쩍), 낮은 울림, 방울, 지목 시간의 심장 박동.
  막마다 비 세기·천둥 빈도·울림 높이가 바뀐다. 진행표와 소리 설정은 `assets/stage.js` 맨 위 `PHASES`.
- 메뉴에서 소리를 층별로 조절한다: 전체 · 빗소리 · 천둥 · 울림 · 알림 방울 (0이면 끈다, ▶로 미리 듣기).
  '알림만'은 배경음 없이 구간이 바뀔 때의 방울만 남긴다. 시작 화면의 '알림 소리만 켜고 시작'도 같다.
- 화면 아래 조작 줄: ⏸ 일시정지 · −1분 · +1분 · +5분 · 다음 구간 › · ☰ 메뉴. 가만히 두면 흐려지고, 화면을 건드리면 또렷해진다.
  더하거나 뺀 시간은 그 구간에만 적용된다.
- 처음에 '시작'을 눌러야 소리가 난다 (브라우저 규칙). 화면을 길게 누르거나 Esc를 누르면 메뉴:
  일시정지, ±1분, 구간 이동, 하나·둘·셋, 볼륨. 키보드: 스페이스 일시정지, ←/→ ±1분, t 천둥.
- 새로고침해도 실제 시각 기준으로 이어진다 ('이어서 진행').

## 사진

`site/assets/photos.js`에 글ID → 사진 파일을 적으면, 그 글의 `[사진: …]` 자리가 실제 사진으로 바뀐다. 적지 않은 글은 사진 설명 글로 보인다.
`[사진]` 줄이 없는 글에 등록하면 본문 맨 위에 붙는다. 지금은 Unsplash에서 받은 분위기 사진 26장 (한컷 피드, 남은자리·해원일보·금방울당·사내망·천명그룹·사원증·새벽의 방의 일상 글과 기사). 출처는 `site/img/CREDITS.md`.
제작 에셋(드라이브 '이미지 에셋' 폴더)은 `img/<글ID>.jpg`(사진), `img/brand/`(사이트 로고·허브 아이콘), `img/avatar/`(프로필), `img/icon/`(휴대폰 아이콘)에 있다. 프로필은 `app.js`의 `AVATAR`에서 계정과 짝짓는다.
아직 에셋이 없는 단서 사진(입소 기록, 관리 일지, 영수증, 수첩 등)은 사진 설명 글로 보인다.

## 구조

```
data/          구글 시트 '꺼지지 않는 이름 사이트 데이터' 탭별 CSV (원본은 시트)
tools/build.py CSV → site/assets/data.js (제작용 컬럼 제거, 비밀번호는 해시만)
tools/smoke.mjs 390px 화면으로 모든 사이트를 열고 로그인·잠금 해제까지 돌려 보는 점검
tools/qr.py    사이트별 QR(qr/*.svg) 만들고 README 표 갱신
tools/package.sh 빌드 + site/를 dist/haewon-site.zip으로 묶기 (USB·오프라인 배포)
site/          배포 산출물. stage.html(진행 화면), index.html + assets/{app.js, style.css, data.js}, robots.txt
```

## 데이터 고치기

1. 구글 시트를 고친다.
2. 탭 8개(사이트·게시판·사용자·게시글·댓글·메시지·로그인·광고)를 CSV로 받아 `data/`의
   `sites, boards, users, posts, comments, messages, logins, ads .csv`로 덮어쓴다.
3. `python3 tools/build.py` → `site/assets/data.js`가 다시 만들어진다.

화면에 나가지 않는 컬럼: 게시글 `연결된 진실·단서`·`핵심/분위기`, 사용자 `실제 인물`·`메모`·`비밀번호`,
광고 `의미`, 로그인 탭 전체. 빌드에서 버리고, 비밀번호·PIN·패턴은 해시로만 남긴다.

## 동작 규칙

- **공개 조건** `공개` / `로그인 필요: <아이디>` / `로그인 필요: S2 잠금 해제` 등 기기 / `삭제됨` /
  `삭제됨(원문은 X 로그인 시)` / `블라인드 (...)`를 그대로 해석한다.
  - 제목이 `(임시저장)`·`(보관함)`·`(비공개)`인 잠긴 글은 목록에 안 보이고, 주인이 로그인하면 '내 글'에 나온다.
  - 그 밖의 잠긴 글은 목록에 `🔒 비밀글입니다.` 흔적만 남는다.
  - 블라인드 글은 제목·본문 모두 "신고 누적으로 블라인드 처리된 게시물입니다." 작성자·날짜·댓글은 남아서
    스크랩(원래 작성자·작성 시각)과 맞춰 볼 수 있다.
- **남은자리 글**에는 좋아요·공유 버튼이 있다. 좋아요는 그 기기에만 남고('기록 지우기'로 지워짐), 공유는 링크 복사만 되고 도란·문자는 "앱을 열 수 없습니다"로 막힌다.
- **쪽지·DM**은 로그인한 계정이 보내거나 받은 것만 보인다.
- **휴대폰** 보관함 1(`#/locker`)과 이다음 폰(`#/S3`)은 허브에 없고 카드의 QR로만 들어간다.
- **허브로 가는 버튼은 어느 화면에도 없다.** 허브에서 들어온 사이트는 브라우저 뒤로 가기로 돌아간다.
  휴대폰 화면은 보관함 ↔ 두 폰 사이만 오간다.
- **잠금** 보관함 1(열쇠 확인 버튼) → 송은혜 폰(패턴) / 차위로 폰(PIN). 이다음 폰(PIN).
  이다음 폰을 열면 홈 화면의 '남은자리'·'새벽의 방' 아이콘으로 room702 / dawn_702에 자동 로그인된다.
  다섯 번 틀리면 30초 막힌다.
- **광고**는 `위치`대로 놓이고, 화면의 시점(목록은 2025-07-17, 글은 그 글의 날짜)이 `노출 기간` 안일 때만 뜬다.
  기간이 끝난 AD-01·AD-17은 캐시된 배너처럼 가끔, AD-08은 '광고 송출 중단' 빈 칸으로 남는다 (`app.js`의 `AD_AFTER`).
- **S10**은 상단에 109 안내 고정, 삭제 글은 본문 없이 흔적만, 상업 광고 없음.
- 로그인·잠금 해제는 그 휴대폰의 브라우저에만 저장된다. **게임 사이에 허브 맨 아래 '기록 지우기'** 를 누른다.

`app.js` 맨 위 설정: `SHOW_CASE_HINT`(제비 폰 케이스 안쪽 사진 "702. 첫 글자만 그리면 돼요."를 화면에도 보여 줄지 —
2026-10-21 화면에만 두기로 확정, 실물 없음. `true` 유지), `LOCK_TRIES`, `LOCK_SECONDS`, `PAGE`.

## 배포

- GitHub Pages: `.github/workflows/pages.yml`이 `main`에 푸시될 때 `site/`를 배포한다
  (저장소 Settings → Pages → Source를 'GitHub Actions'로).
- Cloudflare Pages: 빌드 명령 `python3 tools/build.py`, 출력 폴더 `site`.
- 오프라인: `tools/package.sh` → `dist/haewon-site.zip`을 풀고 `index.html`을 연다.
- `robots.txt`와 `noindex` 메타로 검색 노출을 막는다.

## 점검

```
node tools/smoke.mjs shots/   # 스크린샷 + 콘솔 에러 확인
```
