import { type ReactNode, useMemo } from "react";
import Markdown from "./elements/Markdown";
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

/**
 * Renders the read-only content of a PrairieLearn question (left panel).
 * Skips all input elements — those go in QuestionInputs (right panel).
 */
export default function QuestionContent({ html, showAnswer, showSubmission }: Props) {
  const parsed = useMemo(() => parseHtml(html), [html]);

  if (!parsed) return <div className="text-muted-foreground">No question content</div>;

  return <>{renderContentNode(parsed, showAnswer, showSubmission)}</>;
}

function renderContentNode(
  node: Node,
  showAnswer: boolean,
  showSubmission: boolean,
): ReactNode {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const el = node as Element;
  const tag = el.tagName.toLowerCase();

  // Skip input elements — they're rendered in the right panel
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
      return <PLSubmissionPanel show={showSubmission}>{children}</PLSubmissionPanel>;

    case "pl-code":
      return <PLCode language={el.getAttribute("language") ?? undefined}>{textContent}</PLCode>;

    case "pl-figure":
      return (
        <PLFigure
          src={el.getAttribute("file-name") ?? undefined}
          alt={el.getAttribute("alt") ?? undefined}
          width={el.getAttribute("width") ?? undefined}
        />
      );

    case "markdown":
      return <Markdown>{textContent}</Markdown>;

    default:
      if (SAFE_HTML_TAGS.has(tag)) {
        const Tag = tag as keyof React.JSX.IntrinsicElements;
        return <Tag>{children}</Tag>;
      }
      return <>{children}</>;
  }
}
