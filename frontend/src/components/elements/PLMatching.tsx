import type { ParsedOption, ParsedStatement } from "../parseQuestionHtml";
import LatexText from "./LatexText";

interface Props {
  answersName: string;
  options: ParsedOption[];
  statements: ParsedStatement[];
  /** Record mapping statement index (as string) to selected option name */
  selected: Record<string, string>;
  onChange: (name: string, value: Record<string, string>) => void;
  disabled?: boolean;
}

export default function PLMatching({
  answersName,
  options,
  statements,
  selected,
  onChange,
  disabled,
}: Props) {
  const handleSelect = (stmtIndex: number, optionName: string) => {
    const next = { ...selected, [String(stmtIndex)]: optionName };
    onChange(answersName, next);
  };

  return (
    <div className="space-y-3">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="text-left pb-2 pr-4 font-medium text-muted-foreground">Statement</th>
            <th className="text-left pb-2 font-medium text-muted-foreground">Match</th>
          </tr>
        </thead>
        <tbody>
          {statements.map((stmt, i) => (
            <tr key={i} className="border-t">
              <td className="py-3 pr-4 align-top"><LatexText>{stmt.text}</LatexText></td>
              <td className="py-3 align-top">
                <select
                  value={selected[String(i)] ?? ""}
                  onChange={(e) => handleSelect(i, e.target.value)}
                  disabled={disabled}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm shadow-sm transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">-- select --</option>
                  {options.map((opt) => (
                    <option key={opt.name} value={opt.name}>
                      {opt.text}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
