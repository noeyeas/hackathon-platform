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

  if (!loggedIn) {
    return (
      <Link href="/login" className="btn-primary">
        모집글 작성
      </Link>
    );
  }

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
              <h2 className="text-lg font-bold">
                {hasTeam ? "우리 팀 팀원 모집" : "팀 구해요 (개인)"}
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-[var(--muted)] hover:bg-gray-100 hover:text-ink"
                aria-label="닫기"
              >
                ✕
              </button>
            </div>

            <p className="mb-4 text-sm text-[var(--muted)]">
              {hasTeam
                ? "우리 팀에 합류할 팀원을 모집합니다."
                : "아직 팀이 없다면, 개인으로 팀을 구하는 글을 올릴 수 있어요."}
            </p>

            <ActionForm
              action={createRecruitPost}
              submitLabel="등록하기"
              successMessage="등록했습니다. 목록을 새로고침하세요."
            >
              <label className="label">제목 *</label>
              <input
                name="title"
                required
                className="input"
                placeholder={
                  hasTeam
                    ? "예: 프론트엔드 1명 구해요"
                    : "예: 백엔드 개발자입니다, 팀 구합니다"
                }
              />

              <label className="label mt-3">
                {hasTeam ? "필요한 역할" : "가능한 역할 / 기술"} (쉼표로 구분)
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
                  hasTeam
                    ? "어떤 프로젝트인지, 어떤 분을 찾는지"
                    : "본인 소개, 관심 주제 등"
                }
              />

              {!hasTeam && (
                <>
                  <label className="label mt-3">연락 방법</label>
                  <input
                    name="contact"
                    className="input"
                    placeholder="오픈카톡 링크 / 이메일 등"
                  />
                </>
              )}
            </ActionForm>
          </div>
        </div>
      )}
    </>
  );
}
