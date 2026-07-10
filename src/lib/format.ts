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

// 일정 항목 표시용: 날짜 라벨(time_label)이 있으면 우선 사용,
// 없으면 starts_at 을 시:분까지 포맷 (관리자 UI 로 추가한 시간 단위 일정)
export function scheduleWhen(
  timeLabel: string | null | undefined,
  startsAt: string | null | undefined
): string {
  if (timeLabel && timeLabel.trim()) return timeLabel;
  if (startsAt) return formatDateTime(startsAt);
  return "—";
}

// KST 기준 "M.D" 라벨 (예: "9.18"). 홈 타임라인 노드 날짜 표시용.
export function formatMonthDay(iso: string): string {
  const ymd = new Date(iso).toLocaleDateString("en-CA", {
    timeZone: "Asia/Seoul",
  }); // "YYYY-MM-DD"
  const [, m, d] = ymd.split("-");
  return `${Number(m)}.${Number(d)}`;
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

// datetime-local input 값으로 변환 (YYYY-MM-DDTHH:mm)
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
