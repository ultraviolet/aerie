import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

/** Renders a label that may contain LaTeX (e.g. "$y =$") using KaTeX. */
export default function MathLabel({ text }: { text: string }) {
  return (
    <span className="text-sm font-medium leading-none whitespace-nowrap shrink-0">
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{ p: ({ children }) => <>{children}</> }}
      >
        {text}
      </ReactMarkdown>
    </span>
  );
}
