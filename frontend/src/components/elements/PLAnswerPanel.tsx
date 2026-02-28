import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  children?: ReactNode;
  show: boolean;
}

export default function PLAnswerPanel({ children, show }: Props) {
  if (!show) return null;
  return (
    <Card className="border-green-200 bg-green-50 mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-green-800">Answer & Explanation</CardTitle>
      </CardHeader>
      <CardContent className="text-green-900">{children}</CardContent>
    </Card>
  );
}
