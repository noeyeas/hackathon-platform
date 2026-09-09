// 일정/마일스톤 표시용 날짜 포맷 (예: "7월 12일 (토) 오후 2:00")
// 오프라인 한국 행사이므로 뷰어 지역과 무관하게 항상 KST 로 표기.
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

// KST 기준 "M.D" 라벨 (예: "9.18"). 홈 타임라인 노드 날짜 표시용.
export function formatMonthDay(iso: string): string {
  const ymd = new Date(iso).toLocaleDateString("en-CA", {
    timeZone: "Asia/Seoul",
  }); // "YYYY-MM-DD"
  const [, m, d] = ymd.split("-");
  return `${Number(m)}.${Number(d)}`;
}

// 기간 라벨 (예: "9.18~19", 달을 넘기면 "9.30~10.1").
// ends_at 이 없거나 시작일과 같은 날이면 단일 날짜로 표시한다.
export function formatMonthDayRange(
  startIso: string,
  endIso: string | null | undefined
): string {
  const start = formatMonthDay(startIso);
  if (!endIso) return start;
  const end = formatMonthDay(endIso);
  if (end === start) return start;
  const [startMonth] = start.split(".");
  const [endMonth, endDay] = end.split(".");
  return startMonth === endMonth ? `${start}~${endDay}` : `${start}~${end}`;
}

// 캘린더 날짜 기준 D-day 숫자 (같은 날=0=D-DAY, 내일=1=D-1, 어제=-1).
// 시간 차(ms)를 ceil 하면 당일 오전에도 D-1 로 보이는 오프바이원이 생기므로
// 양쪽을 '자정'으로 내려 날짜 단위로 센다. 뷰어 지역과 무관하게 KST 기준
// 달력 날짜를 써서 모든 참가자가 같은 D-day 를 본다.
export function ddayCount(targetIso: string, nowMs: number): number {
  // en-CA 로케일은 "YYYY-MM-DD" 를 주므로 KST 달력 날짜를 안정적으로 얻는다.
  const kstMidnight = (d: Date) =>
    Date.parse(
      d.toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" }) + "T00:00:00Z"
    );
  return Math.round(
    (kstMidnight(new Date(targetIso)) - kstMidnight(new Date(nowMs))) / 86400000
  );
}

// href 안전 가드 — http/https 만 통과, 그 외(javascript:, data: 등)는 무력화.
// 저장 시 검증을 우회한 과거 데이터에 대한 렌더 측 방어.
export function safeUrl(url: string | null | undefined): string {
  return url && /^https?:\/\//i.test(url) ? url : "#";
}

// datetime-local input 값으로 변환 (YYYY-MM-DDTHH:mm) — 항상 KST 벽시계.
//
// getFullYear/getHours 로 만들면 "코드가 도는 곳의 시간대"가 된다. 브라우저는
// KST 지만 Vercel 서버는 UTC 라, 같은 값이 SSR 에서 9시간 다르게 찍히고
// (하이드레이션 불일치) 저장 왕복마다 시각이 밀린다. 표시(formatDateTime)가
// KST 고정이므로 입력도 KST 고정으로 맞춘다.
export function toKstInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const at = (type: string) =>
    parts.find((x) => x.type === type)?.value ?? "00";
  return `${at("year")}-${at("month")}-${at("day")}T${at("hour")}:${at("minute")}`;
}

// datetime-local 값(시간대 없는 벽시계 문자열)을 KST 로 읽어 ISO 로 바꾼다.
//
// new Date("2026-10-08T14:00") 은 시간대가 없으면 런타임 로컬로 해석된다 —
// UTC 서버에서는 14:00Z(=23:00 KST)가 되어 운영진이 넣은 시각과 달라진다.
// KST 는 DST 가 없으므로 오프셋을 +09:00 으로 붙여 못박는다.
// 형식이 어긋나면 null — 호출부가 저장을 막고 사용자에게 알린다.
export function kstInputToIso(input: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(input.trim());
  if (!m) return null;
  const ms = Date.parse(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00+09:00`);
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}

// 요일까지 붙인 기간 라벨 (예: "10.8(목) – 10.9(금)", 하루면 "9.16(수)").
// 홈 포스터 섹션의 '한눈에 보기'처럼 사람이 달력에 옮겨 적는 목록용 —
// 타임라인 노드의 짧은 라벨(formatMonthDayRange)과 달리 요일이 필요하다.
export function formatMonthDayWeekday(iso: string): string {
  const d = new Date(iso);
  const weekday = d.toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
    weekday: "short",
  });
  return `${formatMonthDay(iso)}(${weekday})`;
}

export function formatMonthDayWeekdayRange(
  startIso: string,
  endIso: string | null | undefined
): string {
  const start = formatMonthDayWeekday(startIso);
  if (!endIso) return start;
  const end = formatMonthDayWeekday(endIso);
  return end === start ? start : `${start} – ${end}`;
}
