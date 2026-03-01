import { useCallback, useRef, useState } from "react";
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

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragSource, setDragSource] = useState<"placed" | "available" | null>(null);
  const dragText = useRef<string | null>(null);

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

  // --- Drag handlers for reordering placed items ---

  const handleDragStart = (index: number, text: string, source: "placed" | "available") => {
    setDragIndex(index);
    setDragSource(source);
    dragText.current = text;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDropOnPlaced = (targetIndex: number) => {
    droppedInZone.current = true;
    if (dragSource === "placed" && dragIndex !== null) {
      // Reorder within placed items
      const next = [...selected];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(targetIndex, 0, moved);
      onChange(answersName, next);
    } else if (dragSource === "available" && dragText.current) {
      // Add from available to specific position
      const next = [...selected];
      next.splice(targetIndex, 0, dragText.current);
      onChange(answersName, next);
    }
    resetDrag();
  };

  const handleDropOnZone = (e: React.DragEvent) => {
    e.preventDefault();
    droppedInZone.current = true;
    if (dragSource === "available" && dragText.current) {
      // Drop on empty zone or end of list
      if (dragOverIndex === null) {
        addItem(dragText.current);
      }
    }
    resetDrag();
  };

  const droppedInZone = useRef(false);

  const handleDragEndPlaced = () => {
    // If a placed item was dragged but NOT dropped inside the answer zone, remove it
    if (!droppedInZone.current && dragSource === "placed" && dragIndex !== null) {
      removeItem(dragIndex);
    }
    resetDrag();
  };

  const resetDrag = () => {
    setDragIndex(null);
    setDragOverIndex(null);
    setDragSource(null);
    dragText.current = null;
    droppedInZone.current = false;
  };

  return (
    <div className="space-y-4">
      {/* Answer zone */}
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-2">
          Your answer (drag or click to reorder):
        </p>
        <div
          className="space-y-1 min-h-[48px] rounded-lg border border-dashed p-2"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDropOnZone}
        >
          {selected.length === 0 && (
            <p className="text-xs text-muted-foreground py-2 text-center">
              Click or drag items below to add them here
            </p>
          )}
          {selected.map((text, i) => (
            <div
              key={`placed-${i}`}
              draggable={!disabled}
              onDragStart={() => handleDragStart(i, text, "placed")}
              onDragOver={(e) => handleDragOver(e, i)}
              onDragLeave={handleDragLeave}
              onDragEnd={handleDragEndPlaced}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDropOnPlaced(i);
              }}
              className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-all ${
                !disabled ? "cursor-grab active:cursor-grabbing" : ""
              } ${
                dragOverIndex === i && dragIndex !== i
                  ? "border-primary bg-primary/10 shadow-sm"
                  : "bg-primary/5"
              } ${
                dragIndex === i && dragSource === "placed" ? "opacity-40" : ""
              }`}
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
                draggable={!disabled}
                onDragStart={() => handleDragStart(item.id, item.text, "available")}
                onDragEnd={resetDrag}
                onClick={() => addItem(item.text)}
                disabled={disabled}
                className={`rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent hover:border-primary disabled:opacity-50 ${
                  !disabled ? "cursor-grab active:cursor-grabbing" : ""
                } ${
                  dragIndex === item.id && dragSource === "available" ? "opacity-40" : ""
                }`}
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
