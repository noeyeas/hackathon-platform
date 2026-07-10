-- =============================================================
--  0027 — 0026 조회수 RPC 잠금 보정
--
--  함수는 CREATE 시 EXECUTE 가 PUBLIC 에 자동 부여된다. 그래서 0026 의
--  `revoke ... from anon, authenticated` 만으로는 PUBLIC 을 통해 여전히
--  호출 가능(실측: anon 호출 성공). PUBLIC 에서 회수하고 서버 롤에만
--  명시적으로 부여한다. 앱 pingView 는 Service Role 로 호출하므로 정상.
--
--  적용 후: anon 키로 rpc('increment_project_view') → 거부돼야 함.
-- =============================================================
revoke execute on function increment_project_view(uuid)
  from public, anon, authenticated;
grant  execute on function increment_project_view(uuid)
  to service_role;
