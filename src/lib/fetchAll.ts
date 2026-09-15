// PostgREST 는 한 요청에 최대 1,000행(Supabase 기본 max-rows)만 돌려준다.
// 팀 상호평가 행은 40팀 × 39대상 × 5기준 = 7,800행이라 한 번에 읽으면
// 조용히 잘려 운영 대시보드의 "평가 완료" 수가 실제보다 적게 나온다.
// 집계용 전 행 조회는 반드시 이 헬퍼로 끝까지 페이지를 넘겨 읽는다.
//
// 넘겨받는 쿼리는 .range() 를 붙이지 않은 상태여야 한다.
// 페이지마다 같은 쿼리를 새로 만들어야 하므로 팩토리로 받는다.

type PageResult<T> = { data: T[] | null; error: { message: string } | null };
type RangeQuery<T> = { range(from: number, to: number): PromiseLike<PageResult<T>> };

export const FETCH_ALL_PAGE = 1000;

export async function fetchAll<T>(
  makeQuery: () => RangeQuery<T>,
  pageSize = FETCH_ALL_PAGE
): Promise<PageResult<T>> {
  const all: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await makeQuery().range(from, from + pageSize - 1);
    if (error) return { data: null, error };
    const rows = data ?? [];
    all.push(...rows);
    // 페이지가 덜 찼으면 마지막이다. 정확히 찼으면 다음 페이지가 비어 있어도 한 번 더 확인한다.
    if (rows.length < pageSize) break;
  }
  return { data: all, error: null };
}
