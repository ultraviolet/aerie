import ReactMarkdown from "react-markdown";

interface Props {
  children?: string;
}

export default function Markdown({ children }: Props) {
  return (
    <div className="space-y-3 text-sm leading-relaxed [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mb-1 [&_p]:leading-relaxed [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-1 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-xs [&_code]:font-mono [&_a]:text-primary [&_a]:underline">
      <ReactMarkdown>{children ?? ""}</ReactMarkdown>
    </div>
  );
}
