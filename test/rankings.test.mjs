// rankings 뷰(2단계 선정) 회귀 테스트.
// 뷰 SQL을 마이그레이션 파일에서 직접 읽어 WASM 내장 Postgres(pglite)로 실행하고,
// 손계산 기대값과 대조한다. 뷰를 다시 수정하면(0013→0023→0040 처럼) 여기서 잡힌다.
//
// 검증하려는 구조(0040 → 0045):
//   1차 — 심사위원 + 팀 상호평가만으로 상위 N팀(기본 4) 선정. 주민표는 섞이지 않는다.
//   2차 — 그 N팀 안에서만 주민투표로 순서를 가른다(1위 = 노원구청장 표창).
// 주민표가 1차 선정에 영향을 주지 않는다는 점이 이 테스트의 핵심이다.
// 0045 부터 주민표는 운영진 수기 입력이 아니라 전시장 QR 투표 기록(audience_votes)이다.
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
  "0057_paper_judge_score.sql"
);

// 마이그레이션에서 view 정의만 추출(뒤따르는 revoke 는 pglite 에 없는 롤을 참조하므로 제외).
// 뷰 정의 안에는 세미콜론이 없다는 전제를 유지한다.
function extractViewSql(path) {
  const sql = readFileSync(path, "utf8");
  const start = sql.indexOf("create view rankings");
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
    -- 0052·0054: 참여도(불참 인원)·발표 점수는 운영진이 teams 에 적는다.
    create table teams (
      id uuid primary key, name text not null,
      absent_count int not null default 0,
      presentation_score int not null default 0,
      judge_paper_score numeric(4,1),
      status text not null default 'forming'
    );
    create table projects (
      id uuid primary key,
      team_id uuid not null references teams(id),
      title text
    );
    create table audience_ballots ( code text primary key );
    create table audience_votes (
      ballot_code text not null references audience_ballots(code),
      project_id uuid not null references projects(id),
      primary key (ballot_code, project_id)
    );
    -- 0053: 심사표는 round 로 나뉜다. 본선 채점표 배점 합은 90(0054).
    create table criteria (
      id uuid primary key, max_score int not null default 10,
      round text not null default 'final'
    );
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
    insert into criteria(id,max_score) values ('${C1}',45),('${C2}',45);
    -- A~D 는 발표 만점(5)·전원 출석(참여도 5) → 심사 점수 = 심사위원 pct×90 + 10.
    -- E 는 무점수에 발표 0·불참 5 → 심사 점수 0 (0054 이후에도 0점 팀이 가능함을 본다).
    insert into teams(id,name,presentation_score,absent_count) values
      ('${U(1)}','A',5,0),('${U(2)}','B',5,0),('${U(3)}','C',5,0),('${U(4)}','D',5,0),
      ('${U(5)}','E',0,5);
    insert into projects(id,team_id,title) values
      ('${U(11)}','${U(1)}','pA'),
      ('${U(12)}','${U(2)}','pB'),
      ('${U(13)}','${U(3)}','pC'),
      ('${U(14)}','${U(4)}','pD'),
      ('${U(15)}','${U(5)}','pE');
  `);

  // 주민표 — 투표권(QR) 한 장이 한 팀에 한 표. 예전 수기 입력값과 같은 분포를
  // 실제 표 행으로 깐다: pA 10, pB 90, pC 25, pD 0, pE 200.
  await castAudienceVotes(db, { 11: 10, 12: 90, 13: 25, 14: 0, 15: 200 });
  const judge = { 11: 45, 12: 36, 13: 20, 14: 27 }; // pE 는 무점수 (pct 100/80/44.4/60)
  for (const [pid, s] of Object.entries(judge))
    for (const J of [J1, J2])
      for (const C of [C1, C2])
        await db.query(
          `insert into judge_scores(project_id,judge_id,criteria_id,score) values ($1,$2,$3,$4)`,
          [U(pid), J, C, s]
        );
  const team = { 11: 45, 12: 27, 13: 18, 14: 18 }; // pct 100/60/40/40
  for (const [pid, s] of Object.entries(team))
    for (const C of [C1, C2])
      await db.query(
        `insert into team_scores(project_id,voter_team_id,criteria_id,score) values ($1,$2,$3,$4)`,
        [U(pid), VT, C, s]
      );

  await db.exec(extractViewSql(migration));
  return db;
}

// 팀별 득표수만큼 서로 다른 투표권으로 표를 넣는다.
async function castAudienceVotes(db, votesByProject) {
  let n = 0;
  for (const [pid, count] of Object.entries(votesByProject)) {
    for (let i = 0; i < count; i++) {
      const code = `B${String(n++).padStart(7, "0")}`;
      await db.query(`insert into audience_ballots(code) values ($1)`, [code]);
      await db.query(
        `insert into audience_votes(ballot_code, project_id) values ($1, $2)`,
        [code, U(pid)]
      );
    }
  }
}

// 심사(100) = 심사위원 pct×90 + 발표 5 + 참여도 5 (0054)
//   A pct100 → 100, B pct80 → 82, C pct44.4 → 50, D pct60 → 64, E → 0
// 1차 점수 = (심사×0.5 + 팀×0.25) / 0.75
//   A 심사100 팀100 → 100
//   B 심사 82 팀 60 → (41+15)/0.75 = 74.67
//   D 심사 64 팀 40 → (32+10)/0.75 = 56
//   C 심사 50 팀 40 → (25+10)/0.75 = 46.67
//   E 무점수        → 0
test("rankings: 1차 점수는 심사·팀 상호평가만으로 계산된다", async () => {
  const db = await setup();
  // 0050 부터 final_score 는 진출팀엔 주민표까지 합산된 값이라, 1차 점수는
  // 뷰가 내놓는 심사·팀 점수로 같은 식을 다시 계산해 본다.
  const { rows } = await db.query(
    `select team_name, judge_score, team_votes, stage1_rank from rankings order by stage1_rank`
  );
  const stage1 = (r) =>
    (Number(r.judge_score) * 0.5 + Number(r.team_votes) * 0.25) / 0.75;
  const expected = [
    { team: "A", score: 100.0 },
    { team: "B", score: 74.67 },
    { team: "D", score: 56.0 },
    { team: "C", score: 46.67 },
    { team: "E", score: 0.0 },
  ];
  rows.forEach((r, i) => {
    assert.equal(r.team_name, expected[i].team, `${i + 1}위 팀`);
    assert.ok(
      Math.abs(stage1(r) - expected[i].score) < 0.01,
      `${r.team_name} 1차 점수: ${stage1(r).toFixed(2)} (기대 ${expected[i].score})`
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

test("rankings: 표시 순서 = 시상 순서 (선정팀 먼저, 그 안에서 합산 점수 순)", async () => {
  const db = await setup();
  const { rows } = await db.query(`select team_name, is_finalist from rankings`);

  // 선정 4팀의 최종 = 심사×0.5 + 팀×0.25 + 주민(진출팀 최다 90표 = 100)×0.25 (0050)
  //   A 50+25+2.78 = 77.78, B 41+15+25 = 81, C 25+10+6.94 = 41.94, D 32+10+0 = 42
  //   → B > A > D > C
  assert.deepEqual(
    rows.map((r) => r.team_name),
    ["B", "A", "D", "C", "E"],
    "1위(B)가 노원구청장상, 그다음 3팀이 총장상, E 는 미선정"
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

// 0054: 발표·참여도는 심사위원 pct 와 무관하게 그대로 더해지고, 불참은 5점에서
// 인당 1점씩 빼되 0 아래로는 내려가지 않는다.
test("rankings: 발표 점수와 불참 인원이 심사 점수에 그대로 반영된다", async () => {
  const db = await setup();
  const score = async (name) =>
    Number(
      (
        await db.query(`select judge_score from rankings where team_name = $1`, [name])
      ).rows[0].judge_score
    );

  assert.equal(await score("A"), 100, "pct100 + 발표 5 + 참여도 5");

  await db.query(`update teams set presentation_score = 2 where name = 'A'`);
  assert.equal(await score("A"), 97, "발표 5 → 2 면 3점 감소");

  await db.query(`update teams set absent_count = 3 where name = 'A'`);
  assert.equal(await score("A"), 94, "불참 3명이면 참여도 5 → 2");

  await db.query(`update teams set absent_count = 9 where name = 'A'`);
  assert.equal(await score("A"), 92, "불참이 5명을 넘어도 참여도는 0 까지만 깎인다");
});

// 0056: 기권 팀은 순위·진출 계산에서 통째로 빠진다 — 진출 슬롯도 차지하지 않는다.
test("rankings: 기권 팀은 집계에서 빠지고 진출 슬롯을 차지하지 않는다", async () => {
  const db = await setup({ finalistCount: 3 });
  await db.query(`update teams set status = 'withdrawn' where name = 'A'`);
  const { rows } = await db.query(`select team_name, is_finalist from rankings`);
  assert.ok(!rows.some((r) => r.team_name === "A"), "기권 팀이 표에 없어야 한다");
  assert.deepEqual(
    rows.filter((r) => r.is_finalist).map((r) => r.team_name).sort(),
    ["B", "C", "D"],
    "A 가 빠진 자리를 다음 순위가 채운다"
  );
});

// 0057: 심사위원이 종이로 채점하면 운영진이 팀별 평균(90점 만점)을 적는다.
// 값이 있으면 웹 채점을 대신하고, 발표·참여도는 그대로 더해진다.
test("rankings: 종이 심사 점수가 있으면 웹 채점 대신 쓰인다", async () => {
  const db = await setup();
  const score = async (name) =>
    Number(
      (
        await db.query(`select judge_score from rankings where team_name = $1`, [name])
      ).rows[0].judge_score
    );

  assert.equal(await score("B"), 82, "종이 점수 없음 → 웹 pct80×90 + 10");

  await db.query(`update teams set judge_paper_score = 72.5 where name = 'B'`);
  assert.equal(await score("B"), 82.5, "종이 72.5 + 발표 5 + 참여도 5");

  await db.query(`update teams set judge_paper_score = 60 where name = 'E'`);
  assert.equal(await score("E"), 60, "웹 채점이 전혀 없는 팀도 종이 점수로 집계된다 (발표 0·불참 5)");

  await db.query(`update teams set judge_paper_score = null where name = 'B'`);
  assert.equal(await score("B"), 82, "지우면 다시 웹 채점으로 돌아간다");
});
