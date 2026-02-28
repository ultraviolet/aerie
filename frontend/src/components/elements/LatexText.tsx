import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

/**
 * Renders a short text string with inline LaTeX support via KaTeX.
 * Used inside answer choices, matching statements, order blocks, etc.
 */
export default function LatexText({ children }: { children: string }) {
  // Fast path: skip markdown if no LaTeX delimiters present
  if (!children.includes("$") && !children.includes("\\(") && !children.includes("\\[")) {
    return <>{children}</>;
  }

  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        // Render inline — unwrap the <p> tag that ReactMarkdown adds
        p: ({ children }) => <span>{children}</span>,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
