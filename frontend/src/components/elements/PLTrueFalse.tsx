interface Props {
  answersName: string;
  selected: string;
  onChange: (name: string, value: string) => void;
  disabled?: boolean;
}

export default function PLTrueFalse({ answersName, selected, onChange, disabled }: Props) {
  return (
    <div className="space-y-2">
      {["True", "False"].map((option) => (
        <label
          key={option}
          className={`flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors hover:bg-accent ${
            selected === option ? "border-primary bg-primary/5" : ""
          }`}
        >
          <input
            type="radio"
            name={answersName}
            checked={selected === option}
            onChange={() => onChange(answersName, option)}
            disabled={disabled}
            className="h-4 w-4"
          />
          <span className="text-sm font-medium">{option}</span>
        </label>
      ))}
    </div>
  );
}
