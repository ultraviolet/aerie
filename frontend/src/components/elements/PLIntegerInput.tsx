import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  answersName: string;
  label?: string;
  value: string;
  onChange: (name: string, value: string) => void;
  disabled?: boolean;
}

export default function PLIntegerInput({ answersName, label, value, onChange, disabled }: Props) {
  return (
    <div className="space-y-2">
      {label && <Label htmlFor={answersName}>{label}</Label>}
      <Input
        id={answersName}
        type="number"
        value={value}
        onChange={(e) => onChange(answersName, e.target.value)}
        disabled={disabled}
        placeholder="Enter an integer"
        step="1"
        pattern="-?[0-9]*"
      />
    </div>
  );
}
