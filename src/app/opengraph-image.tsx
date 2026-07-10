import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// 공유 미리보기용 OG 이미지 (1200×630). 카톡·페북·트위터 카드에 사용.
export const alt = "2026 월계동 해커톤 — 기술을 통해 월계동의 내일을 그리다";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const fontDir = join(process.cwd(), "src/app/fonts");
  const [archivo, pretendardBold, pretendardSemi] = await Promise.all([
    readFile(join(fontDir, "ArchivoBlack.ttf")),
    readFile(join(fontDir, "Pretendard-Bold.otf")),
    readFile(join(fontDir, "Pretendard-SemiBold.otf")),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background:
            "linear-gradient(135deg, #0f1b2d 0%, #123049 58%, #0284c7 165%)",
          color: "white",
          fontFamily: "Pretendard",
        }}
      >
        {/* 상단 아이브로 */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 44,
              height: 6,
              background: "#38bdf8",
              borderRadius: 999,
            }}
          />
          <div
            style={{
              fontSize: 30,
              fontWeight: 600,
              letterSpacing: 2,
              color: "#7dd3fc",
            }}
          >
            월계동 지역사회 해커톤
          </div>
        </div>

        {/* 메인 타이틀 */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontFamily: "Archivo",
              fontSize: 150,
              lineHeight: 1,
              letterSpacing: -4,
            }}
          >
            2026
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: "Archivo",
              fontSize: 96,
              lineHeight: 1.05,
              letterSpacing: -2,
              color: "#38bdf8",
            }}
          >
            HACKATHON
          </div>
        </div>

        {/* 하단 태그라인 + 정보 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", fontSize: 42, fontWeight: 700 }}>
            기술을 통해 월계동의 내일을 그리다
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 28,
              fontWeight: 600,
              color: "#94a3b8",
            }}
          >
            9.7 – 9.19 · 광운대학교 기념관 319호
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Archivo", data: archivo, weight: 400, style: "normal" },
        { name: "Pretendard", data: pretendardBold, weight: 700, style: "normal" },
        { name: "Pretendard", data: pretendardSemi, weight: 600, style: "normal" },
      ],
    }
  );
}
