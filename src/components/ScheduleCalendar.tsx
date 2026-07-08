"use client";

// 일정이 있는 달들을 미니 달력으로 보여주고, 일정 있는 날/기간을 표시.
// 날짜에 마우스를 올리면 대응하는 일정 id 를 onHover 로 알려 목록을 하이라이트.
// 한국시간(Asia/Seoul) 기준으로 날짜 계산.

type Item = {
  id: string;
  starts_at: string | null;
  ends_at?: string | null;
  title: string;
};

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

function seoulYMD(d: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  return { y: get("year"), m: get("month"), d: get("day") };
}

type DayInfo = {
  titles: string[];
  id?: string; // 대응하는 일정 (하이라이트 연동용)
  single?: boolean;
  rangeStart?: boolean;
  rangeMid?: boolean;
  rangeEnd?: boolean;
};

function Month({
  y,
  m,
  days,
  today,
  activeId,
  onHover,
}: {
  y: number;
  m: number; // 1~12
  days: Map<number, DayInfo>;
  today: { y: number; m: number; d: number };
  activeId: string | null;
  onHover: (id: string | null) => void;
}) {
  const firstWeekday = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div>
      <p className="mb-2 text-center text-sm font-bold">
        {y}년 {m}월
      </p>
      <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
        {WEEK.map((w, i) => (
          <span
            key={w}
            className={`py-1 font-semibold ${
              i === 0
                ? "text-red-400"
                : i === 6
                  ? "text-blue-400"
                  : "text-[var(--muted)]"
            }`}
          >
            {w}
          </span>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <span key={`b${i}`} />;
          const info = days.get(d);
          const isToday = today.y === y && today.m === m && today.d === d;
          const isActive = !!info?.id && info.id === activeId;

          let cls = "text-ink";
          if (info?.single) {
            cls = "bg-vote font-bold text-white rounded-full";
          } else if (info?.rangeStart || info?.rangeEnd) {
            cls = `bg-vote font-bold text-white ${
              info.rangeStart ? "rounded-l-full" : ""
            } ${info.rangeEnd ? "rounded-r-full" : ""}`;
          } else if (info?.rangeMid) {
            cls = "bg-vote/20 text-ink";
          } else if (isToday) {
            cls = "font-bold text-vote ring-1 ring-vote rounded-full";
          }

          return (
            <div
              key={d}
              title={info?.titles.length ? info.titles.join(", ") : undefined}
              onMouseEnter={info?.id ? () => onHover(info.id!) : undefined}
              onMouseLeave={info?.id ? () => onHover(null) : undefined}
              className={`flex aspect-square items-center justify-center text-sm transition ${cls} ${
                info?.id ? "cursor-pointer" : ""
              } ${isActive ? "ring-2 ring-vote ring-offset-1 scale-105" : ""}`}
            >
              {d}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ScheduleCalendar({
  items,
  activeId,
  onHover,
}: {
  items: Item[];
  activeId: string | null;
  onHover: (id: string | null) => void;
}) {
  const dated = items.filter((it) => it.starts_at);
  if (!dated.length) return null;

  const months = new Map<
    string,
    { y: number; m: number; days: Map<number, DayInfo> }
  >();
  const ensureDay = (y: number, m: number, d: number) => {
    const key = `${y}-${m}`;
    if (!months.has(key)) months.set(key, { y, m, days: new Map() });
    const days = months.get(key)!.days;
    if (!days.has(d)) days.set(d, { titles: [] });
    return days.get(d)!;
  };

  const ranges: { id: string; title: string; label: string }[] = [];

  for (const it of dated) {
    const s = seoulYMD(new Date(it.starts_at!));
    const e = it.ends_at ? seoulYMD(new Date(it.ends_at)) : null;
    const isRange = !!e && (e.y !== s.y || e.m !== s.m || e.d !== s.d);

    if (!isRange) {
      const info = ensureDay(s.y, s.m, s.d);
      info.single = true;
      info.id = it.id;
      info.titles.push(it.title);
      continue;
    }

    const startMs = Date.UTC(s.y, s.m - 1, s.d, 3);
    const endMs = Date.UTC(e!.y, e!.m - 1, e!.d, 3);
    for (let cur = startMs; cur <= endMs; cur += 86400000) {
      const { y, m, d } = seoulYMD(new Date(cur));
      const info = ensureDay(y, m, d);
      info.id = it.id;
      info.titles.push(it.title);
      if (cur === startMs) info.rangeStart = true;
      else if (cur === endMs) info.rangeEnd = true;
      else info.rangeMid = true;
    }
    ranges.push({
      id: it.id,
      title: it.title,
      label: `${s.m}월 ${s.d}일 ~ ${e!.m}월 ${e!.d}일`,
    });
  }

  const sorted = [...months.values()].sort((a, b) => a.y - b.y || a.m - b.m);
  const today = seoulYMD(new Date());

  return (
    <div className="card flex flex-col gap-6">
      {sorted.map((mo) => (
        <Month
          key={`${mo.y}-${mo.m}`}
          y={mo.y}
          m={mo.m}
          days={mo.days}
          today={today}
          activeId={activeId}
          onHover={onHover}
        />
      ))}

      <div className="flex flex-col gap-2 border-t border-[var(--line)] pt-3 text-xs text-[var(--muted)]">
        {ranges.map((r) => (
          <div
            key={r.id}
            onMouseEnter={() => onHover(r.id)}
            onMouseLeave={() => onHover(null)}
            className={`flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 ${
              activeId === r.id ? "bg-vote/10" : ""
            }`}
          >
            <span className="inline-block h-2.5 w-6 rounded-full bg-vote/70" />
            <span>
              <b className="text-ink">{r.title}</b> · {r.label}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-2 px-1">
          <span className="inline-block h-3 w-3 rounded-full bg-vote" />
          일정 있는 날
        </div>
      </div>
    </div>
  );
}
