import { Checkbox } from "@/components/ui/checkbox";

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
      {answers.map((a, i) => (
        <label
          key={i}
          className="flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors hover:bg-accent"
        >
          <Checkbox
            checked={selected.includes(a.text)}
            onCheckedChange={() => toggle(a.text)}
            disabled={disabled}
          />
          <span className="text-sm">{a.text}</span>
        </label>
      ))}
    </div>
  );
}
