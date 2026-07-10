// rankings 뷰(종합 순위 집계) 회귀 테스트.
// 뷰 SQL을 마이그레이션 파일에서 직접 읽어 WASM 내장 Postgres(pglite)로 실행하고,
// 손계산 기대값과 대조한다. 뷰를 다시 수정하면(0013→0023 처럼) 이 테스트가 회귀를 잡는다.
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
  "0023_rankings_tiebreak.sql"
);

// 마이그레이션에서 view 정의만 추출(뒤따르는 revoke 는 pglite 에 없는 롤을 참조하므로 제외).
function extractViewSql(path) {
  const sql = readFileSync(path, "utf8");
  const start = sql.indexOf("create or replace view rankings");
  assert.notEqual(start, -1, "마이그레이션에서 rankings 뷰를 찾지 못함");
  const end = sql.indexOf(";", start); // 뷰 정의 내부에는 세미콜론이 없다
  return sql.slice(start, end + 1);
}

const U = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;

async function setup() {
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
    create table event_settings ( id int primary key, weights jsonb not null );
    insert into event_settings(id, weights)
      values (1, '{"judge":0.5,"team":0.25,"audience":0.25}');
  `);

  const C1 = U(101), C2 = U(102), J1 = U(201), J2 = U(202), VT = U(301);
  await db.exec(`
    insert into criteria(id,max_score) values ('${C1}',10),('${C2}',10);
    insert into teams(id,name) values
      ('${U(1)}','A'),('${U(2)}','B'),('${U(3)}','C'),('${U(4)}','D'),('${U(5)}','E');
    insert into projects(id,team_id,title,audience_votes_manual) values
      ('${U(11)}','${U(1)}','pA',100),
      ('${U(12)}','${U(2)}','pB',50),
      ('${U(13)}','${U(3)}','pC',25),
      ('${U(14)}','${U(4)}','pD',5),
      ('${U(15)}','${U(5)}','pE',0);
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

test("rankings: 정규화·가중·순위가 기대와 일치", async () => {
  const db = await setup();
  const { rows } = await db.query(`select * from rankings`);

  // 가중치 0.5/0.25/0.25, 주민표는 최댓값(100) 대비 상대 정규화
  const expected = [
    { team: "A", judge: 100, final: 100.0 },
    { team: "B", judge: 80, final: 67.5 },
    { team: "D", judge: 60, final: 41.25 }, // C 와 종합 동점 → 심사 우위로 앞
    { team: "C", judge: 50, final: 41.25 },
    { team: "E", judge: 0, final: 0.0 },
  ];

  assert.equal(rows.length, expected.length, "행 수 불일치");
  rows.forEach((r, i) => {
    assert.equal(r.team_name, expected[i].team, `${i + 1}위 팀 순서`);
    assert.ok(
      Math.abs(Number(r.final_score) - expected[i].final) < 0.001,
      `${r.team_name} 종합점수: ${r.final_score} (기대 ${expected[i].final})`
    );
    assert.ok(
      Math.abs(Number(r.judge_score) - expected[i].judge) < 0.05,
      `${r.team_name} 심사점수: ${r.judge_score} (기대 ${expected[i].judge})`
    );
  });
});

test("rankings: 종합 동점 시 심사점수로 결정적 정렬(타이브레이크)", async () => {
  const db = await setup();
  const { rows } = await db.query(
    `select team_name, final_score, judge_score from rankings
       where team_name in ('C','D')`
  );
  assert.equal(Number(rows[0].final_score), Number(rows[1].final_score), "C·D 동점 전제");
  assert.equal(rows[0].team_name, "D", "동점이면 심사 높은 D 가 먼저");
});

test("rankings: 무점수 팀도 에러 없이 0점 최하위", async () => {
  const db = await setup();
  const { rows } = await db.query(`select * from rankings`);
  const last = rows[rows.length - 1];
  assert.equal(last.team_name, "E");
  assert.equal(Number(last.final_score), 0);
});
