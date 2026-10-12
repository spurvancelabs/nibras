import Link from 'next/link';

type Props = {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  icon?: React.ReactNode;
};

export default function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
  icon,
}: Props) {
  return (
    <div className="card text-center py-10 px-6 space-y-3">
      {icon && <div className="text-muted flex justify-center">{icon}</div>}
      <h3 className="font-medium">{title}</h3>
      {description && (
        <p className="text-sm text-muted max-w-md mx-auto">{description}</p>
      )}
      {actionHref && actionLabel && (
        <div className="pt-1">
          <Link href={actionHref} className="btn-primary">
            {actionLabel}
          </Link>
        </div>
      )}
    </div>
  );
}