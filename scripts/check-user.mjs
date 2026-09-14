// 일회성 점검 스크립트: 특정 이메일의 auth 상태와 users.role 을 확인한다.
//   node scripts/check-user.mjs <email>
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
const email = process.argv[2];
if (!email) throw new Error("사용법: node scripts/check-user.mjs <email>");

const h = { apikey: key, Authorization: `Bearer ${key}` };

const { users = [] } = await (
  await fetch(`${url}/auth/v1/admin/users?per_page=200`, { headers: h })
).json();
const u = users.find((x) => x.email === email);
console.log(
  "auth:",
  u
    ? JSON.stringify({
        id: u.id,
        invited_at: u.invited_at,
        email_confirmed_at: u.email_confirmed_at,
        last_sign_in_at: u.last_sign_in_at,
      })
    : "없음",
);

const rows = await (
  await fetch(
    `${url}/rest/v1/users?email=eq.${encodeURIComponent(email)}&select=id,email,name,role`,
    { headers: h },
  )
).json();
console.log("users:", JSON.stringify(rows));
