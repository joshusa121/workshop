# Next.js 16.3.3 — 이 프로젝트에서 쓸 패턴

근거: `node_modules/next/dist/docs/` (App Router). 학습 데이터 기준 API는 쓰지 않는다.
확인일: 2026-09-01. 패키지: Next 16.3.3 / React 19.2.8.

이 앱은 외부 API·DB가 없고 계산은 전부 클라이언트다. 캐시 계층을 켜지 않는다.

---

## 1. 시뮬레이터 페이지의 Server / Client 경계

기본값: `layout.tsx`·`page.tsx`는 Server Component. `'use client'`는 상호작용이 필요한 파일에만 둔다.

확정 구조:

```
src/app/tools/corp-conversion/page.tsx          # Server — metadata + 셸 + Suspense
src/app/tools/corp-conversion/report/page.tsx   # Server — metadata + 인쇄 셸 + Suspense
src/components/corp-conversion/*.tsx            # Client — 위저드·계산·차트
src/lib/tax/*.ts                                # 순수 함수. 클라이언트에서 import. Node API 금지
src/lib/share-codec.ts                          # 순수 함수. TextEncoder + btoa (아래 4절)
```

- 계산 엔진(`src/lib/tax`)은 `'use client'`를 붙이지 않는다. 클라이언트 컴포넌트가 import하면 그 모듈 그래프에 포함된다.
- 페이지 셸(제목, 고지문 자리, 레이아웃)은 서버에 남긴다. 위저드·결과·슬라이더는 Client.
- 서버에서 클라이언트로 넘기는 props는 JSON 직렬화 가능해야 한다. 함수·class는 넘기지 않는다.
- `LayoutProps<'/'>` / `PageProps<'/tools/corp-conversion'>` 를 쓴다. 전역 헬퍼라 import 하지 않는다. `params`·`searchParams`는 **반드시 `await`** (16에서 동기 접근 제거됨).

하지 않는 것:

- `export const runtime = 'edge'` (deprecated)
- `middleware.ts` (16에서 `proxy.ts`로 개명. 이 앱은 둘 다 안 씀)
- `cacheComponents: true` (데이터 fetch가 없음. 켜면 uncached 읽기를 Suspense로 감싸야 함)

---

## 2. URL 쿼리 상태 (`?s=<encoded>`)

계획: 입력 상태를 `?s=` 와 동기화(디바운스), 새로고침 후 유지.

**읽기 — Client (`Wizard.tsx`)**

- `useSearchParams()` (`next/navigation`). 반환은 읽기 전용 `URLSearchParams`.
- 이 훅을 쓰는 트리는 **가장 가까운 `<Suspense>` 경계까지** 클라이언트에서 렌더된다.
- 프로덕션 빌드에서 Suspense 없이 쓰면 실패한다 (`missing-suspense-with-csr-bailout`). 개발 모드에서는 안 멈춰 보일 수 있으니 빌드로 확인한다.

페이지 셸:

```tsx
// src/app/tools/corp-conversion/page.tsx  (Server)
import { Suspense } from "react";
import { Wizard } from "@/components/corp-conversion/Wizard";

export default function Page() {
  return (
    <Suspense fallback={<main className="p-8">불러오는 중</main>}>
      <Wizard />
    </Suspense>
  );
}
```

서버 페이지에서 `await searchParams` 를 읽어 클라이언트로 넘기는 대안도 있다. 그러면 그 페이지는 요청 시점 동적 렌더가 된다. 이 제품은 계산이 클라이언트 전용이고 공유 URL도 클라이언트에서 디코드하므로, **서버는 searchParams를 읽지 않고** Client + Suspense만 쓴다.

**쓰기 — 디바운스 후 `replaceState`**

입력할 때마다 history 항목을 쌓지 않는다. `window.history.replaceState` 는 Next 라우터와 연동되어 `useSearchParams`가 갱신된다.

```ts
const params = new URLSearchParams(searchParams.toString());
params.set("s", encoded);
window.history.replaceState(null, "", `?${params.toString()}`);
```

