# 꺼지지 않는 이름 · 4막 사이트

4막에서 플레이어가 휴대폰으로 뒤지는 가짜 사이트 묶음(S1~S10, 휴대폰 3대).
서버·DB·네트워크 없이 도는 정적 사이트이고, `site/index.html`을 그냥 열어도(file://) 동작한다.

## 구조

```
data/          구글 시트 '꺼지지 않는 이름 사이트 데이터' 탭별 CSV (원본은 시트)
tools/build.py CSV → site/assets/data.js (제작용 컬럼 제거, 비밀번호는 해시만)
tools/smoke.mjs 390px 화면으로 모든 사이트를 열고 로그인·잠금 해제까지 돌려 보는 점검
tools/package.sh 빌드 + site/를 dist/haewon-site.zip으로 묶기 (USB·오프라인 배포)
site/          배포 산출물. index.html + assets/{app.js, style.css, data.js}, robots.txt
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
- **쪽지·DM**은 로그인한 계정이 보내거나 받은 것만 보인다.
- **잠금** 보관함 1(열쇠 확인 버튼) → 편지 폰(패턴) / 오십분 폰(PIN). 이다음 폰(PIN)은 허브에 따로.
  이다음 폰을 열면 홈 화면의 '남은자리'·'새벽의 방' 아이콘으로 room702 / dawn_702에 자동 로그인된다.
  다섯 번 틀리면 30초 막힌다.
- **광고**는 `위치`대로 놓이고, 화면의 시점(목록은 2025-07-17, 글은 그 글의 날짜)이 `노출 기간` 안일 때만 뜬다.
  기간이 끝난 AD-01·AD-17은 캐시된 배너처럼 가끔, AD-08은 '광고 송출 중단' 빈 칸으로 남는다 (`app.js`의 `AD_AFTER`).
- **S10**은 상단에 109 안내 고정, 삭제 글은 본문 없이 흔적만, 상업 광고 없음.
- 로그인·잠금 해제는 그 휴대폰의 브라우저에만 저장된다. **게임 사이에 허브 맨 아래 '기록 지우기'** 를 누른다.

`app.js` 맨 위 설정: `SHOW_CASE_HINT`(편지 폰 케이스 안쪽 사진 "702. 첫 글자만 그리면 돼요."를 화면에도 보여 줄지 —
실물 단서로 확정되면 `false`), `LOCK_TRIES`, `LOCK_SECONDS`, `PAGE`.

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
