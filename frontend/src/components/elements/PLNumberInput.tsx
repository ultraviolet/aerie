import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  answersName: string;
  label?: string;
  value: string;
  onChange: (name: string, value: string) => void;
  disabled?: boolean;
}

export default function PLNumberInput({ answersName, label, value, onChange, disabled }: Props) {
  return (
    <div className="space-y-2">
      {label && <Label htmlFor={answersName}>{label}</Label>}
      <Input
        id={answersName}
        type="number"
        value={value}
        onChange={(e) => onChange(answersName, e.target.value)}
        disabled={disabled}
        placeholder="Enter a number"
        step="any"
      />
    </div>
  );
}
