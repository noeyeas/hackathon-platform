-- =============================================================
--  0041 — 제출작 예시 이미지(썸네일)
-- =============================================================
-- 갤러리 카드가 제목 첫 글자만 크게 띄우고 있어 어떤 결과물인지 알기 어렵다.
-- 팀이 화면 예시 이미지를 올리면 그것을 썸네일로 쓰고, 없을 때만 첫 글자로
-- 대체한다. 이미 제출한 팀이 있으므로 null 허용.
alter table projects add column if not exists thumbnail_url text;

-- 0035 에서 테이블 단위 SELECT 를 회수하고 컬럼을 하나씩 부여했으므로,
-- 새 컬럼도 명시적으로 열어줘야 갤러리에서 읽힌다.
grant select (thumbnail_url) on projects to anon, authenticated;

-- 업로드는 서버 액션(Service Role)이 처리하므로 별도 정책 불필요.
-- 공개 버킷 — 갤러리에서 <img> 로 바로 불러온다.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('thumbnails', 'thumbnails', true, 5242880,
        array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do update
  set public = true,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
