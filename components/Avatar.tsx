// =============================================================================
// FILE: components/Avatar.tsx
// User avatar: photo if `src` is given, otherwise initials on the primary colour.
// =============================================================================

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
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        style={dim}
        className={`rounded-full object-cover ring-2 ring-surface shadow-sm shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      style={{ ...dim, fontSize: Math.max(10, Math.round(size * 0.38)) }}
      aria-label={name}
      className={`rounded-full bg-primary text-primary-fg flex items-center justify-center font-semibold tracking-wide ring-2 ring-hero shrink-0 select-none ${className}`}
    >
      {initials(name) || '?'}
    </div>
  );
}