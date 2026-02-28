import { useMemo } from "react";
import PLCheckbox from "./elements/PLCheckbox";
import PLMultipleChoice from "./elements/PLMultipleChoice";
import PLNumberInput from "./elements/PLNumberInput";
import PLStringInput from "./elements/PLStringInput";
import { extractInputs, parseHtml } from "./parseQuestionHtml";
import type { ParsedInput } from "./parseQuestionHtml";

interface Props {
  html: string;
  answers: Record<string, unknown>;
  onAnswerChange: (name: string, value: unknown) => void;
  disabled: boolean;
}

/**
 * Renders only the interactive input elements extracted from PrairieLearn HTML (right panel).
 */
export default function QuestionInputs({ html, answers, onAnswerChange, disabled }: Props) {
  const inputs = useMemo(() => {
    const root = parseHtml(html);
    return root ? extractInputs(root) : [];
  }, [html]);

  if (inputs.length === 0) {
    return <p className="text-sm text-muted-foreground">No input fields for this question.</p>;
  }

  return (
    <div className="space-y-5">
      {inputs.map((input, i) => (
        <div key={`${input.answersName}-${i}`}>
          {renderInput(input, answers, onAnswerChange, disabled)}
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
  }
}
