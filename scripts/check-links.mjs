// 제출 링크 일괄 점검: 팀이 낸 GitHub 저장소 · 참고자료(드라이브) 링크를
// 로그인하지 않은 외부인 입장에서 열어보고, 막혀 있는 팀을 뽑아낸다.
//
//   node scripts/check-links.mjs           # 전체 점검
//   node scripts/check-links.mjs --bad     # 조치가 필요한 팀만
//
// 판정 기준
//   · GitHub private 저장소는 비로그인 요청에 404 를 돌려준다 → '비공개'
//   · 구글 드라이브는 권한이 막히면 accounts.google.com 로그인으로 넘긴다 → '비공개'
// 둘 다 브라우저 시크릿 창으로 여는 것과 같은 조건이므로, 여기서 ✅ 면 심사위원도 열 수 있다.
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
if (!url || !key)
  throw new Error(".env.local 에 NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 필요합니다");

const onlyBad = process.argv.includes("--bad");
const h = { apikey: key, Authorization: `Bearer ${key}` };

const rest = async (path) => {
  const res = await fetch(`${url}/rest/v1/${path}`, { headers: h });
  if (!res.ok) throw new Error(`${path} → ${res.status} ${await res.text()}`);
  return res.json();
};

// 기권 팀은 심사 대상이 아니므로 제외한다 (0056).
const teams = (await rest("teams?select=id,team_no,name,status")).filter(
  (t) => t.status !== "withdrawn",
);
const projects = await rest("projects?select=team_id,title,repo_url,deck_url");
const byTeam = new Map(projects.map((p) => [p.team_id, p]));

// ---------- 링크 한 건 점검 ----------
async function checkUrl(raw) {
  if (!raw || !raw.trim()) return { ok: false, label: "미제출", fix: true };

  let u;
  try {
    u = new URL(raw.trim());
  } catch {
    return { ok: false, label: `주소 형식 오류`, fix: true };
  }
  if (!/^https?:$/.test(u.protocol))
    return { ok: false, label: "http(s) 아님", fix: true };

  let res;
  try {
    res = await fetch(u, {
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
      // 기본 UA 로는 일부 사이트가 거르는 경우가 있어 브라우저처럼 보낸다.
      headers: { "User-Agent": "Mozilla/5.0 (link-check; KW-hackathon)" },
    });
  } catch (e) {
    return { ok: false, label: `접속 실패 (${e.name})`, fix: true };
  }

  // 구글 계열은 권한이 없으면 로그인 페이지로 넘긴다. 상태코드는 200 이므로
  // 최종 도착지 호스트로 판정해야 한다.
  const finalHost = (() => {
    try {
      return new URL(res.url).hostname;
    } catch {
      return u.hostname;
    }
  })();
  if (/(^|\.)accounts\.google\.com$/.test(finalHost))
    return { ok: false, label: "비공개 (로그인 요구)", fix: true };

  if (/(^|\.)github\.com$/.test(u.hostname)) {
    if (res.status === 404)
      return { ok: false, label: "비공개 또는 없음 (404)", fix: true };
    // 비로그인 과다 요청 시 GitHub 가 429 를 준다. 팀 잘못이 아니므로 재확인 대상.
    if (res.status === 429)
      return { ok: false, label: "판정 보류 (429 · 재실행 필요)", fix: false };
    if (res.ok) return { ok: true, label: "공개" };
    return { ok: false, label: `HTTP ${res.status}`, fix: true };
  }

  if (res.ok) return { ok: true, label: "공개" };
  return { ok: false, label: `HTTP ${res.status}`, fix: true };
}

// ---------- 동시 실행 (과하면 GitHub 가 429 를 준다) ----------
async function pool(items, size, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (i < items.length) {
        const n = i++;
        out[n] = await fn(items[n]);
      }
    }),
  );
  return out;
}

const rows = await pool(teams, 5, async (t) => {
  const p = byTeam.get(t.id);
  if (!p) return { t, none: true };
  const [repo, deck] = await Promise.all([
    checkUrl(p.repo_url),
    checkUrl(p.deck_url),
  ]);
  return { t, p, repo, deck };
});

// ---------- 출력 ----------
// 한글은 터미널에서 두 칸을 차지한다. 열을 맞추려면 실제 표시 폭으로 계산해야 한다.
const width = (s) =>
  [...s].reduce((n, c) => n + (/[\u1100-\u11FF\u3000-\u9FFF\uAC00-\uD7AF\uFF00-\uFF60]/.test(c) ? 2 : 1), 0);
const pad = (s, w) => s + " ".repeat(Math.max(0, w - width(s)));

const mark = (r) => (r.none ? "—" : r.ok ? `✅ ${r.label}` : `❌ ${r.label}`);
const isBad = (r) => r.none || (!r.repo.ok || !r.deck.ok);

rows.sort((a, b) => (a.t.team_no ?? 999) - (b.t.team_no ?? 999));
const shown = onlyBad ? rows.filter(isBad) : rows;

console.log(
  `\n${pad("조", 5)}${pad("팀명", 22)}${pad("GitHub 저장소", 30)}참고자료 링크`,
);
console.log("-".repeat(96));
for (const r of shown) {
  const no = r.t.team_no ? `${r.t.team_no}조` : "-";
  if (r.none) {
    console.log(`${pad(no, 5)}${pad(r.t.name, 22)}❌ 프로젝트 미제출`);
    continue;
  }
  console.log(
    `${pad(no, 5)}${pad(r.t.name, 22)}${pad(mark(r.repo), 30)}${mark(r.deck)}`,
  );
}

const bad = rows.filter(isBad);
console.log(
  `\n전체 ${rows.length}팀 · 정상 ${rows.length - bad.length}팀 · 조치 필요 ${bad.length}팀`,
);
if (bad.length) {
  console.log("\n[연락 대상]");
  for (const r of bad) {
    const no = r.t.team_no ? `${r.t.team_no}조` : "-";
    const why = r.none
      ? "프로젝트 미제출"
      : [
          r.repo.ok ? null : `GitHub: ${r.repo.label}`,
          r.deck.ok ? null : `참고자료: ${r.deck.label}`,
        ]
          .filter(Boolean)
          .join(" / ");
    console.log(`  ${no} ${r.t.name} — ${why}`);
  }
}
