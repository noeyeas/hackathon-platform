-- =============================================================
--  0029 — 미사용 decks 스토리지 버킷 정리
--  참고자료가 PDF 업로드 → 외부 링크(구글 드라이브 등) 방식으로 전환되어
--  0010 에서 만든 'decks' 버킷은 더 이상 쓰지 않는다.
--
--  안전장치: 버킷에 파일이 하나라도 남아 있으면 삭제하지 않고 건너뛴다.
--  (이미 업로드된 PDF의 링크가 깨지는 것을 방지) 파일이 남아 있으면
--  운영진이 내용을 확인한 뒤 수동으로 처리할 것.
-- =============================================================
do $$
declare
  n int;
begin
  select count(*) into n from storage.objects where bucket_id = 'decks';
  if n > 0 then
    raise notice 'decks 버킷에 %개의 파일이 남아 있어 삭제를 건너뜁니다. 수동 확인 필요.', n;
  else
    delete from storage.buckets where id = 'decks';
    raise notice 'decks 버킷을 삭제했습니다.';
  end if;
end $$;
