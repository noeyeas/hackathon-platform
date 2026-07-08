"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

type Token = {
  id: string;
  token: string;
  label: string | null;
  votes_total: number;
  votes_used: number;
};

export function QRSheet({
  tokens,
  siteUrl,
}: {
  tokens: Token[];
  siteUrl: string;
}) {
  const [qrs, setQrs] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    async function render() {
      const entries: Record<string, string> = {};
      for (const t of tokens) {
        const url = `${siteUrl}/vote?token=${encodeURIComponent(t.token)}`;
        entries[t.id] = await QRCode.toDataURL(url, {
          width: 240,
          margin: 1,
        });
      }
      if (!cancelled) setQrs(entries);
    }
    render();
    return () => {
      cancelled = true;
    };
  }, [tokens, siteUrl]);

  if (!tokens.length) {
    return (
      <div className="card text-center text-[var(--muted)] print:hidden">
        아직 생성된 QR이 없습니다.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <p className="font-semibold">발급된 QR · {tokens.length}개</p>
        <button onClick={() => window.print()} className="btn-ghost">
          인쇄
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {tokens.map((t) => (
          <div
            key={t.id}
            className="flex flex-col items-center rounded-xl border border-[var(--line)] bg-white p-4 text-center"
          >
            {qrs[t.id] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrs[t.id]} alt={t.label ?? t.token} className="h-32 w-32" />
            ) : (
              <div className="h-32 w-32 animate-pulse rounded bg-gray-100" />
            )}
            <p className="mt-2 font-bold">{t.label}</p>
            <p className="text-xs text-[var(--muted)] print:hidden">
              {t.votes_total - t.votes_used}/{t.votes_total}표 남음
            </p>
            <p className="mt-1 text-[10px] text-[var(--muted)]">
              스캔 후 바로 투표하세요
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
