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
    <div className="prose prose-slate max-w-none dark:prose-invert">
      {renderContentNode(parsed, showAnswer, showSubmission)}
    </div>
  );
}

function renderContentNode(
  node: Node,
  showAnswer: boolean,
  showSubmission: boolean,
): ReactNode {
  // --- FIX 1: Wrap plain text in Markdown to catch inline LaTeX ---
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? "";
    if (!text.trim()) return text;

    return (
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
        {text}
      </ReactMarkdown>
    );
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const el = node as Element;
  const tag = el.tagName.toLowerCase();

  if (isInputTag(tag)) return null;

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

    // --- FIX 2: Ensure the <markdown> tag also supports math ---
    case "markdown":
      return (
        <ReactMarkdown
          remarkPlugins={[remarkMath]}
          rehypePlugins={[rehypeKatex]}
        >
          {textContent}
        </ReactMarkdown>
      );

    default:
      if (SAFE_HTML_TAGS.has(tag)) {
        const Tag = tag as keyof React.JSX.IntrinsicElements;
        // @ts-ignore - dynamic tag
        return <Tag>{children}</Tag>;
      }
      return <>{children}</>;
  }
}
