import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#141a33",
        paper: "#f4f2ec",
        /* 브랜드 기본색: 짙은 네이비 */
        navy: {
          DEFAULT: "#1a2246",
          deep: "#111634",
          soft: "#2c3767",
        },
        /* 포인트색: 골드. ink 는 밝은 배경 위 텍스트용(대비 확보),
           bright 는 네이비 위에서 쓰는 밝은 금색. */
        gold: {
          DEFAULT: "#c8a02a",
          ink: "#87680f",
          bright: "#e3bc55",
          soft: "#f4ead1",
        },
        team: "#0f7b6f",
        admin: "#1d3b73",
        /* 주의를 끌어야 하는 수치(미납·보완 필요 등) */
        alert: "#a53a1c",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        /* 본문과 같은 서체를 쓰지만, 제목 자리를 표시해 두기 위해 별칭을 남긴다.
           나중에 제목만 다른 서체로 바꾸려면 여기만 고치면 된다. */
        title: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
