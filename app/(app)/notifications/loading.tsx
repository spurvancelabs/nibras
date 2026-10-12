import { ListSkeleton, Skeleton } from '@/components/Skeleton';

export default function NotificationsLoading() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>
      <ListSkeleton rows={6} />
    </div>
  );
}