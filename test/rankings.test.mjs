// rankings 뷰(2단계 선정) 회귀 테스트.
// 뷰 SQL을 마이그레이션 파일에서 직접 읽어 WASM 내장 Postgres(pglite)로 실행하고,
// 손계산 기대값과 대조한다. 뷰를 다시 수정하면(0013→0023→0040 처럼) 여기서 잡힌다.
//
// 검증하려는 구조(0040):
//   1차 — 심사위원 + 팀 상호평가만으로 상위 N팀(기본 4) 선정. 주민표는 섞이지 않는다.
//   2차 — 그 N팀 안에서만 주민투표로 순서를 가른다(1위 = 노원구청장 표창).
// 주민표가 1차 선정에 영향을 주지 않는다는 점이 이 테스트의 핵심이다.
// 실행: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const here = dirname(fileURLToPath(import.meta.url));
const migration = join(
  here,
  "..",
  "supabase",
  "migrations",
  "0040_two_stage_selection.sql"
);

// 마이그레이션에서 view 정의만 추출(뒤따르는 revoke 는 pglite 에 없는 롤을 참조하므로 제외).
// 뷰 정의 안에는 세미콜론이 없다는 전제를 유지한다.
function extractViewSql(path) {
  const sql = readFileSync(path, "utf8");
  const start = sql.indexOf("create or replace view rankings");
  assert.notEqual(start, -1, "마이그레이션에서 rankings 뷰를 찾지 못함");
  const end = sql.indexOf(";", start);
  return sql.slice(start, end + 1);
}

const U = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;

// 주민표는 1차 점수와 일부러 어긋나게 깔아둔다.
// pE 는 주민표 1위(200표)지만 무점수라 선정되지 않아야 하고,
// pD 는 주민표 0표지만 1차 점수로 선정권에 들어야 한다.
async function setup({ finalistCount = 4 } = {}) {
  const db = new PGlite();
  await db.exec(`
    create table teams ( id uuid primary key, name text not null );
    create table projects (
      id uuid primary key,
      team_id uuid not null references teams(id),
      title text,
      audience_votes_manual int not null default 0
    );
    create table criteria ( id uuid primary key, max_score int not null default 10 );
    create table judge_scores (
      project_id uuid not null, judge_id uuid not null,
      criteria_id uuid not null references criteria(id), score int not null
    );
    create table team_scores (
      project_id uuid not null, voter_team_id uuid not null,
      criteria_id uuid not null references criteria(id), score int not null
    );
    create table event_settings (
      id int primary key, weights jsonb not null, finalist_count int not null default 4
    );
    insert into event_settings(id, weights, finalist_count)
      values (1, '{"judge":0.5,"team":0.25,"audience":0.25}', ${finalistCount});
  `);

  const C1 = U(101), C2 = U(102), J1 = U(201), J2 = U(202), VT = U(301);
  await db.exec(`
    insert into criteria(id,max_score) values ('${C1}',10),('${C2}',10);
    insert into teams(id,name) values
      ('${U(1)}','A'),('${U(2)}','B'),('${U(3)}','C'),('${U(4)}','D'),('${U(5)}','E');
    insert into projects(id,team_id,title,audience_votes_manual) values
      ('${U(11)}','${U(1)}','pA',10),
      ('${U(12)}','${U(2)}','pB',90),
      ('${U(13)}','${U(3)}','pC',25),
      ('${U(14)}','${U(4)}','pD',0),
      ('${U(15)}','${U(5)}','pE',200);
  `);
  const judge = { 11: 10, 12: 8, 13: 5, 14: 6 }; // pE 는 무점수
  for (const [pid, s] of Object.entries(judge))
    for (const J of [J1, J2])
      for (const C of [C1, C2])
        await db.query(
          `insert into judge_scores(project_id,judge_id,criteria_id,score) values ($1,$2,$3,$4)`,
          [U(pid), J, C, s]
        );
  const team = { 11: 10, 12: 6, 13: 4, 14: 4 };
  for (const [pid, s] of Object.entries(team))
    for (const C of [C1, C2])
      await db.query(
        `insert into team_scores(project_id,voter_team_id,criteria_id,score) values ($1,$2,$3,$4)`,
        [U(pid), VT, C, s]
      );

  await db.exec(extractViewSql(migration));
  return db;
}

