import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, XCircle } from "lucide-react";
import LatexText from "./LatexText";

interface PLAnswer {
  text: string;
  correct: boolean;
}

interface Props {
  answersName: string;
  answers: PLAnswer[];
  selected: string[];
  onChange: (name: string, value: string[]) => void;
  disabled?: boolean;
}

export default function PLCheckbox({ answersName, answers, selected, onChange, disabled }: Props) {
  const toggle = (text: string) => {
    const next = selected.includes(text)
      ? selected.filter((s) => s !== text)
      : [...selected, text];
    onChange(answersName, next);
  };

  return (
    <div className="space-y-2">
      {answers.map((a, i) => {
        const isSelected = selected.includes(a.text);
        const showResult = disabled;

        let borderClass = "";
        if (showResult) {
          if (a.correct) {
            borderClass = "border-green-300 bg-green-50/50";
          } else if (isSelected && !a.correct) {
            borderClass = "border-red-300 bg-red-50/50";
          }
        } else if (isSelected) {
          borderClass = "border-primary bg-primary/5";
        }

        return (
          <label
            key={i}
            className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
              disabled ? "cursor-default" : "cursor-pointer hover:bg-accent"
            } ${borderClass}`}
          >
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => toggle(a.text)}
              disabled={disabled}
            />
            <span className="text-sm flex-1"><LatexText>{a.text}</LatexText></span>
            {showResult && a.correct && (
              <CheckCircle2 className="size-4 text-green-500 shrink-0" />
            )}
            {showResult && isSelected && !a.correct && (
              <XCircle className="size-4 text-red-500 shrink-0" />
            )}
          </label>
        );
      })}
    </div>
  );
}
