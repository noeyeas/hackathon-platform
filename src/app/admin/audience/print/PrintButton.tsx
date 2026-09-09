"use client";

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="btn-primary">
      인쇄하기
    </button>
  );
}
