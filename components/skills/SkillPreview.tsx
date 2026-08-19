"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

/** SKILL 实时预览（复用聊天页的 markdown 管线） */
export default function SkillPreview({ content }: { content: string }) {
  return (
    <div className="prose-chat h-full overflow-y-auto px-5 py-4">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}