import type { ReactNode } from "react";

export default function PLQuestionPanel({ children }: { children?: ReactNode }) {
  return <div className="space-y-4">{children}</div>;
}
