-- =============================================================
--  0010 — 참고자료(PDF) 업로드용 Storage 버킷
--  공개 버킷: 갤러리에서 링크로 열람 가능.
--  업로드는 서버 액션(Service Role)이 처리하므로 별도 정책 불필요.
-- =============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('decks', 'decks', true, 20971520, array['application/pdf'])
on conflict (id) do update
  set public = true,
      file_size_limit = 20971520,
      allowed_mime_types = array['application/pdf'];
