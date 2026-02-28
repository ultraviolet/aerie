import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  children?: ReactNode;
  show: boolean;
}

export default function PLSubmissionPanel({ children, show }: Props) {
  if (!show) return null;
  return (
    <Card className="border-blue-200 bg-blue-50 mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-blue-800">Your Submission</CardTitle>
      </CardHeader>
      <CardContent className="text-blue-900">{children}</CardContent>
    </Card>
  );
}
