// 일회성 운영 스크립트: 지정한 이메일로 Supabase 가입 초대를 보내고
// users.role 을 admin 으로 올린다. (service role key 필요)
//   node scripts/invite-admin.mjs <email>
import fs from "node:fs";

const env = Object.fromEntries(
  fs
    .readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
const site = "https://www.kw-hackathon.co.kr";
const email = process.argv[2];
if (!email) throw new Error("사용법: node scripts/invite-admin.mjs <email>");

const h = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
};

const invite = await fetch(`${url}/auth/v1/invite`, {
  method: "POST",
  headers: h,
  body: JSON.stringify({ email, redirect_to: `${site}/auth/callback` }),
});
const invited = await invite.json();
console.log("invite:", invite.status, JSON.stringify(invited));
if (!invite.ok) process.exit(1);

// 가입 트리거가 public.users 행을 만들 때까지 잠깐 기다린다.
let row = null;
for (let i = 0; i < 10; i++) {
  const res = await fetch(
    `${url}/rest/v1/users?id=eq.${invited.id}&select=id,email,role`,
    { headers: h },
  );
  const rows = await res.json();
  if (Array.isArray(rows) && rows.length) {
    row = rows[0];
    break;
  }
  await new Promise((r) => setTimeout(r, 500));
}
console.log("users row:", JSON.stringify(row));

const target = row
  ? `${url}/rest/v1/users?id=eq.${invited.id}`
  : `${url}/rest/v1/users`;
const patch = await fetch(target, {
  method: row ? "PATCH" : "POST",
  headers: { ...h, Prefer: "return=representation" },
  body: JSON.stringify(row ? { role: "admin" } : { id: invited.id, email, role: "admin" }),
});
console.log("role update:", patch.status, await patch.text());
