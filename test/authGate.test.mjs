// 권한 경계 회귀 테스트.
//
// 배경: 운영 콘솔의 권한 검사가 admin/layout.tsx 의 redirect() 하나뿐이던 때,
// 레이아웃과 페이지가 나란히 렌더되는 탓에 판정이 끝나기 전에 페이지가 이미
// 서비스 롤로 데이터를 조회해 HTML 에 실어 보냈다. 응답이 302 가 아니라
// 200 + meta refresh 라 브라우저만 튕겼고, curl 한 줄이면 팀명·심사위원
// 이름·순위가 읽혔다. 화면상으로는 멀쩡해 보여서 눈으로는 못 잡는다.
//
// 그래서 방어를 두 겹으로 두고, 여기서 두 겹을 각각 고정한다.
//  1) 미들웨어 — 확실한 비로그인 요청을 렌더 전에 끊는다 (shouldBlockBeforeRender)
//  2) 페이지   — 서비스 롤 클라이언트를 만들기 전에 스스로 requireAdmin() 확인
//
// 실행: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  isAdminPath,
  hasSupabaseAuthCookie,
  shouldBlockBeforeRender,
} from "../src/lib/authGate.ts";

// ---------------------------------------------------------------
// 1겹: 미들웨어 판정
// ---------------------------------------------------------------
const AUTH_COOKIE = "sb-abcdefgh-auth-token";

test("isAdminPath — /admin 자신과 하위 경로", () => {
  assert.equal(isAdminPath("/admin"), true);
  assert.equal(isAdminPath("/admin/teams"), true);
  assert.equal(isAdminPath("/admin/scoring/deep/nested"), true);
});

test("isAdminPath — 접두사만 같은 남의 경로는 아니다", () => {
  // startsWith("/admin") 하나로 판정하면 여기서 잘못 걸린다.
  assert.equal(isAdminPath("/administrators"), false);
  assert.equal(isAdminPath("/adminish"), false);
  assert.equal(isAdminPath("/gallery"), false);
  assert.equal(isAdminPath("/"), false);
});

test("hasSupabaseAuthCookie — 세션 쿠키를 알아본다", () => {
  assert.equal(hasSupabaseAuthCookie([AUTH_COOKIE]), true);
  assert.equal(
    hasSupabaseAuthCookie(["gallery_seed", AUTH_COOKIE, "vw_abc"]),
    true
  );
  // 분할 저장되는 큰 토큰(.0/.1 접미사)도 세션으로 본다
  assert.equal(hasSupabaseAuthCookie([`${AUTH_COOKIE}.0`]), true);
});

test("hasSupabaseAuthCookie — 무관한 쿠키만 있으면 비로그인", () => {
  assert.equal(hasSupabaseAuthCookie([]), false);
  assert.equal(hasSupabaseAuthCookie(["gallery_seed", "vw_abc"]), false);
  // 이름이 비슷하기만 한 쿠키에 속지 않는다
  assert.equal(hasSupabaseAuthCookie(["sb-something-else"]), false);
  assert.equal(hasSupabaseAuthCookie(["my-auth-token"]), false);
});

test("shouldBlockBeforeRender — 비로그인의 운영 콘솔 요청은 렌더 전에 끊는다", () => {
  for (const p of ["/admin", "/admin/teams", "/admin/scoring"]) {
    assert.equal(
      shouldBlockBeforeRender(p, ["gallery_seed"]),
      true,
      `${p} 은 비로그인에게 막혀야 한다`
    );
  }
});

test("shouldBlockBeforeRender — 공개 페이지는 막지 않는다", () => {
  for (const p of ["/", "/gallery", "/notice", "/login", "/administrators"]) {
    assert.equal(shouldBlockBeforeRender(p, []), false, `${p} 은 공개여야 한다`);
  }
});

test("shouldBlockBeforeRender — 세션이 있으면 통과시킨다(역할 확인은 페이지 몫)", () => {
  // 여기서 역할까지 판정하지 않는다 — 쿠키만 보고 운영진 여부를 알 수 없다.
  // 통과시킨 뒤 페이지의 requireAdmin() 이 거른다(아래 2겹).
  assert.equal(shouldBlockBeforeRender("/admin", [AUTH_COOKIE]), false);
});

// ---------------------------------------------------------------
// 2겹: 운영 페이지가 조회 전에 스스로 확인하는가
//
// 소스를 읽어서 검사한다. 앞으로 누가 /admin 아래에 페이지를 새로 만들 때
// 가드를 빠뜨리면 이 테스트가 잡는다 — 원래 사고가 딱 그 모양이었다.
// ---------------------------------------------------------------
const ADMIN_DIR = join(import.meta.dirname, "..", "src", "app", "admin");

function adminPages(dir = ADMIN_DIR) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...adminPages(full));
    else if (entry.name === "page.tsx") out.push(full);
  }
  return out;
}

const PAGES = adminPages();

test("운영 페이지가 하나 이상 발견된다(탐색 자체가 깨지지 않았는지)", () => {
  assert.ok(PAGES.length > 0, "src/app/admin 아래 page.tsx 를 찾지 못했다");
});

for (const file of PAGES) {
  const rel = file.slice(file.indexOf("src"));

  test(`${rel} — 데이터 조회 전에 requireAdmin() 을 확인한다`, () => {
    const src = readFileSync(file, "utf8");

    assert.ok(
      src.includes("requireAdmin()"),
      "레이아웃의 검사는 페이지 렌더를 막지 못한다 — 페이지가 직접 확인해야 한다"
    );

    // 서비스 롤을 쓰는 페이지는 그 호출보다 가드가 먼저여야 한다.
    const guardAt = src.indexOf("requireAdmin()");
    const serviceRoleAt = src.indexOf("createAdminClient()");
    if (serviceRoleAt !== -1) {
      assert.ok(
        guardAt < serviceRoleAt,
        "createAdminClient() 는 RLS 를 우회한다 — requireAdmin() 이 먼저여야 한다"
      );
    }
  });
}
