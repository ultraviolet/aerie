interface Props {
  src?: string;
  alt?: string;
  width?: string;
}

export default function PLFigure({ src, alt, width }: Props) {
  if (!src) return null;
  return (
    <figure className="my-4 text-center">
      <img src={src} alt={alt ?? ""} style={{ maxWidth: width ?? "100%" }} className="inline-block rounded" />
    </figure>
  );
}
