// 최종발표 「입장·참석 체크」 구글 시트에서 팀별 발표 점수·참여도 점수를 읽는다.
//
// 운영 결정(10/8): 본선 발표(5점)·참여도(5점)는 운영진이 이 시트에서 관리한다.
// 시트에 출석 체크·발표 시간을 입력하면 수식이 점수를 계산하고, 운영 화면
// (/admin/scoring)이 열릴 때마다 이 시트를 다시 읽어 상호평가 결과 옆에 보여준다.
// 사이트 DB 에 복사해 두지 않는 이유: 행사 당일 계속 바뀌는 값이라 복사본은
// 금방 낡고, "어느 쪽이 맞는가"가 헷갈린다. 원본은 시트 하나다.
//
// 시트는 링크 공개(보기)여야 한다 — 서버가 로그인 없이 CSV 로 내려받는다.
// 열 위치가 바뀌어도 되도록 머리글 이름(조번호 · 발표 점수 · 참여도 점수 ·
// 참여도 감점)으로 열을 찾는다. 읽기에 실패해도 화면은 깨지지 않고 오류만 알린다.

const SHEET_ID = "1FbKvACHDiyZWCR7YzZr9eG5yxR6yvyk3rxosI3TUkhA";
const GID = "1279422276"; // 「입장·참석 체크」 탭

export const ATTENDANCE_SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit#gid=${GID}`;

export type AttendanceScore = {
  presentation: number | null; // 발표 점수 (0~5), 발표 시간 미입력이면 null
  participation: number | null; // 참여도 점수 (0~5)
  absent: number | null; // 참여도 감점 (불참 횟수)
};

// 따옴표·쉼표·줄바꿈을 처리하는 최소 CSV 파서.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") field += ch;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const num = (raw: string | undefined): number | null => {
  const t = (raw ?? "").trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

export async function fetchAttendanceScores(): Promise<{
  byTeamNo: Map<number, AttendanceScore>;
  error: string | null;
}> {
  const byTeamNo = new Map<number, AttendanceScore>();
  try {
    const res = await fetch(
      `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`,
      { cache: "no-store", signal: AbortSignal.timeout(6000) }
    );
    if (!res.ok)
      return { byTeamNo, error: `시트를 읽지 못했습니다 (HTTP ${res.status}). 시트가 링크 공개인지 확인해 주세요.` };
    const rows = parseCsv(await res.text());

    const headerIdx = rows.findIndex((r) => r.some((c) => c.trim() === "조번호"));
    if (headerIdx < 0)
      return { byTeamNo, error: "시트에서 '조번호' 머리글을 찾지 못했습니다." };
    const header = rows[headerIdx].map((c) => c.replace(/\s+/g, ""));
    const col = (name: string) => header.findIndex((c) => c.startsWith(name));
    const cNo = col("조번호");
    const cPres = col("발표점수");
    const cPart = col("참여도점수");
    const cAbs = col("참여도감점");
    if (cPres < 0 || cPart < 0)
      return { byTeamNo, error: "시트에서 '발표 점수' 또는 '참여도 점수' 머리글을 찾지 못했습니다." };

    for (const r of rows.slice(headerIdx + 1)) {
      const m = /^(\d+)조$/.exec((r[cNo] ?? "").trim());
      if (!m) continue; // 팀원 행·구분 행은 조번호 칸이 비어 있다
      byTeamNo.set(Number(m[1]), {
        presentation: num(r[cPres]),
        participation: num(r[cPart]),
        absent: cAbs >= 0 ? num(r[cAbs]) : null,
      });
    }
    return { byTeamNo, error: null };
  } catch {
    return { byTeamNo, error: "시트를 읽지 못했습니다 (시간 초과 또는 네트워크 오류). 잠시 후 자동으로 다시 시도합니다." };
  }
}