// 1차 점수 = (심사×0.5 + 팀×0.25) / 0.75
//   A 심사100 팀100 → 100
//   B 심사 80 팀 60 → (40+15)/0.75 = 73.33
//   C 심사 50 팀 40 → (25+10)/0.75 = 46.67
//   D 심사 60 팀 40 → (30+10)/0.75 = 53.33
//   E 무점수        → 0
test("rankings: 1차 점수는 심사·팀 상호평가만으로 계산된다", async () => {
  const db = await setup();
  const { rows } = await db.query(
    `select team_name, final_score, stage1_rank from rankings order by stage1_rank`
  );
  const expected = [
    { team: "A", score: 100.0 },
    { team: "B", score: 73.33 },
    { team: "D", score: 53.33 },
    { team: "C", score: 46.67 },
    { team: "E", score: 0.0 },
  ];
  rows.forEach((r, i) => {
    assert.equal(r.team_name, expected[i].team, `${i + 1}위 팀`);
    assert.ok(
      Math.abs(Number(r.final_score) - expected[i].score) < 0.01,
      `${r.team_name} 1차 점수: ${r.final_score} (기대 ${expected[i].score})`
    );
  });
});

test("rankings: 주민표가 아무리 많아도 1차 선정을 뒤집지 못한다", async () => {
  const db = await setup();
  const { rows } = await db.query(
    `select team_name, is_finalist, audience_votes from rankings`
  );
  const byTeam = Object.fromEntries(rows.map((r) => [r.team_name, r]));

  // E 는 주민표 200 으로 전체 1위지만 1차 점수가 0 이라 탈락해야 한다.
  assert.equal(Number(byTeam.E.audience_votes), 200, "E 가 주민표 최다 전제");
  assert.equal(byTeam.E.is_finalist, false, "무점수 팀이 주민표로 선정되면 안 된다");

  // D 는 주민표 0 이지만 1차 점수로 선정권에 들어야 한다.
  assert.equal(Number(byTeam.D.audience_votes), 0, "D 가 주민표 0 전제");
  assert.equal(byTeam.D.is_finalist, true, "주민표 0 이어도 1차 점수로 선정된다");
});

test("rankings: 선정 팀 수는 finalist_count 를 따른다", async () => {
  for (const n of [1, 3, 4]) {
    const db = await setup({ finalistCount: n });
    const { rows } = await db.query(
      `select count(*)::int as c from rankings where is_finalist`
    );
    assert.equal(rows[0].c, n, `finalist_count=${n} 일 때 선정 팀 수`);
  }
});

test("rankings: 표시 순서 = 시상 순서 (선정팀 먼저, 그 안에서 주민표 순)", async () => {
  const db = await setup();
  const { rows } = await db.query(`select team_name, is_finalist from rankings`);

  // 선정 4팀: A(10표), B(90표), C(25표), D(0표) → 주민표 순 B > C > A > D
  assert.deepEqual(
    rows.map((r) => r.team_name),
    ["B", "C", "A", "D", "E"],
    "1위(B)가 노원구청장 표창, 그다음 3팀이 총장상, E 는 미선정"
  );
  assert.equal(rows[0].is_finalist, true);
  assert.equal(rows[4].is_finalist, false, "미선정 팀은 항상 뒤로");
});

test("rankings: 무점수 팀도 에러 없이 0점으로 집계된다", async () => {
  const db = await setup();
  const { rows } = await db.query(
    `select team_name, final_score from rankings order by stage1_rank desc limit 1`
  );
  assert.equal(rows[0].team_name, "E");
  assert.equal(Number(rows[0].final_score), 0);
});
