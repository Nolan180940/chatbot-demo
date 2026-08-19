// 验证 normalizeLatex 修复：各输入形态能否被 remark-math 正确解析
// 注意：remark-math 行内公式生成 inlineMath 节点，块级生成 math 节点，都要统计
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkMath from "remark-math";
import { visit } from "unist-util-visit";

// 与 components/chat/MessageItem.tsx 中 normalizeLatex 完全一致
function normalizeLatex(md) {
  let out = md;
  out = out.replace(/\\\[([\s\S]+?)\\\]/g, (_m, inner) => {
    const v = inner.replace(/\n{2,}/g, "\n").trim();
    return v ? `\n\n$$\n${v}\n$$\n\n` : _m;
  });
  out = out.replace(/\\\(([\s\S]+?)\\\)/g, (_m, inner) => {
    const v = inner.replace(/\s+/g, " ").trim();
    return v ? `$${v}$` : _m;
  });
  out = out.replace(/\$\$([\s\S]+?)\$\$/g, (_m, inner) => {
    const v = inner.replace(/\n{2,}/g, "\n").trim();
    return v ? `\n\n$$\n${v}\n$$\n\n` : _m;
  });
  const dollarCount = (out.match(/\$\$/g) ?? []).length;
  if (dollarCount % 2 === 1) {
    const lastIdx = out.lastIndexOf("$$");
    if (lastIdx !== -1) {
      let rest = out.slice(lastIdx + 2).replace(/\n{2,}/g, "\n").trim();
      const tailMatch = rest.match(/([\u4e00-\u9fff\uff00-\uffef\u3000-\u303f].*)$/s);
      const tail = tailMatch?.[1] ?? "";
      if (tail) rest = rest.slice(0, rest.length - tail.length).trim();
      if (rest) out = `${out.slice(0, lastIdx)}\n\n$$\n${rest}\n$$\n\n${tail}`;
    }
  }
  return out;
}

function test(name, input, expectMath = true) {
  const out = normalizeLatex(input);
  const tree = unified().use(remarkParse).use(remarkMath).parse(out);
  const mathNodes = [];
  const inlineNodes = [];
  const texts = [];
  visit(tree, (n) => {
    if (n.type === "math") mathNodes.push(n.value);
    if (n.type === "inlineMath") inlineNodes.push(n.value);
    if (n.type === "text") texts.push(n.value);
  });
  const hasMath = mathNodes.length > 0 || inlineNodes.length > 0;
  const leaked = texts.some(
    (t) => t.includes("int_0^1") || t.includes("E=mc") || t.includes("$"),
  );
  const ok = expectMath ? hasMath && !leaked : !hasMath && !leaked;
  console.log(
    `${ok ? "✓" : "✗"} ${name}  (块级: ${mathNodes.length} 行内: ${inlineNodes.length})`,
  );
  if (!ok) {
    console.log("  math:", JSON.stringify(mathNodes).slice(0, 120));
    console.log("  inline:", JSON.stringify(inlineNodes).slice(0, 120));
    console.log("  text:", JSON.stringify(texts).slice(0, 120));
  }
  return ok;
}

let pass = 0;
let fail = 0;
const results = [
  test("\\[...\\] 行间公式", "和行间公式 \\[\\int_0^1 x^2 dx = \\frac{1}{3}\\]"),
  test("\\[...\\] 与 \\(...\\) 混合", "公式 \\(E=mc^2\\) 和行间 \\[\\int_0^1 x^2 dx\\]"),
  test("$$...$$ 单行写法", "行间公式 $$\\int_0^1 x^2 dx = \\frac{1}{3}$$"),
  test("$$ 未闭合（漏写结尾）", "行间公式 $$\\int_0^1 x^2 dx = \\frac{1}{3}"),
  test("$$ 未闭合 + 中文尾随", "修复验证：$$ \\lim_{x\\to 0}\\frac{\\sin x}{x}=1 未闭合结尾"),
  test("成对 + 未闭合混合", "公式 $$\\int_0^1 x^2 dx$$ 以及未闭合的 $$\\lim_{x\\to 0}\\frac{\\sin x}{x}=1"),
  test("行内 \\(...\\)", "行内公式 \\(E=mc^2\\) 很漂亮"),
  test("行内 $...$ 原生写法", "行内公式 $E=mc^2$ 很漂亮"),
  test("纯文本无公式（回归）", "今天天气不错，价格是 5 美元", false),
];
for (const r of results) r ? pass++ : fail++;
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);