// 감사용 화면 실측: headless Chrome + CDP(WebSocket). 폭 375는 Emulation으로 강제(창 최소폭 500px 회피).
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { writeFileSync, mkdirSync } from "node:fs";
const BASE = process.env.BASE ?? "http://localhost:3111/tools/goodwill";
const OUT = fileURLToPath(new URL("./screens/", import.meta.url));
mkdirSync(OUT, { recursive: true });
const enc = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const inp = (p) => ({ netIncomes: [0, 0, 0], equity: 0, otherComprehensiveIncome: 0, corpTaxBase: 0, withRealEstate: false, discountRate: 0, ...p });
const link = (d, v = 1, r = "2026-3") => `${BASE}?s=${enc({ v, r, d })}`;
const G1 = inp({ netIncomes: [150e6, 120e6, 100e6], equity: 200e6, corpTaxBase: 200e6 });

const SHOTS = [
  ["01-empty", BASE, 1280],
  ["02-g1-desktop", link(G1), 1280],
  ["03-g1-mobile375", link(G1), 375],
  ["04-zero-all", link(inp({})), 1280],
  ["05-loss-year", link(inp({ netIncomes: [-300e6, 100e6, 100e6], equity: 0, corpTaxBase: 100e6 })), 1280],
  ["06-100eok", link(inp({ netIncomes: [10_000e6, 10_000e6, 10_000e6], corpTaxBase: 10_000e6 })), 1280],
  ["07-100eok-mobile375", link(inp({ netIncomes: [10_000e6, 10_000e6, 10_000e6], corpTaxBase: 10_000e6 })), 375],
  ["08-realestate", link({ ...G1, withRealEstate: true }), 1280],
  ["09-damaged", `${BASE}?s=%%%garbage`, 1280],
  ["10-future-schema-v2", link(G1, 2), 1280],
  ["11-old-rates-version", link(G1, 1, "2026-1"), 1280],
  ["12-small-separate", link(inp({ netIncomes: [10e6, 10e6, 10e6], equity: 31e6, otherComprehensiveIncome: 80e6, corpTaxBase: 100e6 })), 1280],
];

const port = 9471;
try { await fetch(`http://127.0.0.1:${port}/json/version`); console.error("port busy"); process.exit(1); } catch {}
const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ["--headless=new", `--remote-debugging-port=${port}`, "--hide-scrollbars", "--user-data-dir=/tmp/gw-cdp-profile", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws;
for (let i = 0; i < 40; i++) {
  try { const l = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); const p = l.find((t) => t.type === "page"); if (p) { ws = new WebSocket(p.webSocketDebuggerUrl); break; } } catch {}
  await sleep(250);
}
await new Promise((r) => ws.addEventListener("open", r));
let seq = 0; const pending = new Map();
ws.addEventListener("message", (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } });
const send = (method, params = {}) => new Promise((r) => { const id = ++seq; pending.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
const evalJs = async (expr) => (await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true })).result?.result?.value;
await send("Page.enable"); await send("Runtime.enable");

async function shot(name, w) {
  const h = await evalJs("document.documentElement.scrollHeight");
  await send("Emulation.setDeviceMetricsOverride", { width: w, height: Math.min(h, 8000), deviceScaleFactor: 1, mobile: w < 500 });
  await sleep(300);
  const r = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  writeFileSync(`${OUT}${name}.png`, Buffer.from(r.result.data, "base64"));
}
const report = {};
for (const [name, url, w] of SHOTS) {
  await send("Emulation.setDeviceMetricsOverride", { width: w, height: 1200, deviceScaleFactor: 1, mobile: w < 500 });
  await send("Page.navigate", { url }); await sleep(3500);
  report[name] = await evalJs(`({ url: location.href.slice(0,160), overflowX: document.documentElement.scrollWidth > window.innerWidth, scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth,
    text: document.querySelector("main")?.innerText.slice(0, 900) })`);
  await shot(name, w);
}
// 새로고침 유지: G1 링크 → 입력 변경(직전 1년 = 20000만) → 300ms 뒤 URL 갱신 → reload → 값 확인
await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 1200, deviceScaleFactor: 1, mobile: false });
await send("Page.navigate", { url: link(G1) }); await sleep(3500);
await evalJs(`(() => { const el = document.querySelector("input[type=number]"); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(el, "20000"); el.dispatchEvent(new Event("input", { bubbles: true })); })()`);
await sleep(1200);
const before = await evalJs(`({ href: location.href, first: document.querySelector("input[type=number]").value, big: document.querySelector("p.num")?.innerText })`);
await send("Page.reload"); await sleep(3500);
const after = await evalJs(`({ href: location.href, first: document.querySelector("input[type=number]").value, big: document.querySelector("p.num")?.innerText })`);
report["reload"] = { before, after, same: before.href === after.href && before.first === after.first && before.big === after.big };
await shot("13-reload-restored", 1280);
// 근거 팝오버 잘림: 각 폭에서 결과 영역의 모든 TraceValue 버튼을 하나씩 열어 dialog가 뷰포트 밖으로 나가는지 측정
for (const w of [1280, 375]) {
  await send("Emulation.setDeviceMetricsOverride", { width: w, height: 1200, deviceScaleFactor: 1, mobile: w < 500 });
  await send("Page.navigate", { url: link(G1) }); await sleep(3500);
  report[`popover-${w}`] = await evalJs(`(async () => {
    const btns = [...document.querySelectorAll("button[aria-expanded]")]; const out = [];
    for (const b of btns) { b.click(); await new Promise(r => setTimeout(r, 80)); const d = document.querySelector("[role=dialog]");
      if (d) { const r = d.getBoundingClientRect(); out.push({ label: d.getAttribute("aria-label"), left: Math.round(r.left), right: Math.round(r.right), clipped: r.left < 0 || r.right > window.innerWidth }); }
      b.click(); await new Promise(r => setTimeout(r, 40)); }
    return { count: out.length, clipped: out.filter(o => o.clipped) };
  })()`);
  // 대표 팝오버 1개 열어 둔 상태로 캡처 (영업권 평가액)
  await evalJs(`(() => { const b = [...document.querySelectorAll("button[aria-expanded]")][2]; b.scrollIntoView({ block: "center" }); b.click(); })()`);
  await sleep(300);
  const r = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(`${OUT}14-popover-${w}.png`, Buffer.from(r.result.data, "base64"));
}
writeFileSync(`${OUT}report.json`, JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, null, 1));
ws.close(); chrome.kill();
