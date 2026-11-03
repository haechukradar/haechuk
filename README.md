# 해축레이더 — 해외축구 뉴스 애그리게이터 (MVP)

기획서: [PLAN_v2.md](PLAN_v2.md) (원본 [plan.md](plan.md))

해외 매체 RSS → 한국어 한 줄 요약(Claude Haiku) → 이슈 묶기 → 핫 트렌드 점수 → 정적 사이트.

## 구조

| 경로 | 역할 |
| --- | --- |
| `config/sources.mjs` | 수집 매체·신뢰도 티어(1~4)·유료 여부·티어 가중치 |
| `config/clubs.mjs` | 클럽 사전, 클럽별 페이지 대상(`page: true`) |
| `config/players.mjs` | 선수 사전(선수 페이지·즐겨찾기·코리안리거). `data/meta.json`의 `playerCandidates`에 명단 추가 후보가 쌓임 |
| `config/site.mjs` | 사이트명·도메인·신고 메일·책임자 표기, 파이프라인 파라미터 |
| `config/resolutions.mjs` | 이적 이슈 수동 판정 (적중률 기록) |
| `config/commentary.mjs` | 이슈 → SPOCHAT 해설 글 매핑 |
| `scripts/outbox.mjs` | X·텔레그램 발행 문구 생성 (`npm run outbox`, `/outbox`에서 복사) |
| `config/game.mjs`, `scripts/quiz.mjs` | 등급·점수 설정, 주간 퀴즈 출제 (`npm run quiz`, 이번 주 퀴즈가 있으면 건너뜀, `--force`로 재생성) |
| `scripts/collect.mjs` | 수집 → 가공 → 묶기 → 점수 산정 파이프라인 |
| `scripts/lib/` | RSS 파서, Claude 요약·태깅, 규칙 기반 대체 태거, 클러스터링·점수 |
| `data/articles/YYYY-MM-DD.json` | KST 일자별 기사 (제목·링크·발행시각·매체 + 가공 결과, 본문 없음) |
| `data/issues.json`, `data/meta.json` | 이슈 묶음, 핫 트렌드·수집 통계 |
| `src/pages/` | 메인 / 클럽별 / 이슈 상세 / 아카이브 / 기사배열 기본방침 |

## 로컬 실행

```bash
npm install
```

```bash
npm run collect
```

```bash
npm run build && npm run preview
```

`ANTHROPIC_API_KEY`가 없으면 규칙 기반으로 동작합니다(한국어 요약 없이 원문 제목 노출, 키워드 기반 태깅·묶기). 키가 있으면 Claude Haiku(`claude-haiku-5-5`)로 요약·엔티티 태깅·이적 단계 분류·이슈 키를 부여하고, 규칙 기반으로 처리된 최근 24시간 기사도 다음 실행에서 다시 가공합니다.

## 배포 (GitHub Actions에서 빌드 → Cloudflare Pages 업로드)

Cloudflare가 직접 빌드하면 무료 플랜이 월 500회라 15분 주기(월 약 2,900회)를 못 따라가므로, 빌드는 GitHub Actions에서 하고 결과(`dist`)만 올립니다.

1. Cloudflare Pages에서 **직접 업로드** 방식으로 프로젝트 `haechuk` 생성, 사용자 지정 도메인 `haechuk.net` 연결 (Git 연결은 하지 않음)
2. GitHub 저장소(공개 권장) Settings → Secrets에 `ANTHROPIC_API_KEY`, `CLOUDFLARE_API_TOKEN`(권한: Cloudflare Pages 편집), `CLOUDFLARE_ACCOUNT_ID` 등록. 선택: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHANNEL_ID`
3. 워크플로
   - `collect.yml`: 15분마다 수집 → `data/` 커밋 → 배포
   - `outbox.yml`: KST 08·20시 발행 문구·주간 퀴즈 → 커밋 → 배포
   - `deploy.yml`: 코드 push 시·수동 실행 시 배포. Cloudflare Secrets가 없으면 빌드만 하고 업로드는 건너뜀

## 검색 노출

- `config/site.mjs`의 `searchIndexing` 하나로 켜고 끕니다. `false`(기본, 비공개 점검 기간)면 모든 페이지에 noindex 표시와 `X-Robots-Tag` 헤더가 붙습니다
- 빌드 후 `scripts/seo.mjs`가 `robots.txt`, `sitemap.xml`, `_headers`를 만듭니다. `/me`, `/outbox`, `/ops`는 사이트맵에서 빠지고 항상 noindex
- `*.pages.dev` 주소는 항상 검색 제외 (haechuk.net과 중복 색인 방지)
- 네이버 서치어드바이저·구글 서치콘솔의 소유 확인 코드는 `SITE.verification`에 넣습니다

## 오픈 전 확인 (기획서 4·7장)

- 매체별 RSS 이용약관의 상업적 이용 허용 범위 → 제한 매체는 `config/sources.mjs`에서 제거
- 경기도청 신문법 담당 부서에 인터넷뉴스서비스 등록 대상 여부 문의 → 대상이면 `arrangementManager`, `youthProtectionManager` 기입 (푸터·기본방침 페이지에 자동 표시)
- 한국인 선수 소속 클럽 최신화 (`config/clubs.mjs`)
