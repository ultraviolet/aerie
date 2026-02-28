/**
 * Shared HTML parsing utilities for PrairieLearn question HTML.
 * Used by both QuestionContent (left panel) and QuestionInputs (right panel).
 */

const INPUT_TAGS = new Set([
  "pl-string-input",
  "pl-number-input",
  "pl-checkbox",
  "pl-multiple-choice",
]);

export interface ParsedAnswer {
  text: string;
  correct: boolean;
}

export interface ParsedInput {
  type: "string" | "number" | "checkbox" | "multiple-choice";
  answersName: string;
  label?: string;
  answers?: ParsedAnswer[]; // for checkbox / multiple-choice
}

export function parseHtml(html: string): Element | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, "text/html");
  return doc.body.firstElementChild;
}

/** Returns true if a tag is an input element that belongs in the right panel */
export function isInputTag(tag: string): boolean {
  return INPUT_TAGS.has(tag);
}

/** Extract all input elements from the parsed HTML tree */
export function extractInputs(root: Element): ParsedInput[] {
  const inputs: ParsedInput[] = [];

  function walk(node: Element) {
    const tag = node.tagName.toLowerCase();

    if (tag === "pl-string-input") {
      inputs.push({
        type: "string",
        answersName: node.getAttribute("answers-name") ?? "answer",
        label: node.getAttribute("label") ?? undefined,
      });
      return;
    }

    if (tag === "pl-number-input") {
      inputs.push({
        type: "number",
        answersName: node.getAttribute("answers-name") ?? "answer",
        label: node.getAttribute("label") ?? undefined,
      });
      return;
    }

    if (tag === "pl-checkbox") {
      const answers = Array.from(node.querySelectorAll("pl-answer")).map((a) => ({
        text: a.textContent?.trim() ?? "",
        correct: a.getAttribute("correct") === "true",
      }));
      inputs.push({
        type: "checkbox",
        answersName: node.getAttribute("answers-name") ?? "answer",
        answers,
      });
      return;
    }

    if (tag === "pl-multiple-choice") {
      const answers = Array.from(node.querySelectorAll("pl-answer")).map((a) => ({
        text: a.textContent?.trim() ?? "",
        correct: a.getAttribute("correct") === "true",
      }));
      inputs.push({
        type: "multiple-choice",
        answersName: node.getAttribute("answers-name") ?? "answer",
        answers,
      });
      return;
    }

    // Recurse into children
    for (const child of Array.from(node.children)) {
      walk(child);
    }
  }

  walk(root);
  return inputs;
}

export const SAFE_HTML_TAGS = new Set([
  "div", "span", "p", "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li", "strong", "em", "b", "i", "br", "hr",
  "table", "thead", "tbody", "tr", "th", "td", "code", "pre",
  "blockquote", "img", "a", "sup", "sub",
]);
