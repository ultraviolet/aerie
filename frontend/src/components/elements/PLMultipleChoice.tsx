import LatexText from "./LatexText";

interface PLAnswer {
  text: string;
  correct: boolean;
}

interface Props {
  answersName: string;
  answers: PLAnswer[];
  selected: string;
  onChange: (name: string, value: string) => void;
  disabled?: boolean;
}

export default function PLMultipleChoice({ answersName, answers, selected, onChange, disabled }: Props) {
  return (
    <div className="space-y-2">
      {answers.map((a, i) => (
        <label
          key={i}
          className={`flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors hover:bg-accent ${
            selected === a.text ? "border-primary bg-primary/5" : ""
          }`}
        >
          <input
            type="radio"
            name={answersName}
            checked={selected === a.text}
            onChange={() => onChange(answersName, a.text)}
            disabled={disabled}
            className="h-4 w-4"
          />
          <span className="text-sm"><LatexText>{a.text}</LatexText></span>
        </label>
      ))}
    </div>
  );
}
