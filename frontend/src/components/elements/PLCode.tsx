interface Props {
  language?: string;
  children?: string;
}

export default function PLCode({ children }: Props) {
  return (
    <pre className="rounded-lg bg-slate-900 p-4 text-slate-100 overflow-auto max-h-[400px] font-mono text-sm leading-relaxed">
      <code>{children}</code>
    </pre>
  );
}
