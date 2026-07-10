import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// 브라우저 탭 파비콘. 브랜드 네이비 라운드 사각형 + 블루 "H".
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default async function Icon() {
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
          background: "#0f1b2d",
          color: "#38bdf8",
          fontFamily: "Archivo",
          fontSize: 22,
          borderRadius: 7,
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
