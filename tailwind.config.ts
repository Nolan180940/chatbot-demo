import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./store/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 夜间控制台墨蓝
        ink: {
          950: "#0a0f1e",
          900: "#101728",
          850: "#161f35",
          800: "#1c2740",
        },
        panel: "#101728",
        panel2: "#161f35",
        line: "rgba(148, 163, 184, 0.14)",
        // 金色「钥匙」主强调
        gold: {
          DEFAULT: "#f0b429",
          soft: "#f5c34d",
          deep: "#d99a1b",
          dim: "rgba(240, 180, 41, 0.14)",
        },
        // 薄荷绿：在线/流式
        mint: {
          DEFAULT: "#2dd4bf",
          soft: "#5eead4",
        },
        dim: "#8b94a8",
      },
      fontFamily: {
        display: ["var(--font-space-grotesk)", "system-ui", "sans-serif"],
        sans: ["var(--font-plex-sans)", "system-ui", "-apple-system", "sans-serif"],
        mono: ["var(--font-plex-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        gold: "0 8px 24px -8px rgba(240, 180, 41, 0.4)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-in-out",
        "blink": "blink 1s step-end infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
