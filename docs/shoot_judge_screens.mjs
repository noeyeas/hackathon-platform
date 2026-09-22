// 심사위원 안내서용 화면 캡처.
//   1) 별도 터미널: npm run dev   (localhost:3000)
//   2) node docs/shoot_judge_screens.mjs
// 임시 심사위원 계정을 만들어 로그인 세션 쿠키를 심고 /judge·/judge/mid 를
// 찍은 뒤 계정을 지운다. 캡처 동안 중간 채점 스위치를 잠깐 켰다가 원래대로 돌린다.
// 점수는 저장하지 않는다.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

for (const l of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = l.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SITE = "http://localhost:3000";
const EMAIL = "screenshot-judge@example.com";
const OUT = "docs/img";

const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } });
const anon = createClient(URL_, ANON, { auth: { persistSession: false } });

// @supabase/ssr 쿠키 형식: sb-<ref>-auth-token = "base64-" + base64url(JSON(session)),
// 3180자 넘으면 .0 .1 … 로 쪼갠다.
function sessionCookies(session) {
  const ref = new URL(URL_).hostname.split(".")[0];
  const name = `sb-${ref}-auth-token`;
  const value =
    "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");
  const MAX = 3180;
  if (value.length <= MAX) return [{ name, value }];
  const out = [];
  for (let i = 0, n = 0; i < value.length; i += MAX, n++)
    out.push({ name: `${name}.${n}`, value: value.slice(i, i + MAX) });
  return out;
}

async function cleanup(userId) {
  if (userId) await admin.auth.admin.deleteUser(userId);
  await admin.from("users").delete().eq("email", EMAIL);
}

async function main() {
  const { data: settings } = await admin
    .from("event_settings")
    .select("mid_judging_open, voting_open")
    .single();
  let userId = null;
  try {
    // 남아 있던 임시 계정 정리
    const { data: existing } = await admin.from("users").select("id").eq("email", EMAIL).maybeSingle();
    if (existing) await cleanup(existing.id);

    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email: EMAIL,
      email_confirm: true,
      user_metadata: { name: "심사위원(캡처용)" },
    });
    if (cErr) throw cErr;
    userId = created.user.id;
    await admin.from("users").update({ role: "judge", name: "심사위원(캡처용)" }).eq("id", userId);

    const { data: link, error: lErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: EMAIL,
    });
    if (lErr) throw lErr;
    const { data: verified, error: vErr } = await anon.auth.verifyOtp({
      token_hash: link.properties.hashed_token,
      type: "magiclink",
    });
    if (vErr) throw vErr;

    // 캡처 동안만 중간 채점 열기(열림 상태 화면을 보여 주려고)
    await admin.from("event_settings").update({ mid_judging_open: true }).eq("id", 1);

    const browser = await chromium.launch();
    const ctx = await browser.newContext({
      viewport: { width: 430, height: 900 },
      deviceScaleFactor: 2,
      locale: "ko-KR",
    });
    await ctx.addCookies(
      sessionCookies(verified.session).map((c) => ({
        ...c,
        domain: "localhost",
        path: "/",
      }))
    );
    const page = await ctx.newPage();
    // 개발 서버 표시(N 배지)는 안내서에 안 나오게 숨긴다
    await ctx.addInitScript(() => {
      const s = document.createElement("style");
      s.textContent = "nextjs-portal{display:none!important}";
      document.addEventListener("DOMContentLoaded", () => document.head.appendChild(s));
    });

    // 1. 메뉴에서 '심사' 찾기
    await page.goto(`${SITE}/judge/mid`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "메뉴" }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/01_menu.png`, clip: { x: 0, y: 0, width: 430, height: 320 } });
    await page.keyboard.press("Escape");
    await page.goto(`${SITE}/judge/mid`, { waitUntil: "networkidle" });

    // 2. 중간발표 채점 목록
    await page.screenshot({ path: `${OUT}/02_mid_list.png` });

    // 3. 카드 펼친 채점표 — 첫 팀 카드 열고, 슬라이더를 움직여 본 모습
    const firstCard = page.getByRole("button", { name: /미채점/ }).first();
    await firstCard.click();
    await page.waitForTimeout(300);
    const sliders = page.locator('input[type="range"]');
    const n = await sliders.count();
    const demo = [24, 16, 15, 17];
    for (let i = 0; i < n - 1; i++) {
      // React 의 onChange 는 'input' 이벤트를 본다 — 네이티브 setter 로 값을 넣고 쏜다
      await sliders.nth(i).evaluate((el, v) => {
        const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
        set.call(el, String(v));
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }, demo[i]);
    }
    await page.waitForTimeout(200);
    await firstCard.evaluate((el) => el.scrollIntoView({ block: "start" }));
    await page.evaluate(() => window.scrollBy(0, -64));
    await page.waitForTimeout(200);
    // 카드 하단 '점수 저장' 버튼까지 한 장에 들어오도록 이 컷만 세로를 늘린다
    await page.setViewportSize({ width: 430, height: 960 });
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${OUT}/03_mid_card.png` });
    await page.setViewportSize({ width: 430, height: 900 });

    // 3. 본선 채점 화면 (제출작이 없으면 목록이 비어 있어도 탭·안내는 보인다)
    await page.goto(`${SITE}/judge`, { waitUntil: "networkidle" });
    await page.screenshot({ path: `${OUT}/04_final_list.png` });

    // 4. 로그인 화면 (로그아웃 상태)
    const ctx2 = await browser.newContext({
      viewport: { width: 430, height: 900 },
      deviceScaleFactor: 2,
      locale: "ko-KR",
    });
    const p2 = await ctx2.newPage();
    await p2.goto(`${SITE}/login`, { waitUntil: "networkidle" });
    await p2.screenshot({ path: `${OUT}/00_login.png` });

    await browser.close();
    console.log("captured →", OUT);
  } finally {
    await admin
      .from("event_settings")
      .update({ mid_judging_open: settings?.mid_judging_open ?? false })
      .eq("id", 1);
    await cleanup(userId);
    console.log("cleanup done (switch restored, temp judge removed)");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
