/**
 * Shared HTML parsing utilities for PrairieLearn question HTML.
 * Used by both QuestionContent (left panel) and QuestionInputs (right panel).
 */

const INPUT_TAGS = new Set([
  "pl-string-input",
  "pl-number-input",
  "pl-integer-input",
  "pl-checkbox",
  "pl-multiple-choice",
  "pl-dropdown",
  "pl-matching",
  "pl-order-blocks",
  "pl-true-false",
]);

export interface ParsedAnswer {
  text: string;
  correct: boolean;
  ranking?: number; // for pl-order-blocks
}

export interface ParsedOption {
  name: string;
  text: string;
}

export interface ParsedStatement {
  text: string;
  match: string; // option name this statement matches
}

export interface ParsedInput {
  type: "string" | "number" | "integer" | "checkbox" | "multiple-choice"
    | "dropdown" | "matching" | "order-blocks" | "true-false";
  answersName: string;
  label?: string;
  answers?: ParsedAnswer[];       // for checkbox / multiple-choice / dropdown / order-blocks
  options?: ParsedOption[];       // for matching
  statements?: ParsedStatement[]; // for matching
  correctAnswer?: string;         // for true-false
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

    if (tag === "pl-integer-input") {
      inputs.push({
        type: "integer",
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

    if (tag === "pl-dropdown") {
      const answers = Array.from(node.querySelectorAll("pl-answer")).map((a) => ({
        text: a.textContent?.trim() ?? "",
        correct: a.getAttribute("correct") === "true",
      }));
      inputs.push({
        type: "dropdown",
        answersName: node.getAttribute("answers-name") ?? "answer",
        answers,
      });
      return;
    }

    if (tag === "pl-matching") {
      const options: ParsedOption[] = Array.from(node.querySelectorAll("pl-option")).map((o) => ({
        name: o.getAttribute("name") ?? "",
        text: o.textContent?.trim() ?? "",
      }));
      const statements: ParsedStatement[] = Array.from(node.querySelectorAll("pl-statement")).map((s) => ({
        text: s.textContent?.trim() ?? "",
        match: s.getAttribute("match") ?? "",
      }));
      inputs.push({
        type: "matching",
        answersName: node.getAttribute("answers-name") ?? "answer",
        options,
        statements,
      });
      return;
    }

    if (tag === "pl-order-blocks") {
      const answers = Array.from(node.querySelectorAll("pl-answer")).map((a) => ({
        text: a.textContent?.trim() ?? "",
        correct: a.getAttribute("correct") !== "false",
        ranking: a.getAttribute("ranking") ? parseInt(a.getAttribute("ranking")!, 10) : undefined,
      }));
      inputs.push({
        type: "order-blocks",
        answersName: node.getAttribute("answers-name") ?? "answer",
        answers,
      });
      return;
    }

    if (tag === "pl-true-false") {
      inputs.push({
        type: "true-false",
        answersName: node.getAttribute("answers-name") ?? "answer",
        correctAnswer: node.getAttribute("correct-answer") ?? "true",
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