공유 버튼을 눌러 링크를 복사하는 동작은 현재 URL을 읽으면 된다. `router.push`는 위저드 입력 동기화에 쓰지 않는다 (뒤로가기가 입력 한 글자씩 된다).

---

## 3. 인쇄용 `/report` 페이지와 metadata

경로: `src/app/tools/corp-conversion/report/page.tsx` → `/tools/corp-conversion/report?s=...`

- 페이지는 Server Component. `export const metadata` 또는 `generateMetadata`는 Server에서만 가능.
- 보고서 본문(숫자·표)은 같은 Client 계산 컴포넌트를 Suspense 안에 둔다. 엔진을 서버에서 다시 돌리지 않는다.
- URL에 매출·자산이 들어가므로 검색엔진 색인을 막는다:

```ts
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "법인전환 검토보고서",
  robots: { index: false, follow: false },
};
```

- `generateMetadata`에서 `searchParams`를 await 하면 동적 렌더 + 메타 스트리밍이 된다. 입력값을 제목에 넣지 않는다 (민감정보). 정적 `metadata`로 충분.
- 인쇄는 `@media print` CSS. Next 전용 인쇄 API는 없다.

루트 `layout.tsx`는 `html`+`body` 필수. `lang="ko"`. 중첩 레이아웃으로 제품 구간만 Header/Footer를 씌울 수 있다.

---

## 4. share-codec — Node / 브라우저 겸용 base64url

`btoa`/`atob`는 Latin-1만 받는다. UTF-8 JSON은 `TextEncoder`로 바이트화한 뒤 변환한다.

```ts
function toBase64Url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): string {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
```

Node 20+ 테스트(Vitest)에서도 `TextEncoder`/`btoa`를 쓸 수 있다. `Buffer`에 의존하지 않는다 (클라이언트 번들에 Node 모듈이 섞이지 않게).

---

## 5. 캐싱·렌더링 모드 (이 앱)

`cacheComponents`를 **켜지 않는다.** fetch·DB가 없고 계산은 클라이언트다.

기본 동작: 서버 페이지는 정적 셸로 프리렌더. `useSearchParams`를 쓰는 Client 트리는 Suspense fallback이 HTML에 들어가고, 하이드레이션 후 쿼리를 읽는다.

쓰지 않는 구 API:

- `export const dynamic = 'force-dynamic'` — 필요하면 `connection()` (이 앱은 불필요)
- `experimental.ppr` / `experimental.dynamicIO` / `experimental.useCache` — 16에서 제거
- `revalidateTag` 단인자, `unstable_cacheLife`

Turbopack이 `next dev`·`next build` 기본. webpack 커스텀 설정 없음 → 그대로 둔다.

---

## 6. 이 프로젝트에 해당하는 deprecation / 제거 목록

코드를 새로 쓸 때 아래를 쓰지 않는다.

| 항목 | 상태 | 이 앱 |
|---|---|---|
| `params` / `searchParams` 동기 접근 | 16에서 제거. 반드시 await | PageProps 사용 |
| `middleware.ts` | `proxy.ts`로 개명 | 사용 안 함 |
| `runtime = 'edge'` | deprecated | 사용 안 함 |
| `next lint` | 제거. `eslint` CLI | package.json 이미 `eslint` |
| `serverRuntimeConfig` / `publicRuntimeConfig` | 제거 | 사용 안 함 |
| `next/legacy/image` | deprecated | 사용 안 함 |
| AMP | 제거 | 사용 안 함 |
| `images.priority` | `preload`로 대체 | 해당 시 |

타입: `LayoutProps<'/'>` 는 루트 레이아웃에 이미 사용 중. 유지.

---

## 7. 기타 구현 시 주의

- `docs/` 는 `tsconfig.json` exclude. 아카이브(`docs/archive/v1-src`)를 앱으로 컴파일하지 않는다.
- 클라이언트 모듈에서 `fs` 등 Node built-in을 import하지 않는다 (Turbopack이 실패한다).
- 폰트: `next/font/google`. 루트 레이아웃에서 CSS variable로 주입.
- CSS: `app/globals.css`에 `@import "tailwindcss"` (Tailwind 4).
