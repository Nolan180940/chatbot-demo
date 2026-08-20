"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { yaml } from "@codemirror/lang-yaml";
import { EditorView, keymap } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { autocompletion, completionKeymap } from "@codemirror/autocomplete";
import { syntaxHighlighting, defaultHighlightStyle } from "@codemirror/language";
import { oneDark } from "@codemirror/theme-one-dark";

export interface CodeEditorHandle {
  jumpToLine: (line: number) => void;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
}

/** CodeMirror Markdown 编辑器：语法高亮 + 自动补全 + 撤销/重做 + 行跳转 */
const CodeEditor = forwardRef<CodeEditorHandle, Props>(function CodeEditor({ value, onChange }, ref) {
  const cmRef = useRef<ReactCodeMirrorRef>(null);
  const extensions = useMemo(
    () => [
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap, ...completionKeymap, indentWithTab]),
      autocompletion(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      markdown({ base: markdownLanguage }),
      EditorView.lineWrapping,
      EditorView.theme({
        "&": { height: "100%", fontSize: "13px" },
        ".cm-scroller": { fontFamily: "var(--font-plex-mono), ui-monospace, monospace" },
        ".cm-content": { padding: "12px 0" },
        ".cm-gutters": { backgroundColor: "transparent", border: "none" },
      }),
    ],
    [],
  );

  useEffect(() => {
    // 保存快捷键
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        // 触发父级保存：通过 blur 事件让父组件感知
        document.dispatchEvent(new CustomEvent("skill-save-request"));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useImperativeHandle(ref, () => ({
    jumpToLine: (line: number) => {
      const view = cmRef.current?.view;
      if (!view) return;
      const pos = view.state.doc.line(Math.max(1, line)).from;
      view.dispatch({ selection: { anchor: pos }, scrollIntoView: true });
      view.focus();
    },
  }));

  return (
    <CodeMirror
      ref={cmRef}
      value={value}
      onChange={onChange}
      extensions={extensions}
      theme={oneDark}
      height="100%"
      style={{ height: "100%", overflow: "hidden" }}
      basicSetup={{
        lineNumbers: true,
        foldGutter: true,
        highlightActiveLine: true,
        bracketMatching: true,
        closeBrackets: true,
      }}
    />
  );
});

export default CodeEditor;