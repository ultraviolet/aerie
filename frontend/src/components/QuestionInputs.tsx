import { useMemo, useRef } from "react";
import PLCheckbox from "./elements/PLCheckbox";
import PLDropdown from "./elements/PLDropdown";
import PLIntegerInput from "./elements/PLIntegerInput";
import PLMatching from "./elements/PLMatching";
import PLMultipleChoice from "./elements/PLMultipleChoice";
import PLNumberInput from "./elements/PLNumberInput";
import PLOrderBlocks from "./elements/PLOrderBlocks";
import PLStringInput from "./elements/PLStringInput";
import PLTrueFalse from "./elements/PLTrueFalse";
import PLCodeEditor from "./elements/PLCodeEditor";
import { extractInputs, parseHtml } from "./parseQuestionHtml";
import type { ParsedInput } from "./parseQuestionHtml";

interface Props {
  html: string;
  answers: Record<string, unknown>;
  onAnswerChange: (name: string, value: unknown) => void;
  disabled: boolean;
  params?: Record<string, unknown>;
}

/** Shuffle an array (Fisher-Yates) and return a new array. */
function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Renders only the interactive input elements extracted from PrairieLearn HTML (right panel).
 */
export default function QuestionInputs({ html, answers: rawAnswers, onAnswerChange, disabled, params }: Props) {
  const answers = rawAnswers ?? {};
  const inputs = useMemo(() => {
    const root = parseHtml(html);
    return root ? extractInputs(root) : [];
  }, [html]);

  // Stable shuffle for order-blocks items (computed once per html change)
  const shuffledItemsRef = useRef<Map<string, { text: string; id: number }[]>>(new Map());
  useMemo(() => {
    const newMap = new Map<string, { text: string; id: number }[]>();
    for (const input of inputs) {
      if (input.type === "order-blocks" && input.answers) {
        const allItems = input.answers.map((a, idx) => ({ text: a.text, id: idx }));
        newMap.set(input.answersName, shuffle(allItems));
      }
    }
    shuffledItemsRef.current = newMap;
  }, [inputs]);

  if (inputs.length === 0) {
    return <p className="text-sm text-muted-foreground">No input fields for this question.</p>;
  }

  return (
    <div className="space-y-5">
      {inputs.map((input, i) => (
        <div key={`${input.answersName}-${i}`}>
          {renderInput(input, answers, onAnswerChange, disabled, shuffledItemsRef.current, params)}
        </div>
      ))}
    </div>
  );
}

function renderInput(
  input: ParsedInput,
  answers: Record<string, unknown>,
  onAnswerChange: (name: string, value: unknown) => void,
  disabled: boolean,
  shuffledItems: Map<string, { text: string; id: number }[]>,
  params?: Record<string, unknown>,
) {
  switch (input.type) {
    case "string":
      return (
        <PLStringInput
          answersName={input.answersName}
          label={input.label}
          value={String(answers[input.answersName] ?? "")}
          onChange={(n, v) => onAnswerChange(n, v)}
          disabled={disabled}
        />
      );

    case "number":
      return (
        <PLNumberInput
          answersName={input.answersName}
          label={input.label}
          value={String(answers[input.answersName] ?? "")}
          onChange={(n, v) => onAnswerChange(n, v)}
          disabled={disabled}
        />
      );

    case "integer":
      return (
        <PLIntegerInput
          answersName={input.answersName}
          label={input.label}
          value={String(answers[input.answersName] ?? "")}
          onChange={(n, v) => onAnswerChange(n, v)}
          disabled={disabled}
        />
      );

    case "checkbox":
      return (
        <PLCheckbox
          answersName={input.answersName}
          answers={input.answers ?? []}
          selected={(answers[input.answersName] as string[]) ?? []}
          onChange={(n, v) => onAnswerChange(n, v)}
          disabled={disabled}
        />
      );

    case "multiple-choice":
      return (
        <PLMultipleChoice
          answersName={input.answersName}
          answers={input.answers ?? []}
          selected={String(answers[input.answersName] ?? "")}
          onChange={(n, v) => onAnswerChange(n, v)}
          disabled={disabled}
        />
      );

    case "dropdown":
      return (
        <PLDropdown
          answersName={input.answersName}
          answers={input.answers ?? []}
          selected={String(answers[input.answersName] ?? "")}
          onChange={(n, v) => onAnswerChange(n, v)}
          disabled={disabled}
        />
      );

    case "matching":
      return (
        <PLMatching
          answersName={input.answersName}
          options={input.options ?? []}
          statements={input.statements ?? []}
          selected={(answers[input.answersName] as Record<string, string>) ?? {}}
          onChange={(n, v) => onAnswerChange(n, v)}
          disabled={disabled}
        />
      );

    case "order-blocks": {
      const items = shuffledItems.get(input.answersName) ?? [];
      return (
        <PLOrderBlocks
          answersName={input.answersName}
          items={items}
          selected={(answers[input.answersName] as string[]) ?? []}
          onChange={(n, v) => onAnswerChange(n, v)}
          disabled={disabled}
        />
      );
    }

    case "true-false":
      return (
        <PLTrueFalse
          answersName={input.answersName}
          selected={String(answers[input.answersName] ?? "")}
          onChange={(n, v) => onAnswerChange(n, v)}
          disabled={disabled}
        />
      );

    case "code-editor": {
      const visibleTestCases = (params?.[`_code_visible_tests_${input.answersName}`] ?? []) as Array<{
        input: unknown[];
        expected: unknown;
        description?: string;
      }>;
      return (
        <PLCodeEditor
          answersName={input.answersName}
          language={input.language ?? "python"}
          fnName={input.fnName ?? ""}
          starterCode={input.starterCode ?? ""}
          value={String(answers[input.answersName] ?? "")}
          onChange={(n, v) => onAnswerChange(n, v)}
          disabled={disabled}
          visibleTestCases={visibleTestCases}
        />
      );
    }
  }
}
