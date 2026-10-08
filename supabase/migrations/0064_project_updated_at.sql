-- =============================================================
--  0064 — 제출물 마지막 수정 시각(updated_at) · 갤러리 최신순
--
--  갤러리 '최신순'이 submitted_at(첫 제출 시각)으로 정렬돼, 팀이 제출물을
--  고치거나 예시 이미지를 다시 올려도 순서가 바뀌지 않았다. submitted_at 은
--  insert 때 한 번만 채워지고 upsert 의 update 경로에서는 그대로 남기 때문이다.
--
--  · updated_at — 제출물 내용이 실제로 바뀐 마지막 시각. 기존 행은 submitted_at 으로 채운다.
--  · 트리거가 내용 칸(제목·설명·주제·링크·이미지)이 바뀐 update 에서만 갱신한다.
--    조회수(view_count)·발표 순서(present_order) 같은 운영 값이 바뀔 때는
--    건드리지 않는다 — 조회 한 번에 '최신'으로 튀어 오르면 안 된다.
--    클라이언트가 updated_at 을 직접 써도 트리거가 덮어쓴다.
--  · 0025·0035 처럼 projects 는 컬럼 단위 SELECT 만 열려 있다. 새 컬럼도
--    부여하지 않으면 갤러리 조회가 permission denied 로 통째로 실패한다(0061 교훈).
-- =============================================================

alter table projects add column if not exists updated_at timestamptz;
update projects set updated_at = submitted_at where updated_at is null;
alter table projects alter column updated_at set default now();
alter table projects alter column updated_at set not null;

create or replace function touch_project_updated_at() returns trigger as $$
begin
  if (new.title, new.description, new.track, new.repo_url, new.demo_url,
      new.video_url, new.deck_url, new.thumbnail_url)
     is distinct from
     (old.title, old.description, old.track, old.repo_url, old.demo_url,
      old.video_url, old.deck_url, old.thumbnail_url) then
    new.updated_at := now();
  else
    new.updated_at := old.updated_at;
  end if;
  return new;
end; $$ language plpgsql set search_path = public;

drop trigger if exists trg_touch_project_updated_at on projects;
create trigger trg_touch_project_updated_at
  before update on projects
  for each row execute function touch_project_updated_at();

grant select (updated_at) on projects to anon, authenticated;
