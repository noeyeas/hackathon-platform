"use client";

import Link from "next/link";
import { useState } from "react";
import { ActionForm } from "@/components/ActionForm";
import { createRecruitPost } from "./actions";

export function RecruitModal({
  loggedIn,
  hasTeam,
}: {
  loggedIn: boolean;
  hasTeam: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"team" | "individual">(
    hasTeam ? "team" : "individual"
  );

  if (!loggedIn) {
    return (
      <Link href="/login" className="btn-primary">
        모집글 작성
      </Link>
    );
  }

  const isTeam = kind === "team";

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary">
        모집글 작성
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">모집글 작성</h2>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-[var(--muted)] hover:bg-gray-100 hover:text-ink"
                aria-label="닫기"
              >
                ✕
              </button>
            </div>

            {/* 유형 선택 */}
            <div className="mb-4 flex gap-2">
              <KindButton
                active={isTeam}
                onClick={() => setKind("team")}
                label="🧑‍🤝‍🧑 팀원 구함"
              />
              <KindButton
                active={!isTeam}
                onClick={() => setKind("individual")}
                label="🙋 팀 구함"
              />
            </div>

            {isTeam && !hasTeam && (
              <p className="mb-3 rounded-lg bg-vote/10 px-3 py-2 text-sm text-vote">
                팀원 구함 글은 먼저{" "}
                <Link href="/team" className="font-semibold underline">
                  팀을 만든 뒤
                </Link>{" "}
                올릴 수 있어요.
              </p>
            )}

            <ActionForm
              action={createRecruitPost}
              submitLabel="등록하기"
              successMessage="등록했습니다. 목록을 새로고침하세요."
            >
              <input type="hidden" name="kind" value={kind} />

              <label className="label">제목 *</label>
              <input
                name="title"
                required
                className="input"
                placeholder={
                  isTeam
                    ? "예: 프론트엔드 1명 구해요"
                    : "예: 백엔드 개발자입니다, 팀 구합니다"
                }
              />

              <label className="label mt-3">
                {isTeam ? "필요한 역할" : "가능한 역할 / 기술"} (쉼표로 구분)
              </label>
              <input
                name="positions"
                className="input"
                placeholder="프론트엔드, 디자이너"
              />

              <label className="label mt-3">소개</label>
              <textarea
                name="body"
                rows={3}
                className="input"
                placeholder={
                  isTeam
                    ? "어떤 프로젝트인지, 어떤 분을 찾는지"
                    : "본인 소개, 관심 주제 등"
                }
              />

              <label className="label mt-3">연락 방법</label>
              <input
                name="contact"
                className="input"
                placeholder="오픈카톡 링크 / 이메일 등"
              />
              {isTeam && (
                <p className="mt-1 text-xs text-[var(--muted)]">
                  초대 코드 외에, 문의받을 연락처를 남겨두면 좋아요 (선택).
                </p>
              )}
            </ActionForm>
          </div>
        </div>
      )}
    </>
  );
}

function KindButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
        active
          ? "bg-vote text-white"
          : "border border-[var(--line)] bg-white text-[var(--muted)] hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}
