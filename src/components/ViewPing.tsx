"use client";

import { useEffect, useRef } from "react";
import { pingView } from "@/app/gallery/actions";

// 작품 상세 진입 시 조회수 1회 증가. router.refresh() 로는 재실행되지 않도록
// (클라이언트 컴포넌트는 refresh 시 remount 되지 않음) 마운트당 한 번만 핑.
export function ViewPing({ projectId }: { projectId: string }) {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    void pingView(projectId);
  }, [projectId]);
  return null;
}
