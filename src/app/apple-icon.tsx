import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// iOS "홈 화면에 추가" 아이콘. 파비콘과 동일 디자인의 큰 버전.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  const archivo = await readFile(
    join(process.cwd(), "src/app/fonts/ArchivoBlack.ttf")
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f1b2d 0%, #123049 70%, #8A1601 170%)",
          color: "#D64A2E",
          fontFamily: "Archivo",
          fontSize: 118,
        }}
      >
        H
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Archivo", data: archivo, weight: 400, style: "normal" }],
    }
  );
}
