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
      <CardContent className="text-blue-900 [&_pre]:bg-slate-900 [&_pre]:text-slate-100 [&_pre]:rounded-lg [&_pre]:p-4 [&_pre]:text-sm [&_pre]:overflow-x-auto [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit [&_code]:bg-slate-200 [&_code]:text-slate-800 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono [&_code]:text-[0.9em]">{children}</CardContent>
    </Card>
  );
}
