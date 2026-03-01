import { type ReactNode, useMemo } from "react";
// Import math plugins (ensure these are installed via npm)
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css"; // Don't forget the CSS!

import PLAnswerPanel from "./elements/PLAnswerPanel";
import PLCode from "./elements/PLCode";
import PLFigure from "./elements/PLFigure";
import PLQuestionPanel from "./elements/PLQuestionPanel";
import PLSubmissionPanel from "./elements/PLSubmissionPanel";
import { isInputTag, parseHtml, SAFE_HTML_TAGS } from "./parseQuestionHtml";

interface Props {
  html: string;
  showAnswer: boolean;
  showSubmission: boolean;
}

export default function QuestionContent({
  html,
  showAnswer,
  showSubmission,
}: Props) {
  const parsed = useMemo(() => parseHtml(html), [html]);

  if (!parsed)
    return <div className="text-muted-foreground">No question content</div>;

  return (
    <div className="prose prose-slate max-w-none dark:prose-invert break-words overflow-hidden [&_pre]:overflow-auto [&_pre]:max-h-[400px] [&_.katex-display]:overflow-x-auto [&_table]:overflow-x-auto [&_code]:before:content-none [&_code]:after:content-none [&_code]:bg-slate-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-slate-800 [&_code]:font-mono [&_code]:text-[0.9em]">
      {renderContentNode(parsed, showAnswer, showSubmission)}
    </div>
  );
}

/** Inline markdown renderer — converts backticks/LaTeX without adding block-level <p> wrappers. */
function InlineMarkdown({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{ p: ({ children }) => <>{children}</> }}
    >
      {text}
    </ReactMarkdown>
  );
}

function renderContentNode(
  node: Node,
  showAnswer: boolean,
  showSubmission: boolean,
): ReactNode {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? "";
    if (!text.trim()) return text;
    return <InlineMarkdown text={text} />;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const el = node as Element;
  const tag = el.tagName.toLowerCase();

  if (isInputTag(tag)) {
    // In HTML mode, self-closing custom elements (e.g. <pl-true-false />)
    // are parsed as open tags, swallowing subsequent siblings like
    // <pl-answer-panel>. Rescue any panel elements trapped inside.
    const panels: ReactNode[] = [];
    let panelIdx = 0;
    function rescuePanels(n: Node) {
      if (n.nodeType === Node.ELEMENT_NODE) {
        const t = (n as Element).tagName.toLowerCase();
        if (t === "pl-answer-panel" || t === "pl-submission-panel") {
          panels.push(
            <span key={panelIdx++}>
              {renderContentNode(n, showAnswer, showSubmission)}
            </span>,
          );
          return;
        }
      }
      n.childNodes.forEach(rescuePanels);
    }
    rescuePanels(el);
    return panels.length > 0 ? <>{panels}</> : null;
  }

  const children = Array.from(el.childNodes).map((child, i) => (
    <span key={i}>{renderContentNode(child, showAnswer, showSubmission)}</span>
  ));

  const textContent = el.textContent?.trim() ?? "";

  switch (tag) {
    case "pl-question-panel":
      return <PLQuestionPanel>{children}</PLQuestionPanel>;

    case "pl-answer-panel":
      return <PLAnswerPanel show={showAnswer}>{children}</PLAnswerPanel>;

    case "pl-submission-panel":
      return (
        <PLSubmissionPanel show={showSubmission}>{children}</PLSubmissionPanel>
      );

    case "pl-code":
      return (
        <PLCode language={el.getAttribute("language") ?? undefined}>
          {textContent}
        </PLCode>
      );

    case "pl-figure":
      return (
        <PLFigure
          src={el.getAttribute("file-name") ?? undefined}
          alt={el.getAttribute("alt") ?? undefined}
          width={el.getAttribute("width") ?? undefined}
        />
      );

    case "markdown":
      return (
        <ReactMarkdown
          remarkPlugins={[remarkMath]}
          rehypePlugins={[rehypeKatex]}
        >
          {textContent}
        </ReactMarkdown>
      );

    // Render code/pre with raw text — don't recurse through markdown
    case "code":
      return <code>{textContent}</code>;
    case "pre":
      return <pre>{textContent}</pre>;

    default:
      if (SAFE_HTML_TAGS.has(tag)) {
        const Tag = tag as keyof React.JSX.IntrinsicElements;
        // @ts-ignore - dynamic tag
        return <Tag>{children}</Tag>;
      }
      return <>{children}</>;
  }
}
