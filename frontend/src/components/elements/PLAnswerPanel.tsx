import type { ReactNode } from "react";

interface Props {
  children?: ReactNode;
  show: boolean;
}

export default function PLAnswerPanel({ children, show }: Props) {
  if (!show) return null;
  return (
    <div className="mt-6 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 overflow-hidden">
      <div className="flex items-center gap-3 px-5 pt-4 pb-2">
        <div className="size-8 rounded-full flex items-center justify-center bg-green-100 text-green-600 text-sm shrink-0">
          &#x2713;
        </div>
        <p className="text-sm font-black uppercase tracking-wide text-green-800">
          Answer & Explanation
        </p>
      </div>
      <div className="px-5 pb-5 text-sm text-green-900/90 leading-relaxed break-words overflow-hidden [&_p]:mb-2 [&_ul]:pl-4 [&_ol]:pl-4 [&_li]:mb-1 [&_pre]:overflow-x-auto [&_pre]:bg-slate-900 [&_pre]:text-slate-100 [&_pre]:rounded-lg [&_pre]:p-4 [&_pre]:text-sm [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit [&_code]:bg-slate-200 [&_code]:text-slate-800 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono [&_code]:text-[0.9em]">
        {children}
      </div>
    </div>
  );
}
