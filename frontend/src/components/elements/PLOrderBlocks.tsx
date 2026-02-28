import { useCallback } from "react";
import LatexText from "./LatexText";

interface OrderItem {
  text: string;
  id: number;
}

interface Props {
  answersName: string;
  /** All available blocks (correct + distractors), already shuffled by the parent */
  items: OrderItem[];
  /** Currently ordered selection (list of block texts) */
  selected: string[];
  onChange: (name: string, value: string[]) => void;
  disabled?: boolean;
}

export default function PLOrderBlocks({
  answersName,
  items,
  selected,
  onChange,
  disabled,
}: Props) {
  // Items in the "source" pool (not yet placed)
  const placed = new Set(selected);
  const available = items.filter((it) => !placed.has(it.text));

  const addItem = useCallback(
    (text: string) => {
      onChange(answersName, [...selected, text]);
    },
    [answersName, selected, onChange],
  );

  const removeItem = useCallback(
    (index: number) => {
      const next = [...selected];
      next.splice(index, 1);
      onChange(answersName, next);
    },
    [answersName, selected, onChange],
  );

  const moveUp = useCallback(
    (index: number) => {
      if (index === 0) return;
      const next = [...selected];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      onChange(answersName, next);
    },
    [answersName, selected, onChange],
  );

  const moveDown = useCallback(
    (index: number) => {
      if (index === selected.length - 1) return;
      const next = [...selected];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      onChange(answersName, next);
    },
    [answersName, selected, onChange],
  );

  return (
    <div className="space-y-4">
      {/* Answer zone */}
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-2">
          Your answer (drag or click to reorder):
        </p>
        <div className="space-y-1 min-h-[48px] rounded-lg border border-dashed p-2">
          {selected.length === 0 && (
            <p className="text-xs text-muted-foreground py-2 text-center">
              Click items below to add them here
            </p>
          )}
          {selected.map((text, i) => (
            <div
              key={`placed-${i}`}
              className="flex items-center gap-2 rounded-md border bg-primary/5 px-3 py-2 text-sm"
            >
              <span className="text-xs font-mono text-muted-foreground w-5">
                {i + 1}.
              </span>
              <span className="flex-1"><LatexText>{text}</LatexText></span>
              {!disabled && (
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => moveUp(i)}
                    disabled={i === 0}
                    className="px-1.5 py-0.5 rounded text-xs hover:bg-accent disabled:opacity-30"
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDown(i)}
                    disabled={i === selected.length - 1}
                    className="px-1.5 py-0.5 rounded text-xs hover:bg-accent disabled:opacity-30"
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    className="px-1.5 py-0.5 rounded text-xs hover:bg-destructive/20 text-destructive"
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Source pool */}
      {available.length > 0 && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">
            Available blocks:
          </p>
          <div className="flex flex-wrap gap-2">
            {available.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => addItem(item.text)}
                disabled={disabled}
                className="rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent hover:border-primary disabled:opacity-50"
              >
                <LatexText>{item.text}</LatexText>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
