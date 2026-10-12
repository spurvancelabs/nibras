type Props = {
  name: string;
  src?: string;
  size?: number;
  className?: string;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export default function Avatar({ name, src, size = 32, className = '' }: Props) {
  const dim = { width: size, height: size };

  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={name}
        style={dim}
        className={`rounded-full object-cover border border-border shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      style={dim}
      className={`rounded-full bg-primary text-primary-fg flex items-center justify-center text-xs font-medium shrink-0 ${className}`}
    >
      {initials(name)}
    </div>
  );
}