import { test } from "node:test";
import assert from "node:assert/strict";
import { viewerHash, clientIp } from "../src/lib/viewerHash.ts";

test("clientIp — x-forwarded-for 의 맨 앞(실제 클라이언트)만 쓴다", () => {
  const h = new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1, 10.0.0.2" });
  assert.equal(clientIp(h), "203.0.113.7");
});

test("clientIp — x-forwarded-for 가 없으면 x-real-ip 로 폴백", () => {
  assert.equal(clientIp(new Headers({ "x-real-ip": "198.51.100.4" })), "198.51.100.4");
  assert.equal(clientIp(new Headers()), null);
});

test("viewerHash — 같은 방문자는 같은 해시", () => {
  const a = viewerHash({ ip: "203.0.113.7", userAgent: "UA/1" });
  const b = viewerHash({ ip: "203.0.113.7", userAgent: "UA/1" });
  assert.equal(a, b);
});

test("viewerHash — IP 나 UA 가 다르면 다른 해시", () => {
  const base = viewerHash({ ip: "203.0.113.7", userAgent: "UA/1" });
  assert.notEqual(base, viewerHash({ ip: "203.0.113.8", userAgent: "UA/1" }));
  assert.notEqual(base, viewerHash({ ip: "203.0.113.7", userAgent: "UA/2" }));
});

// 로그인 사용자는 접속 IP 가 바뀌어도 한 사람으로 세야 한다.
test("viewerHash — 로그인 사용자는 IP 와 무관하게 동일", () => {
  const a = viewerHash({ userId: "u-1", ip: "203.0.113.7", userAgent: "UA/1" });
  const b = viewerHash({ userId: "u-1", ip: "198.51.100.4", userAgent: "UA/2" });
  assert.equal(a, b);
  assert.notEqual(a, viewerHash({ userId: "u-2" }));
});

// 원본 IP 가 그대로 남으면 익명 처리가 무의미해진다.
test("viewerHash — 원본 IP 가 해시에 노출되지 않는다", () => {
  const h = viewerHash({ ip: "203.0.113.7", userAgent: "UA/1" });
  assert.equal(h.includes("203.0.113.7"), false);
  assert.match(h, /^[0-9a-f]{64}$/);
});
