// 일정/마일스톤 표시용 날짜 포맷 (예: "7월 12일 (토) 오후 2:00")
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
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

// 캘린더 날짜 기준 D-day 숫자 (같은 날=0=D-DAY, 내일=1=D-1, 어제=-1).
// 시간 차(ms)를 ceil 하면 당일 오전에도 D-1 로 보이는 오프바이원이 생기므로
// 양쪽을 자정으로 내려 '며칠 남았는지'를 날짜 단위로 센다.
export function ddayCount(targetIso: string, nowMs: number): number {
  const t = new Date(targetIso);
  const n = new Date(nowMs);
  const tMid = new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime();
  const nMid = new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime();
  return Math.round((tMid - nMid) / 86400000);
}

// datetime-local input 값으로 변환 (YYYY-MM-DDTHH:mm)
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
