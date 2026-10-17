import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/** docs/verified/plain-terms.md 금지 용어. 괄호 안 병기와 `plain-terms-ignore` 표시 줄은 허용 */
const FORBIDDEN = ["손금불산입", "손금", "익금", "산입", "상여 처분", "가지급금", "과세표준", "산출세액", "가처분", "유보", "결손", "필요경비"];

// 1화·2화 화면. 3화는 __tests__/cgt-plain-terms.test.ts 가 따로 검사한다.
const COMPONENT_DIRS = ["src/components/corp-conversion", "src/components/goodwill"].map((d) => join(process.cwd(), d));
const FILES = [
  ...COMPONENT_DIRS.flatMap((dir) => readdirSync(dir).filter((f) => f.endsWith(".tsx")).map((f) => join(dir, f))),
  join(process.cwd(), "src/lib/tax/explain.ts"),
];

function userFacingText(src: string): string {
  return src
    .split("\n")
    .filter((line) => !line.includes("plain-terms-ignore"))
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/[（(][^()（）]*[)）]/g, "");
}

describe("쉬운 용어 — 화면 문구에 금지 용어가 괄호 병기 외 형태로 남지 않는다", () => {
  for (const file of FILES) {
    it(file.replace(process.cwd(), ""), () => {
      const text = userFacingText(readFileSync(file, "utf8"));
      const hits = FORBIDDEN.filter((t) => text.includes(t));
      expect(hits, `금지 용어 발견: ${hits.join(", ")}`).toEqual([]);
    });
  }
});

/**
 * 어미 규칙(Josh 2026-09-26): 사용자 노출 문장은 「~합니다」체.
 * 검사 범위: 홈·도구 페이지·컴포넌트·explain.ts·cutoff.ts·catalog.ts·goodwill/net-effect.ts.
 * 제외: 주석, `tone-ignore` 표시 줄, Traced steps/basis(lib 파일은 판정 문구가 있는 것만 포함).
 */
const TONE_DIR_FILES = [
  join(process.cwd(), "src/app/page.tsx"),
  ...readdirSync(join(process.cwd(), "src/app/tools"), { recursive: true })
    .map(String)
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => join(process.cwd(), "src/app/tools", f)),
  ...readdirSync(join(process.cwd(), "src/components"), { recursive: true })
    .map(String)
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => join(process.cwd(), "src/components", f)),
  join(process.cwd(), "src/lib/tax/explain.ts"),
  join(process.cwd(), "src/lib/tax/cutoff.ts"),
  join(process.cwd(), "src/lib/catalog.ts"),
  join(process.cwd(), "src/lib/tax/goodwill/net-effect.ts"),
];

/** 「~합니다/~입니다/~됩니다/~습니다」의 '니'는 앞 음절 받침이 ㅂ. 「아니다」는 아님 */
function isPoliteNida(text: string, idx: number): boolean {
  if (text[idx - 1] !== "니") return false;
  const prev = text.charCodeAt(idx - 2);
  if (prev < 0xac00 || prev > 0xd7a3) return false;
  return (prev - 0xac00) % 28 === 17;
}

function plainEndings(src: string): string[] {
  const text = src
    .split("\n")
    .filter((line) => !line.includes("tone-ignore"))
    .filter((line) => !/^\s*(\/\/|\/\*|\*)/.test(line))
    .map((line) => line.replace(/\s\/\/.*$/, ""))
    .join("\n")
    .replace(/\/\*[\s\S]*?\*\//g, "");
  const hits: string[] = [];
  // '(' 포함: 「…양도한다(§89)」처럼 조문 괄호가 바로 붙는 종결도 잡는다
  const re = /[가-힣]다(?=[.!?\s"'`」)(<—,]|$)/g;
  for (const m of text.matchAll(re)) {
    const idx = (m.index ?? 0) + 1; // '다' 위치
    if (isPoliteNida(text, idx)) continue;
    // 「보다」「마다」는 조사(이보다 클 / 해마다 / 세금보다) — 종결어미가 아니므로 제외
    if (text[idx - 1] === "보" || text[idx - 1] === "마") continue;
    const start = Math.max(0, idx - 24);
    hits.push(text.slice(start, idx + 1).replace(/\s+/g, " ").trim());
  }
  return hits;
}

describe("어미 검사기 자체", () => {
  it("조문 괄호가 바로 붙은 반말 종결도 잡는다", () => {
    expect(plainEndings("양도한다(§89①).")).toHaveLength(1);
    expect(plainEndings("양도합니다(§89①).")).toHaveLength(0);
  });
});

describe("어미 — 사용자 노출 문장은 ~합니다체 (근거 팝오버·보고서 근거 절 제외)", () => {
  for (const file of TONE_DIR_FILES) {
    it(file.replace(process.cwd(), ""), () => {
      const hits = plainEndings(readFileSync(file, "utf8"));
      expect(hits, `반말체 종결 발견:\n${hits.join("\n")}`).toEqual([]);
    });
  }
});
