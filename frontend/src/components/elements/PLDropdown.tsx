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

export default function PLDropdown({ answersName, answers, selected, onChange, disabled }: Props) {
  return (
    <div className="space-y-2">
      <select
        id={answersName}
        value={selected}
        onChange={(e) => onChange(answersName, e.target.value)}
        disabled={disabled}
        className="w-full rounded-lg border bg-background px-4 py-3 text-sm shadow-sm transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="">-- select an answer --</option>
        {answers.map((a, i) => (
          <option key={i} value={a.text}>
            {a.text}
          </option>
        ))}
      </select>
    </div>
  );
}
