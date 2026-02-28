import { Input } from "@/components/ui/input";
import MathLabel from "./MathLabel";

interface Props {
  answersName: string;
  label?: string;
  value: string;
  onChange: (name: string, value: string) => void;
  disabled?: boolean;
}

export default function PLNumberInput({ answersName, label, value, onChange, disabled }: Props) {
  return (
    <div className="flex items-center gap-2">
      {label && <MathLabel text={label} />}
      <Input
        id={answersName}
        type="number"
        value={value}
        onChange={(e) => onChange(answersName, e.target.value)}
        disabled={disabled}
        placeholder="Enter a number"
        step="any"
        className="max-w-48"
      />
    </div>
  );
}
