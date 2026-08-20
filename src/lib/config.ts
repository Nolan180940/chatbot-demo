export const DEFAULT_CONFIG = {
  baseUrl: "https://api.openai.com",
  apiKey: "",
  model: "gpt-4o-mini",
};

export const DEFAULT_SESSION_TITLE = "新对话";

export const REQUEST_TIMEOUT_MS = 120_000;

/** 常用 base URL 快捷选项（便于测试自定义地址） */
export const PRESET_BASE_URLS = [
  { label: "OpenAI", value: "https://api.openai.com" },
  { label: "DeepSeek", value: "https://api.deepseek.com" },
  { label: "Moonshot (Kimi)", value: "https://api.moonshot.cn" },
  { label: "SiliconFlow", value: "https://api.siliconflow.cn" },
  { label: "Ollama (本地)", value: "http://localhost:11434" },
  { label: "OpenCode Go", value: "https://opencode.ai/zen/go" },
  { label: "OpenCode Zen", value: "https://opencode.ai/zen" },
];
